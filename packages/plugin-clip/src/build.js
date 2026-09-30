// ---------------------------------------------------------------------------
// @kirigami/plugin-clip — the build-time pass (`prepros:html`).
//
// Swaps every <clip src="…"> in a rendered page for its card. Per video, the
// expensive work (@kirigami/bestframe: decode, score, pick the poster — tens of
// seconds for a long file) is done once and cached as
// <root>/_data/clip/<fingerprint>.json, meant to be committed like
// plugin-extlink's cache. The fingerprint is the file size plus a hash of its
// first and last megabyte, so it is cheap on a multi-gigabyte file and still
// content-based (a fresh CI checkout hits the cache).
//
// The poster is written into the project's image source
// (<image.source>/clip/<fingerprint>.jpg) and published through the same
// engine as <img asset> / img-asset() (@kirigami/php-prepros' processImages),
// with the same output naming as IMG::asset().
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { bestFrame } from '@kirigami/bestframe';

const TAG = /<(clip|inline-clip)\b([^>]*)>/gi;
const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const CACHE_VERSION = 1;
const IMG_QUALITY = { webp: 82, avif: 50 };
const FINGERPRINT_CHUNK = 1024 * 1024;
const BROWSER_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm', '.ogv']);

const PLAY_ICON = '<svg class="clip__icon" viewBox="0 0 512 512" aria-hidden="true" fill="currentColor">'
	+ '<path d="M233 1a256 256 0 1 0 47 510A256 256 0 0 0 233 1zm59 45c80 14 146 73 169 150 6 23 8 33 7 60 0 27-1 37-7 60a215 215 0 0 1-264 145A215 215 0 0 1 46 220 213 213 0 0 1 292 46z"/>'
	+ '<path d="m221 168-5 4c-2 3-2 7-2 84 0 73 0 81 2 84 3 6 12 8 19 3l56-40c42-31 52-39 54-42 1-4 1-8-1-12l-113-82c-4-1-6-1-10 1z"/>'
	+ '</svg>';

const doneImages = new Set(); // dest paths already produced in this process


export async function renderClips(html, ctx, opts) {
	if (!/<(?:inline-)?clip\b/i.test(html)) return html;

	const config = ctx.config || {};
	const state = {
		opts,
		config,
		exportPath: ctx.exportPath || null,
		root: path.resolve(process.cwd(), config.root || 'src'),
		pageDir: path.dirname(ctx.abs),
	};

	const parts = [];
	let last = 0;
	for (const match of html.matchAll(TAG)) {
		parts.push(html.slice(last, match.index));
		parts.push(await renderTag(match[1].toLowerCase(), parseAttrs(match[2]), match[0], state));
		last = match.index + match[0].length;
	}
	parts.push(html.slice(last));
	return parts.join('');
}


function parseAttrs(text) {
	const attrs = {};
	for (const m of text.matchAll(ATTR)) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? '');
	return attrs;
}


async function renderTag(kind, attrs, original, state) {
	if (!attrs.src) return original; // nothing to play — leave the tag alone
	try {
		const abs = attrs.src.startsWith('/') ? path.join(state.root, attrs.src) : path.resolve(state.pageDir, attrs.src);
		if (!fs.existsSync(abs)) throw new Error('file not found');
		if (!BROWSER_EXTENSIONS.has(path.extname(abs).toLowerCase())) {
			warn(`${attrs.src}: ${path.extname(abs) || 'this file type'} is not played by most browsers — use MP4 (H.264) or WebM`);
		}
		const inline = kind === 'inline-clip';
		const clip = await loadClip(abs, attrs, state, inline);
		return inline ? renderInline(clip, attrs) : renderClip(clip);
	} catch (err) {
		warn(`${attrs.src}: ${err.message}`);
		return `<!-- ${kind}: ${escapeComment(err.message)} -->`;
	}
}


// Size + first/last megabyte: cheap on huge files, still content-based.
function fingerprint(abs) {
	const { size } = fs.statSync(abs);
	const hash = crypto.createHash('sha1').update(String(size));
	const fd = fs.openSync(abs, 'r');
	try {
		const buf = Buffer.alloc(Math.min(FINGERPRINT_CHUNK, size));
		fs.readSync(fd, buf, 0, buf.length, 0);
		hash.update(buf);
		if (size > FINGERPRINT_CHUNK) {
			fs.readSync(fd, buf, 0, buf.length, size - buf.length);
			hash.update(buf);
		}
	} finally {
		fs.closeSync(fd);
	}
	return hash.digest('hex').slice(0, 16);
}


async function loadClip(abs, attrs, state, inline = false) {
	const hash = fingerprint(abs);
	const cacheFile = path.join(state.root, '_data', 'clip', `${hash}.json`);
	const imageSource = path.resolve(process.cwd(), state.config.image?.source || 'assets/images');
	const { posterWidth, samples } = state.opts;

	let entry = readJson(cacheFile);
	const stale = !entry
		|| entry.version !== CACHE_VERSION
		|| entry.posterWidth !== posterWidth
		|| entry.samples !== samples
		|| !fs.existsSync(path.join(imageSource, entry.poster));
	if (stale) {
		const result = await bestFrame(abs, { samples, width: posterWidth, format: 'jpeg', quality: 90 });
		if (!result) throw new Error('bestframe could not decode this video (see the @kirigami/bestframe README for the supported codecs and containers)');
		entry = {
			version: CACHE_VERSION,
			posterWidth,
			samples,
			poster: `clip/${hash}.jpg`,
			width: result.width,
			height: result.height,
			timestamp: result.timestamp,
			score: result.score,
			duration: result.duration,
			sourceWidth: result.sourceWidth,
			sourceHeight: result.sourceHeight,
			metadata: result.metadata,
		};
		const posterFile = path.join(imageSource, entry.poster);
		fs.mkdirSync(path.dirname(posterFile), { recursive: true });
		fs.writeFileSync(posterFile, result.data);
		fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
		fs.writeFileSync(cacheFile, JSON.stringify(entry, null, '\t'), 'utf8');
	}

	// A vertical video (width < height) is shown in a default 16:9 box, the
	// picture centred inside it, rather than as a tall card. The published
	// poster is sized to that box, not to the full-width vertical frame.
	const portrait = !inline && entry.width < entry.height;
	const height = portrait ? Math.round(posterWidth * 9 / 16) : entry.height;
	const width = portrait ? Math.round(height * entry.width / entry.height) : entry.width;
	return {
		src: urlFor(state.pageDir, abs),
		title: attrs.title || metaTitle(entry.metadata) || titleFromFile(abs),
		duration: entry.duration,
		portrait,
		width,
		height,
		poster: await publishPoster(entry, width, imageSource, state),
	};
}


// The container's own title tag; its key case varies by muxer.
function metaTitle(metadata) {
	if (!metadata) return '';
	const key = Object.keys(metadata).find((k) => k.toLowerCase() === 'title');
	return key ? String(metadata[key]).trim() : '';
}


// A readable title for a file with no title tag: "04_my-clip.mp4" -> "my-clip".
function titleFromFile(abs) {
	const name = path.parse(abs).name.replace(/_/g, ' ').replace(/^\d{1,3}\s*[-.)]\s*(?=\D)|^\d{1,3}\s+(?=\D)/, '').replace(/\s+/g, ' ').trim();
	return name || path.parse(abs).name;
}


// Runs the poster through the image engine (project format, width only) and
// returns its URL relative to the page — same rules as sass.js' img-asset()
// and IMG::asset(). Returns null (and warns) if the engine fails, so the card
// falls back to a plain dark box rather than breaking the build.
async function publishPoster(entry, width, imageSource, state) {
	const format = state.config.image?.format || 'webp';
	const { dir, name } = path.parse(entry.poster);
	const outRel = `${dir}/${name}-${width}w.${format}`;

	const imgDest = state.config.image?.dest || 'images';
	const destAbs = path.join(path.resolve(state.exportPath || state.root, imgDest), outRel);
	const destSource = state.exportPath ? path.join(path.resolve(state.root, imgDest), outRel) : null;
	const dests = [destAbs, destSource].filter(Boolean);

	const srcMtime = fs.statSync(path.join(imageSource, entry.poster)).mtimeMs;
	const stale = dests.filter((d) => !doneImages.has(d) && (!fs.existsSync(d) || fs.statSync(d).mtimeMs < srcMtime));
	if (stale.length) {
		try {
			const { processImages } = await import('@kirigami/php-prepros');
			const result = await processImages([{
				op: 'resize',
				src: entry.poster,
				width,
				height: 0,
				cover: false,
				quality: IMG_QUALITY[format] ?? 82,
				dests: stale.map((d) => '/project/' + path.relative(process.cwd(), d).split(path.sep).join('/')),
			}]);
			if (!result.success) throw new Error(result.error || 'image processing failed');
			stale.forEach((d) => doneImages.add(d));
		} catch (err) {
			warn(`poster ${entry.poster}: ${err.message}`);
			return null;
		}
	}
	return urlFor(state.pageDir, destAbs);
}


function urlFor(pageDir, abs) {
	return encodeURI(path.relative(pageDir, abs).split(path.sep).join('/'));
}


// A decorative loop: plays by itself, muted, no controls, looping. The video's
// real size is given as width/height so the box exists before it loads. The
// poster shows until the first frame - and stays if the visitor prefers
// reduced motion (src/clip.js pauses it). A `class` on the tag is kept.
function renderInline(clip, attrs) {
	const extra = attrs.class ? ` ${attr(attrs.class)}` : '';
	return `<video class="inline-clip${extra}" src="${attr(clip.src)}"`
		+ (clip.poster ? ` poster="${attr(clip.poster)}"` : '')
		+ ` width="${clip.width}" height="${clip.height}" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>`;
}


// No JavaScript: the play link opens the video file itself, in the browser's
// own player. With src/clip.js it becomes click-to-play in place.
function renderClip(clip) {
	return `<div class="clip${clip.portrait ? ' clip--portrait' : ''}" data-src="${attr(clip.src)}">`
		+ (clip.poster
			? `<img class="clip__poster" src="${attr(clip.poster)}" width="${clip.width}" height="${clip.height}" alt="" loading="lazy">`
			: `<div class="clip__poster clip__poster--empty" aria-hidden="true"></div>`)
		+ `<a class="clip__play" href="${attr(clip.src)}" aria-label="Play ${attr(clip.title)}">${PLAY_ICON}</a>`
		+ `<span class="clip__title">${escape(clip.title)}</span>`
		+ `<span class="clip__duration">${formatTime(clip.duration)}</span>`
		+ '</div>';
}


export function formatTime(total) {
	const t = Math.max(0, Math.round(total));
	const s = t % 60;
	const m = Math.floor(t / 60) % 60;
	const h = Math.floor(t / 3600);
	const pad = (n) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}


function readJson(file) {
	try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => escape(s).replace(/"/g, '&quot;');
const escapeComment = (s) => String(s).replace(/--/g, '- -');
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const warn = (msg) => console.warn(`\x1b[33m⚠\x1b[0m [plugin-clip] ${msg}`);
