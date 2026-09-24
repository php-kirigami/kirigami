// CLI-style lines for the Kirigami output channel — the same glyphs and
// layout as `kiri` (packages/cli/bin/cmd/*.js, core's log/printTaskError),
// minus the ANSI codes an output channel can't render. The channel's
// "kirigami-output" grammar (syntaxes/) colors them instead: gray ›, green ✔,
// yellow ⚠, red ❌, headers and [task] tags.

// Removes ANSI escape sequences from text written by the worker or tools.
export const stripAnsi = (text) => String(text).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

/** @param {import("vscode").OutputChannel} output */
export function createLog(output) {
	const line = (text = "") => output.appendLine(stripAnsi(text));
	const log = {
		line,
		header: (title) => { line(); line(`kiri — ${title}`); line(); },
		section: (title) => { line(); line(`${title}:`); },
		step: (text) => line(`› ${text}`),
		info: (text) => line(`ℹ ${text}`),
		success: (text) => line(`✔ ${text}`),
		warn: (text) => line(`⚠ ${text}`),
		error: (text) => line(`❌ ${text}`),

		// A task or script result, as `kiri build` prints it.
		result(label, result) {
			line(`› ${label} ${result.success ? "✔" : "❌"}`);
			if (result.success) {
				for (const file of result.files || []) line(`    ${file}`);
				if (result.warnings) { line(); line("› Warnings:"); indent(result.warnings); }
			} else {
				log.taskError(result);
			}
		},

		// Port of core's printTaskError().
		taskError(result = {}) {
			const msg = result.error || result.message || result.stderr || "Unknown error (no message returned).";
			line();
			line("› Error:");
			indent(msg);
			if (result.page) line(`  page:  ${result.page}`);
			if (result.where) line(`  at:    ${result.where}`);
			for (const [label, body] of [["stderr", result.stderr !== msg && result.stderr], ["debug", result.debug]]) {
				const text = String(body || "").trim();
				if (!text) continue;
				const lines = text.split("\n");
				line();
				line(`  ── ${label}${lines.length > 40 ? ` (last 40 of ${lines.length} lines)` : ""} ──`);
				indent(lines.slice(-40).join("\n"));
			}
		},

		// Build/export results: before-build scripts, then each task.
		buildResult(result) {
			for (const script of result.trigger?.results || []) log.result(`SCRIPT: ${script.name}`, script);
			for (const hook of [result.beforeExport, result.beforeBuild]) {
				for (const script of hook?.results || []) log.result(`SCRIPT: ${script.name}`, script);
			}
			for (const task of result.results || []) log.result(`${task.taskname || task.type}: ${task.task}`, task);
			for (const script of result.afterExport?.results || []) log.result(`SCRIPT: ${script.name}`, script);
			if (result.error) log.taskError(result);
		},
	};
	function indent(text) {
		for (const l of String(text).split("\n")) line(`  ${l}`);
	}
	return log;
}
