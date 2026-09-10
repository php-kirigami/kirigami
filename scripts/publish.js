// ---------------------------------------------------------------------------
// Release script — packs and publishes the @kirigami/* packages to npm in
// dependency order, then purges the jsDelivr cache for the JSON schemas.
//
//   node scripts/publish.js [options]
//
//     --dry-run       pack + `npm publish --dry-run`; no registry write, no purge
//     --no-purge      publish only, skip the jsDelivr purge
//     --purge-only    skip publishing, only purge the schema cache
//     --only <name>   act on a single package ("canva" or "@kirigami/canva")
//     --otp <code>    seed the first `npm publish` with this OTP (npm still
//                     prompts again once it expires — usually ~every 5 min)
//     --yes           skip the confirmation prompt (for CI / scripted runs)
//
// Interactive by design: it prints the plan and waits for confirmation, and
// each `npm publish` inherits the terminal so npm's own 2FA flow works — it
// prompts for the one-time password (or opens the browser for web login) right
// in place. Don't pipe the script's output or it can't prompt; pass --yes for
// unattended runs (2FA must then be satisfied some other way, e.g. --otp or an
// automation token).
//
// Idempotent: a package whose exact version is already on the registry is
// skipped, so a re-run after a partial failure just resumes. Needs an
// `npm login` session with publish rights on the @kirigami scope.
//
// Why the purge: kirigami.schema.json and every plugin's options.schema.json
// carry a `$id` / `$ref` that points at
// `https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/…`. jsDelivr caches a
// branch ref for up to 12 h, so without a purge editors keep validating
// kirigami.yaml against the previous schema after a release. The schemas are
// served straight from GitHub, NOT from npm — so what matters for the purge is
// that HEAD is pushed to `main`, which the preflight checks.
// ---------------------------------------------------------------------------

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG_DIR = path.join(ROOT, 'packages');
const PACKS = path.join(ROOT, 'packs');

const GH_REPO = 'php-kirigami/kirigami';   // jsDelivr `gh/<user>/<repo>` path
const GH_BRANCH = 'main';

const { values: opt } = parseArgs({
	options: {
		'dry-run':    { type: 'boolean', default: false },
		'no-purge':   { type: 'boolean', default: false },
		'purge-only': { type: 'boolean', default: false },
		'only':       { type: 'string' },
		'otp':        { type: 'string' },
		'yes':        { type: 'boolean', default: false },
	},
});

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

// Everything passed to the shell here is a literal or a path/name we read from
// package.json — never free-form user input — so string composition is safe.
// `q()` still quotes paths in case the checkout lives under a path with spaces.
const q = (s) => (/[\s"]/.test(s) ? `"${String(s).replace(/"/g, '\\"')}"` : String(s));

function capture(line, cwd = ROOT) {
	return execSync(line, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
// `npm publish` runs through here: full terminal inheritance, so npm can prompt
// for the 2FA one-time password / open the browser for web login.
function inherit(line, cwd = ROOT) {
	execSync(line, { cwd, stdio: 'inherit' });
}

async function confirm(question) {
	if (opt.yes) return true;
	if (!process.stdin.isTTY) {
		console.log(yellow('\nnot a TTY — cannot prompt. Re-run in a terminal, or pass --yes.'));
		return false;
	}
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = (await rl.question(`${question} ${dim('(y/N)')} `)).trim().toLowerCase();
	rl.close();
	return answer === 'y' || answer === 'yes';
}


// ── discover the publishable packages ─────────────────────────────────────
function readPackages() {
	const pkgs = new Map();
	for (const dir of readdirSync(PKG_DIR)) {
		const file = path.join(PKG_DIR, dir, 'package.json');
		if (!existsSync(file)) continue;
		const json = JSON.parse(readFileSync(file, 'utf8'));
		if (json.private) continue;
		pkgs.set(json.name, { name: json.name, dir: path.join(PKG_DIR, dir), json });
	}
	return pkgs;
}

// ── topological order on the internal @kirigami/* dependency graph ─────────
function dependencyOrder(pkgs) {
	const sorted = [];
	const done = new Set();
	const visit = (name, stack) => {
		if (done.has(name) || !pkgs.has(name)) return;
		if (stack.includes(name)) throw new Error(`dependency cycle: ${[...stack, name].join(' -> ')}`);
		const deps = Object.keys(pkgs.get(name).json.dependencies || {});
		for (const dep of deps) visit(dep, [...stack, name]);
		done.add(name);
		sorted.push(name);
	};
	for (const name of pkgs.keys()) visit(name, []);
	return sorted.map((name) => pkgs.get(name));
}


// ── is this exact name@version already on the registry? ───────────────────
function alreadyPublished(name, version) {
	try {
		return capture(`npm view ${name}@${version} version`) === version;
	} catch {
		return false; // never published, or offline — let the publish surface it
	}
}

function packAndPublish(pkg) {
	const { name, dir, json } = pkg;
	const { version } = json;

	// `prepublishOnly` does not run when publishing a tarball, so drive the
	// package's own build here instead (canva regenerates dist/).
	if (json.scripts?.build) {
		console.log(`  ${dim('·')} ${name}: npm run build`);
		inherit('npm run build', dir);
	}

	mkdirSync(PACKS, { recursive: true });
	const packed = capture(`npm pack --json --pack-destination ${q(PACKS)}`, dir);
	const tarball = path.join(PACKS, JSON.parse(packed)[0].filename);
	console.log(`  ${dim('·')} ${name}: packed ${dim(path.relative(ROOT, tarball))}`);

	let cmd = `npm publish ${q(tarball)} --access public`;
	if (opt['dry-run']) cmd += ' --dry-run';
	if (opt.otp) cmd += ` --otp ${q(opt.otp)}`;
	inherit(cmd, dir);
	console.log(`  ${green('✓')} ${name}@${version} published`);
}


// ── jsDelivr schema purge ────────────────────────────────────────────────
// The main config schema, plus every plugin's `kirigami.optionsSchema` (which
// kirigami.schema.json `$ref`s and which editors fetch straight from jsDelivr).
function schemaPaths(allPkgs) {
	const rels = new Set();
	const main = path.join('packages', 'kirigami', 'kirigami.schema.json');
	if (existsSync(path.join(ROOT, main))) rels.add(main.replaceAll(path.sep, '/'));

	for (const { dir, json } of allPkgs.values()) {
		const ref = json.kirigami?.optionsSchema;
		if (!ref) continue;
		const abs = path.resolve(dir, ref);
		if (existsSync(abs)) rels.add(path.relative(ROOT, abs).replaceAll(path.sep, '/'));
	}
	return [...rels];
}

async function purgeSchemas(allPkgs) {
	const rels = schemaPaths(allPkgs);
	console.log(`\nPurging jsDelivr ${dim(`gh/${GH_REPO}@${GH_BRANCH}`)} — ${rels.length} schema file(s):`);
	let failed = 0;
	for (const rel of rels) {
		const url = `https://purge.jsdelivr.net/gh/${GH_REPO}@${GH_BRANCH}/${rel}`;
		try {
			const res = await fetch(url, { headers: { Accept: 'application/json' } });
			const body = await res.json().catch(() => ({}));
			const ok = res.ok && body.status !== 'failed';
			if (!ok) failed++;
			console.log(`  ${ok ? green('✓') : yellow('✗')} ${rel} ${dim(body.status || res.status)}`);
		} catch (err) {
			failed++;
			console.log(`  ${yellow('✗')} ${rel} ${dim(err.message)}`);
		}
	}
	console.log(dim('\njsDelivr refetches on the next request; give it a minute. Verify with:'));
	console.log(dim(`  curl -sI https://cdn.jsdelivr.net/gh/${GH_REPO}@${GH_BRANCH}/${rels[0]}`));
	return failed;
}


// ── preflight — the schemas on jsDelivr track GitHub, not npm ─────────────
function preflightWarnings() {
	const warnings = [];
	try {
		if (capture('git status --porcelain', ROOT)) warnings.push('working tree has uncommitted changes');
	} catch { /* not a git checkout — ignore */ }
	try {
		const head = capture('git rev-parse HEAD', ROOT);
		const upstream = capture('git rev-parse "@{u}"', ROOT);
		if (head !== upstream) warnings.push('HEAD is not pushed — jsDelivr would purge to the schema still on GitHub');
	} catch {
		warnings.push('no upstream branch to compare against — cannot tell if HEAD is pushed');
	}
	return warnings;
}


// ── main ─────────────────────────────────────────────────────────────────
async function main() {
	const allPkgs = readPackages();
	let pkgs = allPkgs;

	if (opt.only) {
		const want = opt.only.startsWith('@') ? opt.only : `@kirigami/${opt.only}`;
		if (!allPkgs.has(want)) {
			console.error(`Unknown package "${opt.only}". Known: ${[...allPkgs.keys()].join(', ')}`);
			process.exit(1);
		}
		pkgs = new Map([[want, allPkgs.get(want)]]);
	}

	// ── show the plan ────────────────────────────────────────────────────
	const ordered = opt['purge-only'] ? [] : dependencyOrder(pkgs);
	const toPublish = ordered.filter((p) => !alreadyPublished(p.name, p.json.version));

	if (!opt['purge-only']) {
		console.log('\nRelease plan:');
		for (const p of ordered) {
			const fresh = toPublish.includes(p);
			console.log(`  ${fresh ? green('publish') : dim('skip   ')} ${p.name}@${p.json.version}${fresh ? '' : dim(' (already on npm)')}`);
		}
	}
	if (opt['purge-only'] || !opt['no-purge']) {
		console.log(opt['purge-only'] ? '\nWill purge the jsDelivr schema cache.' : dim('  then purge the jsDelivr schema cache'));
	}

	const warnings = preflightWarnings();
	if (warnings.length) {
		console.log(yellow('\nHeads up:'));
		for (const w of warnings) console.log(`  ${yellow('⚠')} ${w}`);
	}

	if (opt['dry-run']) {
		console.log(yellow('\n--dry-run: publishing with --dry-run, skipping the purge.\n'));
	} else if (!(await confirm('\nProceed?'))) {
		console.log('Aborted.');
		process.exit(1);
	}

	// ── run ──────────────────────────────────────────────────────────────
	const summary = { published: [], skipped: [] };

	for (const pkg of ordered) {
		const id = `${pkg.name}@${pkg.json.version}`;
		if (!toPublish.includes(pkg)) {
			console.log(`  ${dim('=')} ${id} ${dim('already on npm, skipped')}`);
			summary.skipped.push(id);
			continue;
		}
		packAndPublish(pkg);
		summary.published.push(id);
	}

	let purgeFailures = 0;
	if (opt['purge-only'] || (!opt['no-purge'] && !opt['dry-run'])) {
		purgeFailures = await purgeSchemas(allPkgs);
	}

	console.log('\n─────────────────────────────');
	if (summary.published.length) console.log(`published: ${summary.published.join(', ')}`);
	if (summary.skipped.length)   console.log(dim(`skipped:   ${summary.skipped.join(', ')}`));
	if (opt['dry-run']) console.log(yellow('dry run — nothing was published or purged'));
	if (purgeFailures) {
		console.log(yellow(`${purgeFailures} schema purge(s) failed — re-run with --purge-only`));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(`\n${yellow('release failed:')} ${err.message}`);
	process.exit(1);
});
