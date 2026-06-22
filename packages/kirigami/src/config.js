import fs from 'fs'; 	
import path from "path";
import { fileURLToPath } from 'url';
import { walkFile } from "@kirigami/struct-walker";


const __project = process.cwd();
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');


export async function getConfig() {

	if (!fs.existsSync(__configpath)) throw `Config file not found: ${__configpath}`;
	// const configContents = fs.readFileSync(__configpath, 'utf8');
	const config = await walkFile(__configpath);
	if(!config) throw `Invalid config file: ${__configpath}`;

	console.log(config);
	validateConfig(config);

	return config;
}


function validateConfig(config) {
	if(!config.kirigami) throw `Invalid config file: ${__configpath}\n  Missing "kirigami" configuration section.`;
	if(!config.kirigami.root) throw `Invalid config file: ${__configpath}\n  Missing "kirigami:root" property.`;
	const __root = path.resolve(__project, config.kirigami.root);
	if (!fs.existsSync(__root)) throw `Invalid config file: ${__configpath}\n  Invalid "kirigami:root" property.`;


	return true;
}