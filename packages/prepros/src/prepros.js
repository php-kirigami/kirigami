import fs from 'fs';
import path from "path";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { PHP, loadPHPRuntime } from '@php-wasm/universal';
import { getPHPLoaderModule } from '@kirigami/php-wasm';
import ignore from 'ignore';
import yaml from "js-yaml";


const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');


if (!fs.existsSync(__configpath)) throw `Config file not found: ${__configpath}`;
const configContents = fs.readFileSync(__configpath, 'utf8');
const config = yaml.load(configContents);

console.log(config);

if(config?.prepros?.root === undefined) throw `Missing prepros:root property in config file: ${__configpath}`;
const __root = path.join(__project, config.prepros.root);
if (!fs.existsSync(__root)) throw `Invalid prepros:root path: ${__root}`;


console.log(__root);



















process.exit(0);




const runtime = await loadPHPRuntime(await getPHPLoaderModule());
const php = new PHP(runtime);





mountPath(php, __dirname, '/pxpros');
findAndMountPxprosConfigs(php, __project);


function mountPath(php, localPath, virtualDir) {
    const binaryExtensions = ['.webm', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.svg'];
	const includeExtensions = ['.php', '.json', '.yaml'];
    const stat = fs.statSync(localPath);

    if (stat.isDirectory()) {
        php.mkdir(virtualDir);
        for (const entry of fs.readdirSync(localPath, { withFileTypes: true })) {
            mountPath(php, path.join(localPath, entry.name), virtualDir + '/' + entry.name);
        }
    } else {
        const ext = path.extname(localPath).toLowerCase();
		if(includeExtensions.includes(ext)) {
			if (binaryExtensions.includes(ext)) {
				php.writeFile(virtualDir, fs.readFileSync(localPath));
			} else {
				php.writeFile(virtualDir, fs.readFileSync(localPath, 'utf8'));
			}
		}
    }
}


function findAndMountPxprosConfigs(php, projectDir) {
    const ig = ignore();
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        ig.add(fs.readFileSync(gitignorePath, 'utf8'));
    }
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const localPath = path.join(dir, entry.name);
            const relPath = path.relative(projectDir, localPath).replace(/\\/g, '/');
            if (ig.ignores(relPath)) continue;
            if (entry.isDirectory()) {
                walk(localPath);
            } else if (entry.name === '_pxpros.json') {
                const localDir = path.dirname(localPath);
                const relDir = path.dirname(relPath);
                mountPath(php, localDir, '/project/' + relDir);
            }
        }
    };
    walk(projectDir);
}


const run = async (args) => {
    php.setSpawnHandler((command, args, options) => {
        return spawn(command, args, options);
    });
    const output = await php.runStream({
        scriptPath: '/pxpros/pxpros.php',
        env: { PXPROS_ARGS: JSON.stringify(args) }
    });
    const stdout = await output.stdoutText;
    const stderr = await output.stderrText;
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
        retobj = { success: false, error: stderr };
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
    return run(['sitemap', '/project/' + dir]);
}


export { render, sitemap };