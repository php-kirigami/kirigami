#!/usr/bin/env node

/**
 * kiri — CLI principal de Kirigami
 *
 * Chaque sous-commande est un module isolé dans bin/cmd/*.js
 * Pour ajouter une commande : créer bin/cmd/macommande.js
 */

import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { existsSync } from "fs";
import { c } from "./utils.js"

const __dirname = dirname(fileURLToPath(import.meta.url));


// ─── Sous-commandes disponibles ─────────────────────────────────────────────
const COMMANDS = {
	create: "Créer un nouveau projet Kirigami",
	install: "Installer les dépendances d'un projet",
	build: "Compiler le projet pour la production",
	watch: "Démarrer le mode développement avec hot-reload",
	export: "Exporter le projet (zip, static, etc.)",
};

// ─── Aide globale ────────────────────────────────────────────────────────────
function printHelp() {
	console.log(`
${c.bold(c.cyan("kiri"))} ${c.dim("— Kirigami CLI")}

${c.bold("USAGE")}
  ${c.cyan("kiri")} ${c.green("<commande>")} [options]

${c.bold("COMMANDES")}
${Object.entries(COMMANDS)
			.map(([cmd, desc]) => `  ${c.green(cmd.padEnd(12))}${c.dim(desc)}`)
			.join("\n")}

${c.bold("OPTIONS GLOBALES")}
  ${c.gray("--help, -h")}    Afficher cette aide
  ${c.gray("--version, -v")} Afficher la version

${c.bold("EXEMPLES")}
  ${c.dim("kiri create mon-projet")}
  ${c.dim("kiri install")}
  ${c.dim("kiri build --minify")}
  ${c.dim("kiri watch --port 3000")}
  ${c.dim("kiri export --format zip")}
`);
}

// ─── Version ─────────────────────────────────────────────────────────────────
async function printVersion() {
	const { createRequire } = await import("module");
	const require = createRequire(import.meta.url);
	const pkg = require("../package.json");
	console.log(`${c.cyan("kiri")} v${pkg.version}`);
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────
async function main() {
	const args = process.argv.slice(2);
	const [subcommand, ...rest] = args;

	// Flags globaux
	if (!subcommand || subcommand === "--help" || subcommand === "-h") {
		printHelp();
		process.exit(0);
	}

	if (subcommand === "--version" || subcommand === "-v") {
		await printVersion();
		process.exit(0);
	}

	// Résoudre le fichier de commande
	const cmdPath = resolve(__dirname, "cmd", `${subcommand}.js`);

	if (!existsSync(cmdPath)) {
		console.error(
			`\n${c.red("✖")} Commande inconnue : ${c.bold(subcommand)}\n` +
			`  Tape ${c.cyan("kiri --help")} pour voir les commandes disponibles.\n`
		);
		process.exit(1);
	}

	// Charger et exécuter la sous-commande
	try {
		const cmdModule = await import(pathToFileURL(cmdPath).href);
		await cmdModule.default(rest);
	} catch (err) {
		console.error(`\n${c.red("✖")} Erreur dans ${c.bold(subcommand)} :\n  ${typeof err == 'string' ? err : err.message}\n`);
		if (process.env.KIRI_DEBUG) console.error(err);
		process.exit(1);
	}
}

main();
