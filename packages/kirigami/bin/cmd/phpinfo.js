
import path from "path";
import { writeFile } from "fs/promises";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getPHPRuntime, phpinfo } from "@kirigami/php-wasm";
import PHPInfoParser from "../libs/phpinfoparser.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function phpinfo_(args) {
	const { flags, command, subcommand } = parseArgs(args);
	const dest_html = path.resolve(__dirname, '../../phpinfo.html');
	const dest_md = path.resolve(__dirname, '../../phpinfo.md');
	const info = await phpinfo();
	await writeFile(dest_html, info);

	const parser = PHPInfoParser.fromString(info);
	const md   = parser.toMarkdown();
	await writeFile(dest_md, md);


}