/**
 * kiri build [--minify] [--sourcemap] [--outdir <path>]
 *
 * Compile le projet Kirigami pour la production.
 */

import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../../src/config.js";

const HELP = {
	name: "build",
	description: "Compiler le projet pour la production",
	usage: "[options]",
	options: [
		{ flag: "--minify", desc: "Minifier la sortie (activé par défaut en prod)" },
		{ flag: "--sourcemap", desc: "Générer les source maps" },
		{ flag: "--outdir <path>", desc: "Dossier de sortie (défaut: ./dist)" },
		{ flag: "--config <path>", desc: "Chemin vers kirigami.config.js" },
		{ flag: "--help, -h", desc: "Afficher cette aide" },
	],
	examples: [
		"kiri build",
		"kiri build --minify --sourcemap",
		"kiri build --outdir ./out",
	],
};

export default async function build(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	const config = await getConfig();
	// console.log(config);




	return;




	const minify = flags.minify ?? true;
	const sourcemap = flags.sourcemap ?? false;
	const outdir = flags.outdir ?? "./dist";

	console.log(`\n${c.bold(c.cyan("Kirigami"))} — Build production\n`);
	log.step(`Sortie     : ${c.dim(outdir)}`);
	log.step(`Minify     : ${minify ? c.green("oui") : c.gray("non")}`);
	log.step(`Source map : ${sourcemap ? c.green("oui") : c.gray("non")}`);
	console.log();

	const steps = [
		"Lecture de la config",
		"Résolution des entrées",
		"Transpilation",
		"Optimisation des assets",
		minify ? "Minification" : null,
		"Écriture des fichiers",
	].filter(Boolean);

	for (const step of steps) {
		log.step(step + "...");
		// TODO: implémentation réelle via le cœur Kirigami
		await sleep(200);
	}

	console.log();
	log.success(`Build terminé → ${c.bold(outdir)}`);
	console.log();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
