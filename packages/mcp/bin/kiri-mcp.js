#!/usr/bin/env node

// Standalone entrypoint — run this from a Kirigami project's root (or point
// an MCP client's `cwd` at one) to serve it over stdio. `kiri mcp` in
// @kirigami/cli does the same thing from within the `kiri` command tree.
//
// stdout is the MCP transport's wire format — never console.log here.
// Startup problems go to stderr, and the process exits non-zero so the MCP
// client's own logs show why the connection never came up.

import { serveStdio } from "../index.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

serveStdio({ name: "kirigami", version: pkg.version }).catch((err) => {
	console.error(`kiri-mcp: ${typeof err === "string" ? err : err?.message || err}`);
	process.exit(1);
});
