import fs from 'fs';
import isBinary from './utils/isbinary.js';
import joinWith from './utils/joinwith.js'
import path, { dirname } from "path";
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from "url";
import { walkFile } from '@kirigami/struct-walker';
import { getPHPRuntime, getPHPRuntimeWithNetwork } from "@kirigami/php-wasm";


const __modules = new Map;
const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');
let   __root   = null;
let   __php    = null;
let   __config = null;


// Load and cache kirigami.yaml on first use. Deferred (not run at import) so
// `import '@kirigami/php-prepros'` has no side effects — e.g. `kiri build -h`
// can pull the module in with no project on disk.
const loadConfig = async () => {
    if (__config) return __config;
    if (!fs.existsSync(__configpath)) throw `Config file not found: ${__configpath}`;
    __config = await walkFile(__configpath);
    if (!__config) throw `Invalid config file: ${__configpath}`;
    return __config;
}


const getPHPInstance = async () => {
    const config = await loadConfig();
    if(!__php) {
        if(config?.kirigami?.root === undefined) throw `Missing prepros:root property in config file: ${__configpath}`;
        __root = path.join(__project, config.kirigami.root);
        if (!fs.existsSync(__root)) throw `Invalid prepros:root path: ${__root}`;

        if(!config.image) config.image = {};
        if(!config.image.format) config.image.format = 'webp';
        if(!config.image.source) config.image.source = 'assets/images/';
        if(!config.image.dest) config.image.dest = 'images/';

        const preprosConfig = config.prepros || {};
        preprosConfig.image = config.image;
        preprosConfig.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        preprosConfig.root = joinWith('/project/', config?.kirigami?.root);
        preprosConfig.data = config.kirigami || {};
        // The unified SEO block — META reads it directly; LD reads its own
        // `jsonld` sub-key (see META/LD's docblocks). One block, one toggle.
        preprosConfig.seo = config.seo ?? null;
        // META auto-detects favicon / apple-touch-icon / humans.txt at the
        // source root; those extensions aren't mounted into the sandbox, so the
        // presence check is done here on the real filesystem instead.
        preprosConfig.metaFiles = {
            favicon:        fs.existsSync(path.join(__root, 'favicon.ico')),
            appleTouchIcon: fs.existsSync(path.join(__root, 'apple-touch-icon.png')),
            humans:         fs.existsSync(path.join(__root, 'humans.txt')),
        };
        // The build task list — read by PREPROS::injectHead() to auto-wire each
        // page's <head> with a <link>/<script> per sass/esbuild task output.
        preprosConfig.tasks = config.tasks || [];

        __php = await (preprosConfig.network ? getPHPRuntimeWithNetwork() : getPHPRuntime());
        __php.setSpawnHandler((command, args, options) => spawn(command, args, options));
        __php.preprosConfig = preprosConfig;
        __php.setIniValues({
            log_errors:      1,
            html_errors:     0,
            display_errors:  1,
            error_reporting: 32767,
            error_log:       'php://stderr',
            memory_limit:    '2G',
        });

        await mountPath(__dirname, '/prepros', __php);
        await mountPath(joinWith(__project, config?.kirigami?.root), joinWith('/project', config?.kirigami?.root), __php);

        const __cache = path.join(__project, '.cache.db');
        const __cookie = path.join(__project, '.cookie.txt');
        if (fs.existsSync(__cache)) await mountPath(__cache, '/project/.cache.db', __php);
        if (fs.existsSync(__cookie)) await mountPath(__cookie, '/project/.cookie.txt', __php);

        __php.onMessage(async data => {
            const msg = JSON.parse(data);
            if(!msg.command) return { success: false, error: "Invalid command."};
            const file = path.join(__dirname, 'phpjs', `${msg.command}.js`);
            if(!fs.existsSync(file)) return { success: false, error: "Invalid command."};
            try {
                if(!__modules.has(msg.command)) {
                    const cmdModule = await import(pathToFileURL(file).href);
                    __modules.set(msg.command, cmdModule);
                }
                const mod = __modules.get(msg.command);
                const results = await mod.default(__php, msg);
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
    const config = await loadConfig();
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
            // json_encode() turns a PHP array with gaps in its integer keys
            // into an object — normalise back to a list before we map over it.
            if (retobj.files && !Array.isArray(retobj.files)) retobj.files = Object.values(retobj.files);
            if(retobj.files) await Promise.all(retobj.files.map(async (file, i) => {
                const fbuffer = php.readFileAsBuffer(file);
                const dest = file.replace(/^\/project\//i, '');
                const dir = dirname(path.join(__project, dest));
                if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(__project, dest), fbuffer);
                retobj.files[i] = dest;
            }));
        } else {
            // No result file: PHP exited before STD::succeed()/error() — a
            // parse error, an OOM, a die(), a hard crash. Pull whatever
            // explanation we can out of the streams instead of a silent pass.
            const crash = extractPhpError(stderr) || extractPhpError(stdout);
            retobj = {
                success: false,
                files: [],
                error: crash || 'PHP produced no result (exited early — check the debug output).',
                debug: stdout,
                stderr,
            };
        }
    } catch (e) {
        retobj = { success: false, error: 'Response parsing error: ' + (e?.message || e), debug: stdout, stderr };
    } finally {
        if (await php.fileExists(resultPath)) {
            await php.unlink(resultPath);
        }
    }

    // A fatal that still managed to write a (stale/partial) result file, or
    // warnings printed to stderr. Only a genuine fatal marker overrides a
    // result the PHP side reported as a success; plain warnings are attached
    // as `warnings` so a stray notice doesn't sink an otherwise-clean build.
    if (stderr) {
        const fatal = extractPhpError(stderr);
        if (fatal && (!retobj || retobj.success !== false)) {
            retobj = { success: false, files: [], error: fatal, debug: stdout, stderr };
        } else if (retobj && retobj.success && !fatal) {
            retobj.warnings = stderr.trim();
        } else if (retobj && retobj.success === false && !retobj.stderr) {
            retobj.stderr = stderr.trim();
        }
    }

    // Never hand back a failure without a usable message.
    if (retobj && retobj.success === false && !retobj.error) {
        retobj.error = retobj.message || retobj.stderr || 'Unknown error.';
    }

    return retobj;
}


// Pulls the first meaningful PHP error line out of a stdout/stderr blob
// (fatals, parse errors, uncaught throwables). Returns null when the text
// holds nothing that looks like a hard error.
const extractPhpError = (text) => {
    if (!text) return null;
    const m = text.match(/^.*\b(?:PHP\s+)?(?:Fatal error|Parse error|Uncaught\s+\w+|Recoverable fatal error)\b.*$/mi);
    return m ? m[0].trim() : null;
}


const runenv = async (script, paths = [], ...args) => {
    if(!script) throw "Missing PHP file.";
    const file = path.resolve(script);
    if(!path.relative(__project, file)) throw "PHP file outside project";
    if(!fs.existsSync(file)) throw "Can't find PHP file";
    const dest = path.join('/project', file.replace(__project, '')).replaceAll('\\', '/');
    return run([dest, ...args], '/prepros/runenv.php', [file, ...paths]);
}


// Run a batch of image jobs (resize / palette) through /prepros/imagebatch.php,
// i.e. the IMG class (GD + Imagick). Used by @kirigami/kirigami's `sass` task so
// that img-asset() / colors() and the PHP IMG::asset() / <img asset> tag share
// one engine. `jobs` is the list documented in imagebatch.php; the result is a
// PreprosResult plus a `colors` map ({ "<src>:<count>": ["#rrggbb", …] }).
const processImages = async (jobs = []) => {
    if (!Array.isArray(jobs) || !jobs.length) return { success: true, files: [], colors: {} };
    const result = await run(['imagebatch', JSON.stringify(jobs)], '/prepros/imagebatch.php');
    if (!result.colors) result.colors = {};
    if (!result.files) result.files = [];
    return result;
}


const render = async (file = '.', phpIncludes = []) => {
    const config = await loadConfig();
    const target = path.resolve(config?.kirigami?.root, file);
    const fsvm = path.join('/project', config?.kirigami?.root, file).replace(/\\/g, '/');
    await mountPath(target);
    if(config?.prepros?.before) await mountPath(path.resolve(config?.kirigami?.root, config?.prepros?.before));
    if(config?.prepros?.after) await mountPath(path.resolve(config?.kirigami?.root, config?.prepros?.after));

    // Extra PHP files contributed by plugins (the kiri 'prepros:php' hook):
    // mounted outside /project and include_once'd once, before any page
    // renders, so they can PREPROS::registerTag()/registerHook() from PHP.
    if (Array.isArray(phpIncludes) && phpIncludes.length) {
        const php = await getPHPInstance();
        const mounted = [];
        for (let i = 0; i < phpIncludes.length; i++) {
            const abs = path.resolve(phpIncludes[i]);
            if (!fs.existsSync(abs)) continue;
            const virt = `/plugins/${i}_${path.basename(abs)}`;
            await mountPath(abs, virt, php);
            mounted.push(virt);
        }
        php.preprosConfig.phpIncludes = mounted;
    }

    return run([fsvm]);
}


const sitemap = async () => {
    const config = await loadConfig();
    await mountPath(config?.kirigami?.root);
    return run(['sitemap']);
}


export { runenv, render, sitemap, mountPath, processImages };