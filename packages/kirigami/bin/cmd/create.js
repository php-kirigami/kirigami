
import path from "path";
import picomatch from "picomatch";
import { Octokit } from "@octokit/rest";
import { fileURLToPath, pathToFileURL } from 'url';
import { storeGet, storeSet } from "../store.js";
import { c, log, parseArgs, printCommandHelp } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));


const HELP = {
	name: "create",
	description: "Compile project for developement",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	examples: [
		"kiri build",
	],
};


async function listRepos(owner, pattern = "*", type = "org") {
	const octokit = new Octokit();
	const isMatch = picomatch(pattern);
	const repos = [];

	const iterator =
		type === "org"
			? octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
				org: owner,
				per_page: 100,
			})
			: octokit.paginate.iterator(octokit.rest.repos.listForUser, {
				username: owner,
				per_page: 100,
			});

	for await (const { data } of iterator) {
		for (const repo of data) {
			if (isMatch(repo.name)) {
				repos.push({
					name: repo.name,
					full_name: repo.full_name,
					private: repo.private,
					description: repo.description,
					url: repo.html_url,
					zip_url: `https://github.com/${repo.full_name}/archive/refs/heads/${repo.default_branch}.zip`,
					stars: repo.stargazers_count,
					updated_at: repo.updated_at,
				});
			}
		}
	}

	return repos;
}


async function getTemplates() {
	let repos = storeGet('kirigami-repos');
	if(!repos || (Date.now() - repos.updatedAt > 1000 * 60 * 60)) {
		repos = await listRepos('php-kirigami', 'template-*');
		repos = { updatedAt: Date.now(), repos };
		storeSet('kirigami-repos', repos);
	}
	return repos.repos.map(repo => { return { template: repo.name.replace(/^template-/, ''), ...repo }; });
}



async function printList() {
	const templates = await getTemplates();
	const colWidth = Math.max(...templates.map(t => t.template.length)) + 4;
	console.log(`\n${c.bold(c.cyan("kiri"))} — List of avaiable templates\n\n`);
	console.log(c.dim(`${"TEMPLATE".padEnd(colWidth)}DESCRIPTION`));
	console.log(`${"-".repeat(colWidth + 30)}`);
	for (const t of templates) {
		const name = c.cyan(t.template).padEnd(colWidth + 9); // +9 pour les escape codes
		console.log(`${name}${t.description}`);
	}
	console.log();
}




export default async function create(args) {
	const { flags, command, subcommand } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	if (flags.list || flags.l) {
		await printList();
		return;
	}


	console.log(`\n${c.bold(c.cyan("kiri"))} — Create Project\n`);

	console.log(flags);
	console.log(command);
	console.log(subcommand);

	// const config = await getConfig();

	// console.log(`\n`);
	// log.success(c.bold(c.green(` Build finished!`)));
	// console.log();
}
