import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';         // has a proper ESM export
import { createRequire } from 'module';
import { fileTypeFromBuffer } from 'file-type';       // ESM-only

// mime-types is CJS-only; pull it in via createRequire
const require = createRequire(import.meta.url);
const mime = require('mime-types');

// ---------------------------------------------------------------------------
// MIME detection
// ---------------------------------------------------------------------------

/**
 * Detects the MIME type of a file.
 * 1. file-type (magic bytes) — works even on renamed / extensionless files.
 * 2. mime-types (extension lookup) as fallback.
 * 3. Last resort: 'application/octet-stream'.
 *
 * @param {string} absolutePath
 * @param {Buffer} buf
 * @returns {Promise<string>}
 */
async function detectMime(absolutePath, buf) {
	const result = await fileTypeFromBuffer(buf);
	if (result?.mime) return result.mime;

	const fromExt = mime.lookup(absolutePath);
	return fromExt || 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Data-URI encoding
// ---------------------------------------------------------------------------

/**
 * MIME types that are encoded as minimal percent-encoded text URIs rather
 * than base64. This keeps SVG / CSS / HTML human-readable and avoids the
 * ~33 % size overhead of base64.
 */
export const TEXT_URI_MIME_TYPES = new Set([
	'image/svg+xml',
	'text/css',
	'text/html',
	'text/plain',
	'text/javascript',
	'application/json',
	'application/xml',
	'text/xml',
]);

/**
 * Encodes a UTF-8 text file as a minimal percent-encoded data URI.
 *
 * Only the characters that break an HTML attribute or CSS url() are encoded:
 * % (first, to avoid double-encoding), " ' < > # and whitespace control chars.
 *
 * @param {string} text
 * @param {string} mimeType
 * @returns {string}
 */
function encodeTextUri(text, mimeType) {
	const encoded = text
		.replace(/\r\n?/g, '\n')
		.replace(/%/g, '%25')
		.replace(/"/g, '%22')
		.replace(/'/g, '%27')
		.replace(/</g, '%3C')
		.replace(/>/g, '%3E')
		.replace(/\n/g, '%0A')
		.replace(/\r/g, '%0D')
		.replace(/\t/g, '%09')
		.replace(/#/g, '%23');

	return `data:${mimeType};charset=utf-8,${encoded}`;
}

/**
 * Encodes arbitrary binary data as a base64 data URI.
 *
 * @param {Buffer} buf
 * @param {string} mimeType
 * @returns {string}
 */
function encodeBase64Uri(buf, mimeType) {
	return `data:${mimeType};base64,${buf.toString('base64')}`;
}

/**
 * Converts a file to its data URI representation.
 * Text-based MIME types use percent-encoding; everything else uses base64.
 *
 * @param {string} absolutePath
 * @returns {Promise<string>}
 */
export async function fileToDataUri(absolutePath) {
	const buf = fs.readFileSync(absolutePath);
	let mimeType = await detectMime(absolutePath, buf);
	if(path.extname(absolutePath).toLowerCase() == '.svg')
		mimeType = 'image/svg+xml';

	return TEXT_URI_MIME_TYPES.has(mimeType)
		? encodeTextUri(buf.toString('utf8'), mimeType)
		: encodeBase64Uri(buf, mimeType);
}

// ---------------------------------------------------------------------------
// Extension sets
// ---------------------------------------------------------------------------

const YAML_JSON_EXTS = new Set(['.yml', '.yaml', '.json']);

/**
 * Asset extensions that trigger data URI conversion.
 * Any extension outside both this set and YAML_JSON_EXTS is kept as a plain string.
 * Add or remove entries to suit your project.
 */
export const ASSET_EXTS = new Set([
	// Images (raster)
	'.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico',
	'.bmp', '.tiff', '.tif', '.heic', '.heif',
	// Images (vector / text)
	'.svg', '.svgz',
	// Audio
	'.mp3', '.ogg', '.wav', '.flac', '.aac', '.opus', '.m4a',
	'.mid', '.midi', '.kar',
	// Video
	'.mp4', '.webm', '.ogv', '.mov', '.avi', '.mkv',
	// Fonts
	'.woff', '.woff2', '.ttf', '.otf', '.eot',
	// Documents / data
	'.pdf', '.txt', '.csv', '.xml', '.html', '.htm', '.css',
	// Code / scripts (when embedding is desired)
	'.js', '.mjs', '.cjs', '.ts', '.wasm',
	// 3-D / models
	'.glb', '.gltf',
	// Archives
	'.zip', '.gz',
]);

// ---------------------------------------------------------------------------
// Core loader
// ---------------------------------------------------------------------------

/**
 * Recursively loads a YAML or JSON file.
 *
 * For every string value encountered in the parsed tree:
 *   - Resolves to an existing YAML/JSON file → replaced by its parsed content
 *     (recursive, paths resolved relative to that file's own directory).
 *   - Resolves to an existing asset file     → replaced by a data URI.
 *   - Otherwise                              → kept as-is.
 *
 * Circular YAML/JSON references throw an Error.
 *
 * @param {string}      filePath   - Path to the root YAML or JSON file.
 * @param {Set<string>} [_visited] - Internal cycle-detection set.
 * @returns {Promise<unknown>}
 */
export async function walkFile(filePath, resolveAssets = false, _visited = new Set()) {
	const absolutePath = path.resolve(filePath);

	if (_visited.has(absolutePath)) {
		throw new Error(`Circular reference detected: ${absolutePath}`);
	}
	_visited.add(absolutePath);

	const raw = fs.readFileSync(absolutePath, 'utf8');
	const ext = path.extname(absolutePath).toLowerCase();
	const data = ext === '.json' ? JSON.parse(raw) : yaml.load(raw);

	const dir = path.dirname(absolutePath);
	return resolveNode(data, dir, resolveAssets, _visited);
}

// ---------------------------------------------------------------------------
// Tree traversal (internal)
// ---------------------------------------------------------------------------

async function resolveNode(node, dir, resolveAssets, visited) {
	if (typeof node === 'string') {
		return resolveString(node, dir, resolveAssets, visited);
	}

	if (Array.isArray(node)) {
		return Promise.all(node.map(item => resolveNode(item, dir, resolveAssets, visited)));
	}

	if (node !== null && typeof node === 'object') {
		const entries = await Promise.all(
			Object.entries(node).map(async ([key, value]) => [
				key,
				await resolveNode(value, dir, resolveAssets, visited),
			])
		);
		return Object.fromEntries(entries);
	}

	return node; // number, boolean, null, undefined
}

async function resolveString(str, dir, resolveAssets, visited) {
	const trimmed = str.trim();
	const ext = path.extname(trimmed).toLowerCase();

	if (!ext) return str;

	const candidate = path.resolve(dir, trimmed);
	if (!fs.existsSync(candidate)) return str;

	if (YAML_JSON_EXTS.has(ext)) {
		// Clone visited so sibling references don't falsely trip the cycle guard
		return walkFile(candidate, resolveAssets, new Set(visited));
	}

	if (ASSET_EXTS.has(ext) && resolveAssets) {
		return fileToDataUri(candidate);
	}

	return str;
}
