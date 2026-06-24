import fs from 'fs'; 	
import path from "path";
import util from "util";
import { fileURLToPath, pathToFileURL } from 'url';
import { walkFile } from "@kirigami/struct-walker";
import { formatFrDate } from "./utils.js";


const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');

let config = null;

export async function getConfig() {
	if(!config) {
		if (!fs.existsSync(__configpath)) throw `Config file not found: ${__configpath}`;
		const _config = await walkFile(__configpath);
		if(!_config) throw `Invalid config file: ${__configpath}`;
		await validateConfig(_config);
		config = _config;
	}
	return config;
}


async function validateConfig(config) {
	const modules = [];
	
	// Verify root
	if(!config.kirigami) throwConfigError(__configpath, `Missing "kirigami" configuration section.`);
	if(!config.kirigami.root) throwConfigError(__configpath, `Missing "kirigami:root" property.`);
	const __root = path.resolve(__project, config.kirigami.root);
	if (!fs.existsSync(__root)) throwConfigError(__configpath, `Invalid "kirigami:root" property.`);
	config.root = __root;


	// verify kirigami.project, kirigami.baseurl

	if(config.kirigami.banner) {
		const bannerFile = path.join(__project, config.kirigami.banner);
		if (!fs.existsSync(bannerFile)) throwConfigError(__configpath, `Invalid "kirigami:banner" property.`);
		config.kirigami.banner = fs.readFileSync(config.kirigami.banner, 'utf8').replace(/###DATE###/, formatFrDate());
	} else {
		config.kirigami.banner = `Exported by Kirigami: ${formatFrDate()}`;
	}


	// Verify export

	// Verify prepros


	// Verify tasks
	if(config.tasks) {
		await Promise.all(config.tasks.map(async task => {
			if(!task.type) throwConfigError(__configpath, `Invalid task type: ${util.inspect(task)}.`);
			if(!task.name) throwConfigError(__configpath, `Invalid task name: ${util.inspect(task)}.`);
			try {
				if(!modules[task.type]) {
					const taskPath = path.resolve(__dirname, "tasks", `${task.type}.js`);
					if (!fs.existsSync(taskPath)) throwConfigError(__configpath, `Unknown task type: ${util.inspect(task)}.`);
					modules[task.type] = await import(pathToFileURL(taskPath).href);
				}
				await modules[task.type].validate(__root, task);
			} catch(err) {
				throwConfigError(__configpath, typeof err == 'string' ? err : err.message);
			}
		}));
	} else config.tasks = [];

	return true;
}




function throwConfigError(__configpath, msg) {
	throw `Invalid config file: ${__configpath}\n  ${msg}`;


}