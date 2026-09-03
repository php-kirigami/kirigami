import { runscript } from "../cmd/run.js";
import { getConfig } from "../config.js";
import { c } from "../utils.js";


export async function is_trigger(name) {
	const config = await getConfig();
	return config.scripts?.some(s => s.trigger == name);
}


export async function trigger(name) {
	const config = await getConfig();
	if(!await is_trigger(name)) return;
	for (const s of config.scripts || []) {
		if(s.trigger != name) continue;
		process.stdout.write(`\n${c.gray("›")} SCRIPT: ${s.name}`);
		const results = await runscript(s.name);
		if(results.success) {
			process.stdout.write(` ${c.green("✔")}\n`);
			results.files.forEach(file => console.log(`    ${c.gray(file)}`));
		} else {
			process.stdout.write(` ${c.red("❌")}\n`);
			console.log(c.red("\n› Error:"));
			console.log(results.error);
			process.exit(1);
		}
	}
}