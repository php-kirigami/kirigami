import fs from 'fs';
import isBinary from './utils/isbinary.js';
import joinWith from './utils/joinwith.js'
import path, { dirname } from "path";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { walkFile } from '@kirigami/struct-walker';
import { getPHPRuntime, getPHPRuntimeWithNetwork } from "@kirigami/php-wasm";


const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');
let   __root = null;
let   __php  = null;


if (!fs.existsSync(__configpath)) throw `Config file not found: ${__configpath}`;
const config = await walkFile(__configpath);
if(!config) throw `Invalid config file: ${__configpath}`;


const getPHPInstance = async () => {
    if(!__php) {
        if(config?.kirigami?.root === undefined) throw `Missing prepros:root property in config file: ${__configpath}`;
        __root = path.join(__project, config.kirigami.root);
        if (!fs.existsSync(__root)) throw `Invalid prepros:root path: ${__root}`;

        const preprosConfig = config.prepros || {};
        preprosConfig.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        preprosConfig.root = joinWith('/project/', config?.kirigami?.root);
        preprosConfig.data = config.kirigami || {};

        __php = await (preprosConfig.network ? getPHPRuntimeWithNetwork() : getPHPRuntime());
        __php.setSpawnHandler((command, args, options) => spawn(command, args, options));
        __php.preprosConfig = preprosConfig;

        const __cache = path.join(__project, '.cache.db');
        const __cookie = path.join(__project, '.cookie.txt');
        mountPath(__php, __dirname, '/prepros');
        mountPath(__php, joinWith(__project, config?.kirigami?.root), joinWith('/project', config?.kirigami?.root));
        if (fs.existsSync(__cache)) mountPath(__php, __cache, '/project/.cache.db');
        if (fs.existsSync(__cookie)) mountPath(__php, __cookie, '/project/.cookie.txt');
    }
    return __php;
}


const mountPath = (php, localPath, virtualDir) => {
    const includeExtensions = new Set(['.php', '.json', '.yaml', '.yml', '.md', '.db', '.txt', ...(config?.prepros?.mountext || [])]);
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
        php.mkdirTree(virtualDir);
        for (const entry of fs.readdirSync(localPath, { withFileTypes: true })) {
            mountPath(php, path.join(localPath, entry.name), virtualDir + '/' + entry.name);
        }
    } else {
        const ext = path.extname(localPath).toLowerCase();
        if (includeExtensions.has(ext)) {
            const buf = fs.readFileSync(localPath);
            const parentDir = virtualDir.substring(0, virtualDir.lastIndexOf('/'));
            if (parentDir) {
                php.mkdirTree(parentDir);
            }
            php.writeFile(virtualDir, isBinary(buf) ? buf : buf.toString('utf8'));
        }
    }
}


const run = async (args = [], script = null, mountPaths = []) => {
    const php = await getPHPInstance();

    mountPaths.forEach(item => {
        const file = path.resolve(item);
        if(!fs.existsSync(file)) return;
        if(!path.relative(__project, file)) return;
        const dest = path.join('/project', file.replace(__project, '')).replaceAll('\\', '/');
        mountPath(php, file, dest);
    });

    const output = await php.runStream({
        scriptPath: script || '/prepros/prepros.php',
        env: {
            PREPROS_ARGS: JSON.stringify(args),
            PREPROS_CONFIG: JSON.stringify(php.preprosConfig)
        }
    });

    const stdout = await output.stdoutText;
    const stderr = await output.stderrText;

    let retobj;
    const resultPath = '/internal/prepros_result.json';

    try {
        if (await php.fileExists(resultPath)) {
            const buffer = php.readFileAsBuffer(resultPath);
            retobj = JSON.parse(Buffer.from(buffer).toString('utf8'));
            retobj.debug = stdout;

            if(retobj.files) await Promise.all(retobj.files.map(async (file, i) => {
                const fbuffer = php.readFileAsBuffer(file);
                const dest = file.replace(/^\/project\//i, '');
                const dir = dirname(path.join(__project, dest));
                if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(__project, dest), fbuffer);
                retobj.files[i] = dest;
            }));
        } else {
            retobj = { success: true, files: [], debug: stdout };
        }
    } catch (e) {
        retobj = { success: false, error: 'Response parsing error.' + e, debug: stdout, stderr };
    } finally {
        if (await php.fileExists(resultPath)) {
            await php.unlink(resultPath);
        }
    }
    if (stderr) {
        retobj = { success: false, error: stderr, debug: stdout };
    }

    return retobj;
}


const runenv = async (script, ...args) => {
    if(!script) throw "Missing PHP file.";
    const file = path.resolve(script);
    if(!path.relative(__project, file)) throw "PHP file outside project";
    if(!fs.existsSync(file)) throw "Can't find PHP file";
    const dest = path.join('/project', file.replace(__project, '')).replaceAll('\\', '/');
    return run([dest, ...args], '/prepros/runenv.php', [file]);
}


const render = async (file = '.') => {
    const php = await getPHPInstance();
    const target = path.resolve(__project, config?.kirigami?.root, file);
    const fsvm = path.join('/project', config?.kirigami?.root, file).replace(/\\/g, '/');
    mountPath(php, target, fsvm);
    if(config?.prepros?.before) {
        const include = path.resolve(__project, config?.kirigami?.root, config?.prepros?.before);
        const dest = path.join('/project', config?.kirigami?.root, config?.prepros?.before).replace(/\\/g, '/');
        mountPath(php, include, dest);
    }
    if(config?.prepros?.after) {
        const include = path.resolve(__project, config?.kirigami?.root, config?.prepros?.after);
        const dest = path.join('/project', config?.kirigami?.root, config?.prepros?.after).replace(/\\/g, '/');
        mountPath(php, include, dest);
    }
    return run([fsvm]);
}


const sitemap = async (dir) => {
    const php = await getPHPInstance();
    mountPath(php, __root, '/project/' + config?.kirigami?.root);
    return run(['sitemap']);
}


export { runenv, render, sitemap };