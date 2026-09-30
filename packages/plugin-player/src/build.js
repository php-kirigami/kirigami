// ---------------------------------------------------------------------------
// @kirigami/plugin-player — the build-time pass (`prepros:html`).
//
// Swaps every <player src="…"> / <playlist src="…"> in a rendered page for
// its final markup. Per audio file, the expensive work (decode + waveform +
// tags) is done once and cached as <root>/_data/player/<content-hash>.json,
// meant to be committed like plugin-extlink's cache — a rebuild, or CI from a
// fresh checkout, never decodes a file it has already seen.
//
// The embedded cover art is written into the project's image source
// (<image.source>/player/<hash>.<ext>) and published through the same engine
// as <img asset> / img-asset() (@kirigami/php-prepros' processImages), with
// the same output naming as IMG::asset().
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getAudioPackage } from '@kirigami/audiowaveform-wasm';
import { parseM3u } from './m3u.js';

const TAG = /<(player|playlist)\b([^>]*)>/gi;
const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const CACHE_VERSION = 1;
const IMG_QUALITY = { webp: 82, avif: 50 };
const COVER_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const doneImages = new Set(); // dest paths already produced in this process


export async function renderPlayers(html, ctx, opts) {
	if (!/<(?:player|playlist)\b/i.test(html)) return html;

	const config = ctx.config || {};
	const state = {
		opts,
		config,
		root: path.resolve(process.cwd(), config.root || 'src'),
		pageDir: path.dirname(ctx.abs),
		waveIds: 0,
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
		const abs = resolveSrc(attrs.src, state);
		if (kind === 'player') {
			const track = await loadTrack(abs, { title: attrs.title, artist: attrs.artist, force: true }, state);
			return renderPlayer(track, state);
		}
		const entries = parseM3u(fs.readFileSync(abs, 'utf8'));
		if (!entries.length) throw new Error('playlist is empty');
		const items = [];
		for (const entry of entries) {
			if (/^[a-z][a-z0-9+.-]*:\/\//i.test(entry.path)) {
				warn(`skipping remote entry ${entry.path} (only local files can be analysed)`);
				continue;
			}
			const trackAbs = path.resolve(path.dirname(abs), entry.path);
			try {
				const track = await loadTrack(trackAbs, entry, state);
				items.push(`<li class="playlist__track">${renderPlayer(track, state)}</li>`);
			} catch (err) {
				warn(`${entry.path}: ${err.message}`);
			}
		}
		return `<div class="playlist"><ol class="playlist__tracks">${items.join('')}</ol></div>`;
	} catch (err) {
		warn(`${attrs.src}: ${err.message}`);
		return `<!-- ${kind}: ${escapeComment(err.message)} -->`;
	}
}


function resolveSrc(src, state) {
	const abs = src.startsWith('/') ? path.join(state.root, src) : path.resolve(state.pageDir, src);
	if (!fs.existsSync(abs)) throw new Error('file not found');
	return abs;
}


// One audio file -> everything the markup needs, from cache when possible.
async function loadTrack(abs, hints, state) {
	const bytes = fs.readFileSync(abs);
	const hash = crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 16);
	const cacheFile = path.join(state.root, '_data', 'player', `${hash}.json`);
	const imageSource = path.resolve(process.cwd(), state.config.image?.source || 'assets/images');

	let entry = readJson(cacheFile);
	const stale = !entry
		|| entry.version !== CACHE_VERSION
		|| entry.samples !== state.opts.samples
		|| (entry.cover && state.opts.cover && !fs.existsSync(path.join(imageSource, entry.cover)));
	if (stale) {
		const pkg = await getAudioPackage(new Uint8Array(bytes), { width: state.opts.samples, className: 'player__svg' });
		if (!pkg) throw new Error('unsupported or undecodable audio');
		const { cover, ...meta } = pkg.meta;
		entry = { version: CACHE_VERSION, samples: state.opts.samples, meta, svg: pkg.svg, cover: null };
		const ext = cover && COVER_EXT[String(cover.mimeType).toLowerCase()];
		if (state.opts.cover && ext) {
			entry.cover = `player/${hash}.${ext}`;
			const coverFile = path.join(imageSource, entry.cover);
			fs.mkdirSync(path.dirname(coverFile), { recursive: true });
			fs.writeFileSync(coverFile, cover.data);
		}
		fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
		fs.writeFileSync(cacheFile, JSON.stringify(entry), 'utf8');
	}

	const tags = entry.meta.id3 || {};
	return {
		src: urlFor(state.pageDir, abs),
		title: pick(hints, 'title', tags.title) || titleFromFile(abs),
		artist: pick(hints, 'artist', tags.artist) || '',
		format: entry.meta.format,
		duration: entry.meta.duration,
		svg: entry.svg,
		cover: entry.cover && state.opts.cover ? await publishCover(entry.cover, imageSource, state) : null,
		placeholder: state.opts.cover, // no cover art: keep the layout with a placeholder
	};
}


// A readable title for a file with no tags: "04_mata-zyklek.mp3" -> "mata-zyklek".
// Underscores become spaces and a leading track number is dropped.
function titleFromFile(abs) {
	const name = path.parse(abs).name.replace(/_/g, ' ').replace(/^\d{1,3}\s*[-.)]\s*(?=\D)|^\d{1,3}\s+(?=\D)/, '').replace(/\s+/g, ' ').trim();
	return name || path.parse(abs).name;
}


// An explicit attribute on the tag beats the file's own tags; a playlist's
// #EXTINF text is only a fallback for files with no tag.
function pick(hints, key, tagged) {
	return hints.force ? hints[key] || tagged : tagged || hints[key];
}


// Runs the cover through the image engine (square crop, project format) and
// returns its URL relative to the page — same rules as sass.js' img-asset().
async function publishCover(coverRel, imageSource, state) {
	const format = state.config.image?.format || 'webp';
	const size = state.opts.coverSize;
	const { dir, name } = path.parse(coverRel);
	const outRel = `${dir}/${name}-${size}x${size}-cover.${format}`;

	const imgDest = state.config.image?.dest || 'images';
	// Always the source tree, even during an export: this pass runs (prepros:html)
	// before the `dist` task, which still has to empty and refill the export
	// folder — writing into it now makes it refuse ("not empty, no export marker").
	// `dist` then copies these images along with the rest of the source tree.
	const destAbs = path.join(path.resolve(state.root, imgDest), outRel);
	const dests = [destAbs];

	const srcMtime = fs.statSync(path.join(imageSource, coverRel)).mtimeMs;
	const stale = dests.filter((d) => !doneImages.has(d) && (!fs.existsSync(d) || fs.statSync(d).mtimeMs < srcMtime));
	if (stale.length) {
		try {
			const { processImages } = await import('@kirigami/php-prepros');
			const result = await processImages([{
				op: 'resize',
				src: coverRel,
				width: size,
				height: size,
				cover: true,
				quality: IMG_QUALITY[format] ?? 82,
				dests: stale.map((d) => '/project/' + path.relative(process.cwd(), d).split(path.sep).join('/')),
			}]);
			if (!result.success) throw new Error(result.error || 'image processing failed');
			stale.forEach((d) => doneImages.add(d));
		} catch (err) {
			warn(`cover ${coverRel}: ${err.message}`);
			return null;
		}
	}
	return urlFor(state.pageDir, destAbs);
}


// Relative URL from the page to a file.
function urlFor(pageDir, abs) {
	return encodeURI(path.relative(pageDir, abs).split(path.sep).join('/'));
}


function renderPlayer(track, state) {
	const id = `player-wave-${++state.waveIds}`;
	const viewBox = /viewBox="([^"]+)"/.exec(track.svg)?.[1] || '0 0 1000 200';
	const base = track.svg.replace('<path ', `<path id="${id}" `).replace('<svg ', '<svg aria-hidden="true" ');
	const progress = `<svg class="player__svg player__svg--progress" viewBox="${viewBox}" preserveAspectRatio="none" aria-hidden="true"><use href="#${id}"/></svg>`;
	const duration = Math.max(0, Math.round(track.duration));

	return `<div class="player" data-src="${attr(track.src)}" data-duration="${duration}">`
		+ (track.cover
			? `<img class="player__cover" src="${attr(track.cover)}" alt="" loading="lazy">`
			: track.placeholder ? '<div class="player__cover player__cover--empty" aria-hidden="true"></div>' : '')
		+ '<div class="player__main">'
		+ '<div class="player__head">'
		+ '<button class="player__toggle" type="button" aria-label="Play">'
		+ '<svg class="player__icon" viewBox="0 0 24 24" aria-hidden="true"><path class="player__icon-play" d="M8 5v14l11-7z"/><path class="player__icon-pause" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
		+ '</button>'
		+ '<div class="player__info">'
		+ (track.artist
			? `<span class="player__artist">${escape(track.artist)}</span>`
			: `<span class="player__format">${escape(String(track.format || '').toUpperCase())}</span>`)
		+ `<span class="player__title">${escape(track.title)}</span>`
		+ '</div></div>'
		+ `<div class="player__wave" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="${duration}" aria-valuenow="0">${base}${progress}</div>`
		+ `<div class="player__times"><span class="player__time">0:00</span><span class="player__duration">${formatTime(duration)}</span></div>`
		+ `<noscript><audio controls src="${attr(track.src)}"></audio></noscript>`
		+ '</div></div>';
}


export function formatTime(total) {
	const s = Math.floor(total % 60);
	const m = Math.floor(total / 60) % 60;
	const h = Math.floor(total / 3600);
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
const warn = (msg) => console.warn(`\x1b[33m⚠\x1b[0m [plugin-player] ${msg}`);
