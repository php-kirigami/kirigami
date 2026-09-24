import path from "node:path";
import { createRequire } from "node:module";
import {
	listTemplates, findTemplate, inspectTarget, gitUserConfig,
	canInitGit, createProject, installDependencies,
} from "@kirigami/kirigami/create";
import { deriveRepo } from "@kirigami/kirigami/internal/config";
import { c, log, parseArgs, printCommandHelp, isInteractive, ask, confirm, select } from "../utils.js";

// Terminal face of @kirigami/kirigami/create: asks the questions, prints the
// report. The scaffolding itself lives in core, shared with the VS Code
// extension and the MCP server.

const cli = createRequire(import.meta.url)("../../package.json");


const HELP = {
	name: "create",
	description: "Create a new Kirigami project from an official template.",
	usage: "[template] [project-name] [options]",
	options: [
		{ flag: "--list, -l", desc: "List available templates (from the php-kirigami org)" },
		{ flag: "--name <name>", desc: "Project name (package.json name + kirigami.yaml project)" },
		{ flag: "--description <s>", desc: "Project description" },
		{ flag: "--author <name>", desc: "Author" },
		{ flag: "--email <email>", desc: "Author email (kirigami.yaml email)" },
		{ flag: "--baseurl <url>", desc: "Site base URL (kirigami.yaml baseurl)" },
		{ flag: "--repo <url>", desc: "Git repository URL (kirigami.yaml repo; default: derived from baseurl)" },
		{ flag: "--yes, -y", desc: "Non-interactive: take defaults, ask nothing" },
		{ flag: "--no-git", desc: "Don't initialise a git repository" },
		{ flag: "--no-install", desc: "Don't run \"npm install\" afterwards" },
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Templates are the php-kirigami repos named \"template-<name>\" (list cached 1h; set GITHUB_TOKEN if rate-limited).",
		"No arguments, in a terminal → interactive wizard.",
		"Never overwrites: existing files are kept, package.json is deep-merged (your deps win).",
		"Missing package.json / banner.txt / .mcp.json / .github/workflows/page.yml / .vscode/settings.json get a starter one; git repo + first commit unless --no-git; npm install unless --no-install.",
		"The banner keeps its ### ### tokens on disk — kiri fills them (date, author, repo, …) on every build/export.",
		"Every template ships a CLAUDE.md, ready for Claude Code out of the box.",
	],
	examples: [
		"kiri create",
		"kiri create --list",
		"kiri create blog my-blog",
	],
};


function fatal(message, hint) {
	log.error(message);
	console.log(hint ? `\n${hint}\n` : "");
	process.exit(1);
}

async function templatesOrExit() {
	try {
		const templates = await listTemplates();
		if (templates.length) return templates;
	} catch (err) {
		fatal(`Cannot list templates — ${err.message}`);
	}
	fatal("No templates found — the GitHub API may be unreachable.");
}


async function printList() {
	const templates = await templatesOrExit();
	const colWidth = Math.max(...templates.map(t => t.template.length)) + 4;
	console.log(`\n${c.bold(c.cyan("kiri"))} — List of available templates\n`);
	console.log(c.dim(`${"TEMPLATE".padEnd(colWidth)}DESCRIPTION`));
	console.log(`${"-".repeat(colWidth + 30)}`);
	for (const t of templates) {
		console.log(`${c.cyan(t.template.padEnd(colWidth))}${t.description || ""}`);
	}
	console.log();
}


// Asks (or takes from flags) the fields written into both package.json and
// kirigami.yaml. An empty answer means "leave the template's".
async function collectMeta(target, { interactive, flags }) {
	const meta = {
		name:        flags.name || "",
		description: flags.description || "",
		author:      flags.author || "",
		email:       flags.email || "",
		baseurl:     flags.baseurl || "",
		repo:        flags.repo || "",
	};
	if (!interactive) return meta;

	const git = gitUserConfig();
	meta.name        = await ask("Project name", { default: meta.name || path.basename(target) });
	meta.description = await ask("Description", { default: meta.description });
	meta.author      = await ask("Author", { default: meta.author || git.name });
	meta.email       = await ask("Author email", { default: meta.email || git.email });
	meta.baseurl     = await ask("Site base URL", { default: meta.baseurl });
	meta.repo        = await ask("Git repository URL", { default: meta.repo || deriveRepo(meta.baseurl) });
	return meta;
}


const GIT_SKIPPED = {
	"git-missing": "git not found — skipped repo init.",
	"inside-worktree": "Already inside a git repository — skipped git init.",
};


export default async function create(args) {
	const { flags, command, subcommand } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	if (flags.list || flags.l || command == "list") {
		await printList();
		return;
	}

	const interactive = isInteractive() && !flags.yes && !flags.y;

	console.log(`\n${c.bold(c.cyan("kiri"))} — Create Project\n`);

	// ── template ─────────────────────────────────────────────────────────
	let templateName = command;
	if (!templateName && interactive) {
		const templates = await templatesOrExit();
		templateName = await select("Which template?", templates.map(t => ({
			value: t.template,
			label: c.cyan(t.template),
			hint: t.description || "",
		})));
	}
	if (!templateName) {
		fatal("Missing template name.", `Run ${c.cyan("kiri create --list")} to see available templates.`);
	}

	let tpl;
	try {
		tpl = await findTemplate(templateName);
	} catch (err) {
		fatal(`Cannot list templates — ${err.message}`);
	}
	if (!tpl) {
		const templates = await templatesOrExit();
		fatal(`Unknown template "${templateName}".`, `Available: ${templates.map(t => c.cyan(t.template)).join(", ")}`);
	}

	// ── target directory ─────────────────────────────────────────────────
	let dirArg = subcommand;
	if (!dirArg && interactive) {
		dirArg = await ask("Project directory", { default: "." });
	}
	const target = path.resolve(process.cwd(), dirArg || ".");

	// Extraction is non-destructive (existing files kept, package.json merged),
	// so a non-empty target is fine — just say what's already there.
	const existing = inspectTarget(target);

	log.step(`Template : ${c.dim(tpl.template)}`);
	log.step(`Target   : ${c.dim(target)}${existing.hasPackageJson ? c.dim(" (existing Node project)") : ""}`);
	if (existing.entries.length) {
		log.step(c.dim(`${existing.entries.length} item(s) already here — kept as-is; only missing files are added.`));
	}

	if (interactive && !(await confirm("Create here?", true))) {
		console.log("Aborted.\n");
		process.exit(1);
	}

	// ── project metadata ─────────────────────────────────────────────────
	if (interactive) console.log();
	const meta = await collectMeta(target, { interactive, flags });

	let git = !flags["no-git"];
	if (git && interactive && canInitGit(target).ok) {
		git = await confirm("Initialise a git repository?", true);
	}

	// ── scaffold ─────────────────────────────────────────────────────────
	if (interactive) console.log();
	const result = await createProject({
		template: tpl, target, meta, git, cliVersion: cli.version,
		onProgress: ({ url }) => log.step(`Downloading ${c.dim(url)}`),
	});
	if (!result.success) fatal(result.error);

	if (result.skipped) log.step(`${result.skipped} existing file(s) left untouched.`);
	if (result.merged) log.step("Merged the template's package.json into the existing one.");
	if (result.packageJson === "starter") log.step("Wrote a starter package.json (the template ships none).");
	if (result.changed.length) log.step(`Filled ${result.changed.join(", ")} in package.json / kirigami.yaml.`);
	if (result.banner) log.step("Wrote a starter banner.txt (kiri fills its ### ### tokens on build).");
	if (result.starterFiles.length) log.step(`Added ${result.starterFiles.join(", ")} (the template ships none).`);

	// ── git ──────────────────────────────────────────────────────────────
	if (result.git.skipped && GIT_SKIPPED[result.git.skipped]) {
		log.step(c.dim(GIT_SKIPPED[result.git.skipped]));
	} else if (result.git.committed) {
		log.step("Initialised git repository with an initial commit.");
	} else if (result.git.initialised) {
		log.warn(`git repo created but the first commit failed — ${result.git.error}`);
		log.step(c.dim("Set user.name / user.email, then commit manually."));
	} else if (result.git.error) {
		log.warn(`git init failed — ${result.git.error}`);
	}

	// ── npm install ──────────────────────────────────────────────────────
	if (!flags["no-install"]) {
		console.log();
		log.step(`Running ${c.dim("npm install")}\n`);
		const install = await installDependencies(target);
		if (!install.success) {
			console.log();
			fatal(`npm install failed: ${install.error}`);
		}
	}

	console.log();
	log.success(c.bold(c.green(` Project created from "${tpl.template}" — ${result.written} file(s) written.`)));
	console.log();
}
