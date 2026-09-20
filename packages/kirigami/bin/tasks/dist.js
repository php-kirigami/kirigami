import fs from 'fs';
import path from "path";
import ignore from 'ignore';


export const taskname = 'DIST';
export const canwatch = false;
export const canbuild = false;


export default async function dist(__root, task, exportPath = null) {
	task.ignore = task.ignore || [];
	try {
		const __dist = path.resolve(task.path);
		assertSafeExportPaths(__root, __dist);
		const stats = { copied: 0, skipped: 0, files: [] };
		const ig = await loadGitignore(__dist, task.ignore);
		await emptyDir(__dist);
		await walkAndCopy(__root, __root, __dist, ig, stats, task.banner);
		return {
			success: true,
			files: stats.files,
		};
	} catch(err) {
		return {
			success: false,
			error: err?.formatted || err?.message || err,
		};
	}
}


export async function validate(__root, task) {
	assertSafeExportPaths(__root, task.path);
}

// Resolve existing ancestors too: the output directory may not exist yet,
// and a symlink/junction above it can point back into the source tree.
function canonicalPath(input) {
	const absolute = path.resolve(input);
	try {
		fs.lstatSync(absolute);
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
		const parent = path.dirname(absolute);
		if (parent === absolute) throw error;
		return path.join(canonicalPath(parent), path.basename(absolute));
	}
	return fs.realpathSync.native(absolute);
}

function contains(parent, child) {
	const relative = path.relative(parent, child);
	return relative === '' || (!path.isAbsolute(relative)
		&& relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export function assertSafeExportPaths(source, destination) {
	const src = path.resolve(source);
	const dest = path.resolve(destination);
	const realSource = canonicalPath(src);
	const realDestination = canonicalPath(dest);
	if (contains(src, dest) || contains(dest, src)
		|| contains(realSource, realDestination) || contains(realDestination, realSource)) {
		throw new Error(`Unsafe export destination "${dest}": source and destination must not overlap (source: "${src}").`);
	}
}


async function loadGitignore(dist, extraPatterns = []) {
	const ig = ignore();
	if (Array.isArray(extraPatterns)) {
		ig.add(extraPatterns);
	}
	return ig;
}


async function emptyDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	await Promise.all(entries.map(async (e) => fs.rmSync(path.join(dir, e.name), { recursive: true, force: true })));
}


function norm(p) {
	return p.split(path.sep).join('/');
}


function shouldExcludeFile(relFromSrc, absPath) {
	const lower = absPath.toLowerCase();
	if (path.basename(lower).startsWith('_')) return true;
	if (path.basename(lower).startsWith('.')) return true;
	if (lower.endsWith('.php')) return true;
	if (lower.endsWith('.scss')) return true;
	if (lower.endsWith('.map')) return true;
	if (lower.endsWith('.js') && !lower.endsWith('.min.js')) return true;
	return false;
}


async function copyFilePreserveTree(absSrc, src, dist, ig) {
	const relFromSrc = path.relative(src, absSrc);
	const relPosix = norm(relFromSrc);
	if (ig.ignores(relPosix)) return false;
	if (shouldExcludeFile(relPosix, absSrc)) return false;
	const absDst = path.join(dist, relFromSrc);
	fs.mkdirSync(path.dirname(absDst), { recursive: true });
	fs.copyFileSync(absSrc, absDst);
	return absDst;
}


async function walkAndCopy(dir, src, dest, ig, stats, bannerContent = null) {
	const entries = await fs.readdirSync(dir, { withFileTypes: true });

	const today = (d =>
		`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
	)(new Date());

	for (const de of entries) {
		const abs = path.join(dir, de.name);
		const relFromSrc = path.relative(src, abs);
		const relPosix = norm(relFromSrc);

		if (de.isDirectory()) {
			if (ig.ignores(relPosix + '/')) continue;
			if (de.name.startsWith('_')) continue;
			if (de.name.startsWith('.')) continue;
			await walkAndCopy(abs, src, dest, ig, stats, bannerContent);
		}
		else if (de.isFile()) {
			const copied = await copyFilePreserveTree(abs, src, dest, ig);
			if (copied) {
				const lower = abs.toLowerCase();
				if (lower.endsWith('.js')) {
					fs.writeFileSync(
						copied,
						"/*!\n\n" + bannerContent + "\n\n*/\n" +
						fs.readFileSync(copied, 'utf8'),
						"utf8"
					);
				}
				else if (lower.endsWith('.css')) {
					fs.writeFileSync(
						copied,
						"/*!\n\n" + bannerContent + "\n\n*/\n" +
						fs.readFileSync(copied, 'utf8'),
						"utf8"
					);
				}
				else if (lower.endsWith('.html')) {
					fs.writeFileSync(
						copied,
						"<!--\n\n" + bannerContent + "\n\n-->\n" +
						fs.readFileSync(copied, 'utf8')
							.replaceAll(/###YEAR###/g, (new Date).getFullYear())
							.replaceAll(/###TIMESTAMP###/g, Math.floor(Date.now() / 1000)),
						"utf8"
					);
				}
				else if (lower.endsWith('sitemap.xml')) {
					fs.writeFileSync(
						copied,
						fs.readFileSync(copied, 'utf8')
							.replaceAll(/###TODAY###/g, today),
						"utf8"
					);
				}
				stats.copied++;
				stats.files.push(copied.replace(/\\/g, '/'));
			}
			else {
				stats.skipped++;
			}
		}
	}
}
