import { randomUUID } from "node:crypto";
import { jspi } from "wasm-feature-detect";
import { getPHPRuntime as _getPHPRuntime, getPHPRuntimeWithNetwork as _getPHPRuntimeWithNetwork } from "./runtime/runtime.js";

let runtime = null;
let runtimeNetwork = null;


async function getPHPLoaderModule() {
	return await import("./jspi/php_8_5.js");
}


const getPHPRuntime = async () => {
	if(!runtime) runtime = _getPHPRuntime();
	return runtime;
};


const getPHPRuntimeWithNetwork = async () => {
	if(!runtimeNetwork) runtimeNetwork = _getPHPRuntimeWithNetwork();
	return runtimeNetwork;
};


async function exec(code, network = false) {
	const instance = await (network ? getPHPRuntimeWithNetwork() : getPHPRuntime());
	const scriptPath = `/tmp/exec-${randomUUID()}.php`;
	const source = /^\s*<\?php/i.test(code) ? code : `<?php\n${code}`;
	instance.writeFile(scriptPath, source);
	try {
		const output = await instance.runStream({ scriptPath });
		const [stdout, stderr, returnCode] = await Promise.all([
			output.stdoutText,
			output.stderrText,
			output.exitCode,
		]);
		return { returnCode, stdout, stderr };
	} finally {
		try { instance.unlink(scriptPath); } catch { }
	}
}


async function phpversion() {
	const {stdout} = await exec('echo phpversion();');
	return stdout.trim();
}


async function phpinfo() {
	const {stdout} = await exec('phpinfo();');
	return stdout;
}


export { getPHPLoaderModule, getPHPRuntime, getPHPRuntimeWithNetwork, jspi, phpversion, phpinfo, exec };