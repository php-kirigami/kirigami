import fs from 'fs';
import path, { dirname } from "path";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { PHP, loadPHPRuntime } from '@php-wasm/universal';
import { getPHPLoaderModule } from '@kirigami/php-wasm';
import isBinary from './utils/isbinary.js';
import joinWith from './utils/joinwith.js'
import yaml from "js-yaml";


const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');


const mountPath = (php, localPath, virtualDir) => {
    const includeExtensions = new Set(['.php', '.json', '.yaml', '.db', ...(config?.prepros?.mountext || [])]);
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
        php.mkdir(virtualDir);
        for (const entry of fs.readdirSync(localPath, { withFileTypes: true })) {
            mountPath(php, path.join(localPath, entry.name), virtualDir + '/' + entry.name);
        }
    } else {
        const ext = path.extname(localPath).toLowerCase();
        if (includeExtensions.has(ext)) {
            const buf = fs.readFileSync(localPath);
            php.writeFile(virtualDir, isBinary(buf) ? buf : buf.toString('utf8'));
        }
    }
}


const run = async (args) => {
    php.setSpawnHandler((command, args, options) => spawn(command, args, options));
    const output = await php.runStream({
        scriptPath: '/prepros/prepros.php',
        env: { PREPROS_ARGS: JSON.stringify(args), PREPROS_CONFIG: JSON.stringify(preprosConfig) }
    });
    const stdout = await output.stdoutText;
    const stderr = await output.stderrText;
    console.log(stdout);
    let retobj;
    try {
        retobj = JSON.parse(stdout);
		await Promise.all(retobj.files.map(async (file, i) => {
			const buffer = php.readFileAsBuffer(file);
			const dest = file.replace(/^\/project\//i, '');
			fs.writeFileSync(path.join(__project, dest), buffer);
			retobj.files[i] = dest;
		}));
    } catch(e) {
        retobj = { success: false, error: 'Response parsing error.', response: stdout };
    }
    if (stderr) {
        try {
            retobj = JSON.parse(stderr);
        } catch(e) { 
            retobj = { success: false, error: stderr };
        }
    }
    return retobj;
}


const render = async (file) => {
	const stats = fs.statSync(file);
	if (stats.isFile()) mountPath(php, path.join(process.cwd(), path.dirname(file)), '/project/' + path.dirname(file));
	else mountPath(php, path.join(process.cwd(), file), '/project/' + file);
    return run(['/project/' + file]);
}


const sitemap = async (dir) => {
    mountPath(php, __root, '/project/' + config?.kirigami?.root);
    return run(['sitemap']);
}


if (!fs.existsSync(__configpath)) throw `Config file not found: ${__configpath}`;
const configContents = fs.readFileSync(__configpath, 'utf8');
const config = yaml.load(configContents);
if(!config) throw `Invalid config file: ${__configpath}`;


if(config?.kirigami?.root === undefined) throw `Missing prepros:root property in config file: ${__configpath}`;
const __root = path.join(__project, config.kirigami.root);
if (!fs.existsSync(__root)) throw `Invalid prepros:root path: ${__root}`;


const preprosConfig = config.prepros;
preprosConfig.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
preprosConfig.root = joinWith('/project/', config?.kirigami?.root);
preprosConfig.data = config.kirigami || {};


const runtime = await loadPHPRuntime(await getPHPLoaderModule());
const php = new PHP(runtime);


const mountPaths = [];
mountPath(php, __dirname, '/prepros');
if(preprosConfig.before) mountPaths.push(dirname(preprosConfig.before)); 
if(preprosConfig.after) mountPaths.push(dirname(preprosConfig.after)); 
(preprosConfig?.includes || []).forEach(path => mountPaths.push(dirname(path)));
mountPaths.filter((v, i, a) => a.indexOf(v) === i).forEach(path => {
    mountPath(php, __root + '/' + path, '/project/' + config?.kirigami?.root + '/' + path);
});


export { render, sitemap };