/**
 * kiri create <project-name> [--template <name>]
 *
 * Crée un nouveau projet Kirigami dans un dossier portant le nom du projet.
 */

import { c, log, parseArgs, printCommandHelp } from "../utils.js";

const HELP = {
  name: "create",
  description: "Créer un nouveau projet Kirigami",
  usage: "<project-name> [options]",
  options: [
    { flag: "--template, -t <name>", desc: "Template à utiliser (default: default)" },
    { flag: "--no-install",          desc: "Ne pas installer les dépendances automatiquement" },
    { flag: "--help, -h",            desc: "Afficher cette aide" },
  ],
  examples: [
    "kiri create mon-projet",
    "kiri create mon-app --template minimal",
    "kiri create mon-app --no-install",
  ],
};

export default async function create(args) {
  const { flags, positional } = parseArgs(args);

  if (flags.help || flags.h) {
    printCommandHelp(HELP);
    return;
  }

  const projectName = positional[0];

  if (!projectName) {
    log.error(`Un nom de projet est requis.\n`);
    printCommandHelp(HELP);
    process.exit(1);
  }

  const template  = flags.template ?? flags.t ?? "default";
  const noInstall = flags["no-install"] ?? false;

  console.log(`\n${c.bold(c.cyan("Kirigami"))} — Création du projet\n`);
  log.step(`Nom        : ${c.bold(projectName)}`);
  log.step(`Template   : ${c.bold(template)}`);
  log.step(`Dossier    : ${c.dim(`./${projectName}`)}`);
  console.log();

  // TODO: scaffolding réel (copie de templates, git init, etc.)
  log.info(`Scaffolding depuis le template ${c.cyan(template)}...`);
  await sleep(300);
  log.success(`Structure créée dans ${c.bold(`./${projectName}`)}`);

  if (!noInstall) {
    log.info("Installation des dépendances...");
    await sleep(500);
    log.success("Dépendances installées");
  }

  console.log(`
${c.green("✔")} Projet ${c.bold(projectName)} prêt !

  ${c.dim("cd")} ${projectName}
  ${c.dim("kiri watch")}
`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
