
import path from "path";
import { writeFile } from "fs/promises";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { runenv } from "@kirigami/php-prepros";
// import { exec, phpinfo } from "@kirigami/php-wasm";
// import PHPInfoParser from "../libs/phpinfoparser.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function test(args) {
	const { flags, command, subcommand } = parseArgs(args);
	// const dest_html = path.resolve(__dirname, '../../phpinfo.html');
	// const dest_md = path.resolve(__dirname, '../../phpinfo.md');
	// const info = await phpinfo();
	// console.log(info);
	// await writeFile(dest_html, info);

	// const parser = PHPInfoParser.fromString(info);
	// const md   = parser.toMarkdown();
	// await writeFile(dest_md, md);

// console.log(await exec(`<?php
//     // Native HTTPS request inside WASM using cURL!
//     $ch = curl_init("https://api.github.com/zen");
//     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
//     curl_setopt($ch, CURLOPT_USERAGENT, "Kirigami-PHP-WASM");
    
//     $response = curl_exec($ch);
//     // curl_close($ch);
    
//     echo "GitHub says: " . $response;
//   `, true));

	console.log(await runenv('scripts/test.php', 'patate', 'poil', 'mauditcave'));


}