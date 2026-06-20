import fs from 'fs';
import path, { dirname } from "path";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getPHPRuntime, getPHPRuntimeWithNetwork } from "@kirigami/php-wasm";
import isBinary from './utils/isbinary.js';
import joinWith from './utils/joinwith.js'
import yaml from "js-yaml";


const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');


const mountPath = (php, localPath, virtualDir) => {
    const includeExtensions = new Set(['.php', '.json', '.yaml', '.md', '.db', ...(config?.prepros?.mountext || [])]);
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


const render = async (file = '.') => {
    const target = path.resolve(__project, config?.kirigami?.root, file);
    const fsvm = path.join('/project', config?.kirigami?.root, file).replace(/\\/g, '/');
    mountPath(php, target, fsvm);
    return run([fsvm]);
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


const php = await (preprosConfig.network ? getPHPRuntimeWithNetwork() : getPHPRuntime());


const mountPaths = [];
const __cache = path.join(__project, '.cache.db');
mountPath(php, __dirname, '/prepros');
mountPath(php, joinWith(__project, config?.kirigami?.root), joinWith('/project', config?.kirigami?.root));
if (fs.existsSync(__cache)) mountPath(php, __cache, '/project/.cache.db');


export { render, sitemap };