import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { c, log } from "../utils.js";

/**
 * bin/libs/devserver.js — the static file server + hot-reload channel behind
 * `kiri watch --serve`.
 *
 * Deliberately zero-dependency: node:http for both the static server and the
 * reload channel (Server-Sent Events — a plain long-lived GET response, no
 * WebSocket library needed), node:fs for reading files. No live-reload
 * framework, no bundler dev-server — just enough to make `kiri watch` usable
 * from a browser tab instead of a manual file:// reload.
 */

const MIME = {
	".html": "text/html; charset=utf-8",
	".htm":  "text/html; charset=utf-8",
	".css":  "text/css; charset=utf-8",
	".js":   "text/javascript; charset=utf-8",
	".mjs":  "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".xml":  "application/xml; charset=utf-8",
	".txt":  "text/plain; charset=utf-8",
	".svg":  "image/svg+xml",
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".webp": "image/webp",
	".avif": "image/avif",
	".ico":  "image/x-icon",
	".woff": "font/woff",
	".woff2":"font/woff2",
	".map":  "application/json; charset=utf-8",
};

const RELOAD_PATH = "/__kiri_reload__";

// Appended before `</body>` (or at the end, if there's none) of every HTML
// response. Reconnects on its own if the server restarts mid-session.
const RELOAD_SCRIPT = `
<script>
(function () {
	var es = new EventSource("${RELOAD_PATH}");
	es.onmessage = function () { location.reload(); };
	es.onerror = function () { es.close(); setTimeout(function () { location.reload(); }, 500); };
})();
</script>`;

function injectReloadScript(html) {
	return /<\/body>/i.test(html)
		? html.replace(/<\/body>/i, `${RELOAD_SCRIPT}\n</body>`)
		: html + RELOAD_SCRIPT;
}

// Resolves a URL pathname to a file under `root`, trying `index.html` for a
// directory (or extension-less path). Never resolves outside `root`.
function resolveFile(root, pathname) {
	const decoded = decodeURIComponent(pathname.split("?")[0]);
	const rel = decoded.replace(/^\/+/, "");
	const abs = path.normalize(path.join(root, rel));
	if (!(abs === root || abs.startsWith(root + path.sep))) return null; // path traversal guard

	const candidates = abs.endsWith(path.sep) || decoded.endsWith("/")
		? [path.join(abs, "index.html")]
		: [abs, path.join(abs, "index.html")];

	for (const file of candidates) {
		try {
			if (fs.statSync(file).isFile()) return file;
		} catch { /* try the next candidate */ }
	}
	return null;
}

/**
 * createDevServer({ root, port, host })
 *
 * Starts serving `root` as static files over plain HTTP, with a `/404.html`
 * fallback (served as-is if present, otherwise a minimal built-in page) and a
 * hot-reload channel every HTML response is wired to automatically.
 *
 * Returns `{ url, broadcastReload(), close() }`. `broadcastReload()` is safe
 * to call with zero connected clients (a no-op).
 */
export async function createDevServer({ root, port = 4321, host = "127.0.0.1" }) {
	const clients = new Set();

	const server = http.createServer((req, res) => {
		if (req.url === RELOAD_PATH) {
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
			});
			res.write("\n");
			clients.add(res);
			req.on("close", () => clients.delete(res));
			return;
		}

		const file = resolveFile(root, req.url || "/");
		if (!file) {
			const notFound = path.join(root, "404.html");
			res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
			if (fs.existsSync(notFound)) {
				res.end(injectReloadScript(fs.readFileSync(notFound, "utf8")));
			} else {
				res.end("<h1>404</h1><p>Not found.</p>");
			}
			return;
		}

		const ext = path.extname(file).toLowerCase();
		const type = MIME[ext] || "application/octet-stream";
		if (ext === ".html" || ext === ".htm") {
			res.writeHead(200, { "Content-Type": type });
			res.end(injectReloadScript(fs.readFileSync(file, "utf8")));
		} else {
			res.writeHead(200, { "Content-Type": type });
			fs.createReadStream(file).pipe(res);
		}
	});

	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, host, resolve);
	});

	return {
		url: `http://${host}:${port}/`,
		broadcastReload() {
			for (const res of clients) res.write("data: reload\n\n");
		},
		close() {
			for (const res of clients) res.end();
			clients.clear();
			return new Promise((resolve) => server.close(resolve));
		},
	};
}

export function logServerReady(url) {
	log.info(`Serving  : ${c.dim(url)} ${c.gray("(hot-reload on)")}`);
}
