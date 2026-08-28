
import path from "path";
import { writeFile } from "fs/promises";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getPHPRuntime, phpinfo } from "@kirigami/php-wasm";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function test(args) {
	const { flags, command, subcommand } = parseArgs(args);
	const dest = path.resolve(__dirname, '../../phpinfo.html');
	const info = await phpinfo();
	await writeFile(dest, info);
}