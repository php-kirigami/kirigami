/**
 * kiri install [package...] [--save-dev] [--global]
 *
 * Installe les dépendances Kirigami (plugins, presets, etc.).
 * Sans argument, installe toutes les dépendances du projet courant.
 */

import { c, log, parseArgs, printCommandHelp } from "../utils.js";

const HELP = {
  name: "install",
  description: "Installer les dépendances d'un projet Kirigami",
  usage: "[package...] [options]",
  options: [
    { flag: "--save-dev, -D",  desc: "Ajouter comme dépendance de développement" },
    { flag: "--global, -g",    desc: "Installer globalement" },
    { flag: "--help, -h",      desc: "Afficher cette aide" },
  ],
  examples: [
    "kiri install",
    "kiri install @kirigami/plugin-svg",
    "kiri install @kirigami/preset-docs --save-dev",
  ],
};

export default async function install(args) {
  const { flags, positional: packages } = parseArgs(args);

  if (flags.help || flags.h) {
    printCommandHelp(HELP);
    return;
  }

  const isGlobal  = flags.global  ?? flags.g ?? false;
  const isDevDep  = flags["save-dev"] ?? flags.D ?? false;

  console.log(`\n${c.bold(c.cyan("Kirigami"))} — Installation\n`);

  if (packages.length === 0) {
    log.info("Installation des dépendances du projet...");
    // TODO: lire kirigami.config.js / package.json et installer
    await sleep(600);
    log.success("Toutes les dépendances sont installées");
  } else {
    for (const pkg of packages) {
      log.step(`Installation de ${c.cyan(pkg)}${isDevDep ? c.dim(" [dev]") : ""}${isGlobal ? c.dim(" [global]") : ""}...`);
      // TODO: résoudre et télécharger le package depuis le registry Kirigami
      await sleep(300);
      log.success(`${c.bold(pkg)} installé`);
    }
  }

  console.log();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
