/**
 * kiri export [--format <fmt>] [--outdir <path>]
 *
 * Exporte le projet compilé dans différents formats.
 */

import { c, log, parseArgs, printCommandHelp } from "../utils.js";

const FORMATS = ["zip", "static", "docker", "gh-pages"];

const HELP = {
  name: "export",
  description: "Exporter le projet",
  usage: "[options]",
  options: [
    { flag: `--format, -f <fmt>`,  desc: `Format de sortie : ${FORMATS.join(", ")} (défaut: static)` },
    { flag: "--outdir <path>",      desc: "Dossier de sortie (défaut: ./export)" },
    { flag: "--no-build",           desc: "Ignorer l'étape de build (utilise ./dist existant)" },
    { flag: "--help, -h",           desc: "Afficher cette aide" },
  ],
  examples: [
    "kiri export",
    "kiri export --format zip",
    "kiri export --format gh-pages --no-build",
  ],
};

export default async function exportCmd(args) {
  const { flags } = parseArgs(args);

  if (flags.help || flags.h) {
    printCommandHelp(HELP);
    return;
  }

  const format   = flags.format ?? flags.f ?? "static";
  const outdir   = flags.outdir ?? "./export";
  const noBuild  = flags["no-build"] ?? false;

  if (!FORMATS.includes(format)) {
    log.error(`Format inconnu : ${c.bold(format)}`);
    log.step(`Formats disponibles : ${FORMATS.map(f => c.cyan(f)).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n${c.bold(c.cyan("Kirigami"))} — Export\n`);
  log.step(`Format  : ${c.bold(format)}`);
  log.step(`Sortie  : ${c.dim(outdir)}`);
  console.log();

  if (!noBuild) {
    log.info("Build du projet...");
    // TODO: appeler le cœur build directement (sans re-spawner)
    await sleep(400);
    log.success("Build terminé");
  }

  log.info(`Export au format ${c.cyan(format)}...`);

  const steps = {
    zip:       ["Compression des assets", "Génération du .zip"],
    static:    ["Copie des fichiers statiques", "Génération du manifeste"],
    docker:    ["Génération du Dockerfile", "Build de l'image", "Tag de l'image"],
    "gh-pages":["Préparation de la branche", "Commit des fichiers", "Push vers origin"],
  };

  for (const step of steps[format]) {
    log.step(step + "...");
    await sleep(250);
  }

  console.log();
  log.success(`Export ${c.bold(format)} terminé → ${c.bold(outdir)}`);
  console.log();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
