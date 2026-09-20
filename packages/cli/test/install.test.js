import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { test } from "node:test";
import install, { resolvePluginName } from "../bin/cmd/install.js";
import { resolveNpmCli, runNpm } from "../bin/npm.js";

function fixture(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kiri install & test "));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	return dir;
}

function mockInstall(t, version = "1.2.3") {
	const requests = [];
	const calls = [];
	t.mock.method(globalThis, "fetch", async (url) => {
		requests.push(url);
		return { ok: version !== null, json: async () => ({ version }) };
	});
	const original = childProcess.execFileSync;
	t.mock.method(childProcess, "execFileSync", (...args) => calls.push(args));
	syncBuiltinESMExports();
	t.after(() => {
		childProcess.execFileSync = original;
		syncBuiltinESMExports();
	});
	return { requests, calls };
}

test("rejects unsafe names before registry access or installation, including a mixed batch", async (t) => {
	const { requests, calls } = mockInstall(t);
	for (const input of [
		"@kirigami/plugin-x;echo injected", "kirigami-plugin-x&echo", "kirigami-plugin-x|echo",
		"kirigami-plugin-$(echo)", "kirigami-plugin-`echo`", 'kirigami-plugin-"x"',
		"kirigami-plugin-x>file", "kirigami-plugin-x%PATH%", "kirigami-plugin-x!PATH!",
		"kirigami-plugin-x\n", "kirigami-plugin-x\r", "kirigami-plugin-x\0",
		"../kirigami-plugin-x", "C:\\kirigami-plugin-x", "file:kirigami-plugin-x",
		"https://example.com/kirigami-plugin-x", "user/kirigami-plugin-x",
		"@scope/other", "@scope/kirigami-plugin-x@1.0.0", "highlight@latest",
		"--ignore-scripts", "-x", "Uppercase", "a".repeat(215),
	]) {
		await assert.rejects(install(["highlight", input]), /Invalid plugin name/, input);
	}
	assert.deepEqual(requests, []);
	assert.deepEqual(calls, []);
});

test("resolves shorthand and supported registry names", async (t) => {
	const { requests } = mockInstall(t);
	for (const input of ["highlight", "plugin-highlight", "@kirigami/plugin-highlight"]) {
		assert.deepEqual(await resolvePluginName(input), { name: "@kirigami/plugin-highlight", latest: "1.2.3" });
	}
	for (const input of ["kirigami-plugin-example", "@example/kirigami-plugin-example.v2_test"]) {
		assert.deepEqual(await resolvePluginName(input), { name: input, latest: "1.2.3" });
	}
	assert.equal(requests.length, 5);
});

test("tries the unscoped shorthand candidate after the official name is absent", async (t) => {
	t.mock.method(globalThis, "fetch", async (url) => ({
		ok: !url.includes("@kirigami"), json: async () => ({ version: "2.0.0-beta.1+build.2" }),
	}));
	assert.deepEqual(await resolvePluginName("example"), {
		name: "kirigami-plugin-example", latest: "2.0.0-beta.1+build.2",
	});
});

test("offline full names remain usable, but guessed names are not installed", async (t) => {
	const { calls } = mockInstall(t, null);
	assert.deepEqual(await resolvePluginName("@private/kirigami-plugin-example"), {
		name: "@private/kirigami-plugin-example", latest: null,
	});
	assert.equal(await resolvePluginName("missing"), null);
	await install(["@private/kirigami-plugin-example"]);
	assert.deepEqual(calls[0][1].slice(-4), ["install", "--save-dev", "--", "@private/kirigami-plugin-example"]);
});

test("untrusted registry version strings never enter npm specifications", async (t) => {
	const { calls } = mockInstall(t);
	for (const version of ["1.2.3;echo injected", "1.2.3\n", "npm:other", "file:../other", {}, 42]) {
		t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ version }) }));
		await install(["@kirigami/plugin-fixture"]);
		assert.equal(calls.at(-1)[1].at(-1), "@kirigami/plugin-fixture");
	}
});

test("passes separate arguments without a shell and handles --save in either position", async (t) => {
	const { calls } = mockInstall(t);
	await install(["--save", "@kirigami/plugin-fixture"]);
	await install(["@kirigami/plugin-fixture", "--save"]);
	await install(["@kirigami/plugin-fixture"]);
	for (const [index, [command, args, options]] of calls.entries()) {
		assert.equal(command, process.platform === "win32" ? process.execPath : "npm");
		assert.deepEqual(args.slice(-4), ["install", index < 2 ? "--save-prod" : "--save-dev", "--", "@kirigami/plugin-fixture@1.2.3"]);
		assert.equal(options.shell, false);
		assert.equal(options.cwd, process.cwd());
	}
	assert.equal(calls.length, 3);
});

test("finds the Windows npm entry point in PATH, next to Node, or in npm_execpath", (t) => {
	const dir = fixture(t);
	const cli = path.join(dir, "node_modules/npm/bin/npm-cli.js");
	fs.mkdirSync(path.dirname(cli), { recursive: true });
	fs.writeFileSync(cli, "");
	assert.equal(resolveNpmCli({ Path: `"${dir}"` }, path.join(dir, "absent/node.exe")), cli);
	assert.equal(resolveNpmCli({}, path.join(dir, "node.exe")), cli);
	assert.equal(resolveNpmCli({ npm_execpath: cli }, path.join(dir, "absent/node.exe")), cli);
	assert.throws(() => resolveNpmCli({ npm_execpath: path.join(dir, "npm.cmd") }, path.join(dir, "absent/node.exe")), /Cannot locate npm-cli.js/);
});

test("Windows launcher preserves arguments and paths containing spaces and shell characters", { skip: process.platform !== "win32" }, (t) => {
	const dir = fixture(t);
	const cli = path.join(dir, "npm-cli.js");
	fs.writeFileSync(cli, "process.stdout.write(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));");
	const previous = process.env.npm_execpath;
	process.env.npm_execpath = cli;
	t.after(() => {
		if (previous === undefined) delete process.env.npm_execpath;
		else process.env.npm_execpath = previous;
	});
	const args = ["install", "--", "literal & | %PATH% $(echo) argument"];
	assert.deepEqual(JSON.parse(runNpm(args, { cwd: dir, encoding: "utf8" })), { args, cwd: dir });
	fs.writeFileSync(cli, "process.exit(7);");
	assert.throws(() => runNpm(["--version"], { stdio: "pipe" }), { status: 7 });
});
