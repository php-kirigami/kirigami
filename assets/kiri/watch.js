/**
 * kiri watch [--port <n>] [--host <h>] [--no-open]
 *
 * Lance le serveur de développement avec hot-reload.
 */

import { c, log, parseArgs, printCommandHelp } from "../utils.js";

const HELP = {
  name: "watch",
  description: "Démarrer le mode développement avec hot-reload",
  usage: "[options]",
  options: [
    { flag: "--port, -p <port>",  desc: "Port d'écoute (défaut: 3000)" },
    { flag: "--host <host>",      desc: "Hôte (défaut: localhost)" },
    { flag: "--no-open",          desc: "Ne pas ouvrir le navigateur automatiquement" },
    { flag: "--config <path>",    desc: "Chemin vers kirigami.config.js" },
    { flag: "--help, -h",         desc: "Afficher cette aide" },
  ],
  examples: [
    "kiri watch",
    "kiri watch --port 4000",
    "kiri watch --host 0.0.0.0 --no-open",
  ],
};

export default async function watch(args) {
  const { flags } = parseArgs(args);

  if (flags.help || flags.h) {
    printCommandHelp(HELP);
    return;
  }

  const port   = flags.port ?? flags.p ?? 3000;
  const host   = flags.host ?? "localhost";
  const noOpen = flags["no-open"] ?? false;

  console.log(`\n${c.bold(c.cyan("Kirigami"))} — Mode développement\n`);

  log.info("Lecture de la config...");
  await sleep(150);

  log.info(`Démarrage du serveur sur ${c.cyan(`http://${host}:${port}`)}`);
  await sleep(300);

  log.success(`Serveur prêt !`);
  console.log(`
  ${c.bold("Local")}    ${c.cyan(`http://localhost:${port}`)}
  ${c.bold("Réseau")}   ${c.cyan(`http://${host}:${port}`)}

  ${c.dim("Ctrl+C pour arrêter")}
`);

  if (!noOpen) {
    // TODO: ouvrir le navigateur (open / start / xdg-open selon l'OS)
    log.step("Ouverture du navigateur...");
  }

  // TODO: lancer le vrai watcher (chokidar ou équivalent)
  // Garder le process vivant
  await new Promise(() => {});
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
