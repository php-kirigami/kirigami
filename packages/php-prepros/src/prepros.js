import fs from 'fs';
import isBinary from './utils/isbinary.js';
import joinWith from './utils/joinwith.js'
import path, { dirname } from "path";
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from "url";
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

        await mountPath(__dirname, '/prepros', __php);
        await mountPath(joinWith(__project, config?.kirigami?.root), joinWith('/project', config?.kirigami?.root), __php);

        const __cache = path.join(__project, '.cache.db');
        const __cookie = path.join(__project, '.cookie.txt');
        if (fs.existsSync(__cache)) await mountPath(__cache, '/project/.cache.db', __php);
        if (fs.existsSync(__cookie)) await mountPath(__cookie, '/project/.cookie.txt', __php);

        __php.onMessage(async (data) => {
            const msg = JSON.parse(data);
            if(!msg.command) return { success: false, error: "Invalid command."};
            const file = path.join(__dirname, 'phpjs', `${msg.command}.js`);
            if(!fs.existsSync(file)) return { success: false, error: "Invalid command."};
            try {
                const cmdModule = await import(pathToFileURL(file).href);
                const results = await cmdModule.default(__php, msg);
                return JSON.stringify({
                    success: true,
                    results: results
                });
            } catch(e) {
                return {
                    success: false,
                    error: typeof e == 'string' ? e : e.message
                }
            }
        });
    }
    return __php;
}


const mountPath = async (localPath, virtualDir, php) => {
    php = php || await getPHPInstance();
    if(!path.isAbsolute(localPath)) localPath = path.join(__project, localPath);
    virtualDir = virtualDir || path.posix.join('/project', localPath.replace(__project + path.sep, ''));
    const includeExtensions = new Set(['.php', '.json', '.yaml', '.yml', '.md', '.db', '.txt', ...(config?.prepros?.mountext || [])]);
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
        php.mkdirTree(virtualDir);
        for (const entry of fs.readdirSync(localPath, { withFileTypes: true })) {
            const target = path.join(localPath, entry.name);
            if(!fs.statSync(target).isDirectory()) {
                const ext = path.extname(target).toLowerCase();
                if (includeExtensions.has(ext)) {
                    await mountPath(target, virtualDir + '/' + entry.name, php);
                }
            } else {
                await mountPath(target, virtualDir + '/' + entry.name, php);
            }
        }
    } else {
        const buf = fs.readFileSync(localPath);
        const parentDir = virtualDir.substring(0, virtualDir.lastIndexOf('/'));
        if (parentDir) php.mkdirTree(parentDir);
        php.writeFile(virtualDir, isBinary(buf) ? buf : buf.toString('utf8'));
    }
}


const run = async (args = [], script = null, mountfiles = []) => {
    const php = await getPHPInstance();

    await Promise.all(mountfiles.map(async item => {
        const file = path.resolve(item);
        if(!fs.existsSync(file)) return;
        if(!path.relative(__project, file)) return;
        const dest = path.join('/project', file.replace(__project, '')).replaceAll('\\', '/');
        const buf = fs.readFileSync(file);
        const parentDir = dest.substring(0, dest.lastIndexOf('/'));
        if (parentDir) php.mkdirTree(parentDir);
        php.writeFile(dest, isBinary(buf) ? buf : buf.toString('utf8'));
    }));

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


const runenv = async (script, paths = [], ...args) => {
    if(!script) throw "Missing PHP file.";
    const file = path.resolve(script);
    if(!path.relative(__project, file)) throw "PHP file outside project";
    if(!fs.existsSync(file)) throw "Can't find PHP file";
    const dest = path.join('/project', file.replace(__project, '')).replaceAll('\\', '/');
    return run([dest, ...args], '/prepros/runenv.php', [file, ...paths]);
}


const render = async (file = '.') => {
    const target = path.resolve(config?.kirigami?.root, file);
    const fsvm = path.join('/project', config?.kirigami?.root, file).replace(/\\/g, '/');
    await mountPath(target);
    if(config?.prepros?.before) {
        await mountPath(path.resolve(config?.kirigami?.root, config?.prepros?.before));
    }
    if(config?.prepros?.after) {
        await mountPath(path.resolve(config?.kirigami?.root, config?.prepros?.after));
    }
    return run([fsvm]);
}


const sitemap = async () => {
    await mountPath(config?.kirigami?.root);
    return run(['sitemap']);
}


export { runenv, render, sitemap, mountPath };