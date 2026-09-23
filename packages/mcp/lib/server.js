// ---------------------------------------------------------------------------
// Minimal MCP server over stdio — only what @kirigami/mcp uses: tools.
//
// Replaces @modelcontextprotocol/sdk + zod (about 90 packages, including the
// HTTP transports' express/hono trees) for a tools-only stdio server. Speaks
// JSON-RPC 2.0, one message per line, and implements initialize (with
// protocol version negotiation), ping, tools/list and tools/call. Tool input
// schemas are plain JSON Schema, validated with ajv (already in the tree
// through @kirigami/kirigami); defaults declared in a schema are applied.
//
// Requests are handled one at a time, in arrival order: the Project API is
// not safe for concurrent builds.
// ---------------------------------------------------------------------------

import readline from "node:readline";
import Ajv from "ajv";

// Newest first. A client asking for one of these gets it back; any other
// request is answered with the newest, as the spec prescribes.
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

const response = (id, result) => ({ jsonrpc: "2.0", id, result });
const failure = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });


export class McpServer {
	#info;
	#tools = new Map();
	#ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });

	constructor({ name, version }) {
		this.#info = { name, version };
	}

	// Same call shape as the SDK's McpServer#registerTool, with a JSON Schema
	// (type "object") as `inputSchema`. The handler receives the validated
	// arguments and returns a tool result ({ content, isError? }).
	registerTool(name, { title, description, inputSchema } = {}, handler) {
		if (this.#tools.has(name)) throw new Error(`Tool "${name}" is already registered.`);
		const schema = { type: "object", properties: {}, ...inputSchema };
		this.#tools.set(name, {
			definition: { name, ...(title && { title }), ...(description && { description }), inputSchema: schema },
			validate: this.#ajv.compile(schema),
			handler,
		});
	}

	// Handles one decoded message; resolves to the response to send, or null
	// for notifications (and for responses to requests we never send).
	async handle(message) {
		if (!message || typeof message !== "object" || Array.isArray(message)) {
			return failure(null, INVALID_REQUEST, "Invalid Request");
		}
		const isRequest = "id" in message && message.id !== null;
		if (typeof message.method !== "string") {
			return isRequest && !("result" in message || "error" in message)
				? failure(message.id, INVALID_REQUEST, "Invalid Request")
				: null;
		}
		if (!isRequest) return null; // notifications/initialized, notifications/cancelled, ...

		const { id, method, params = {} } = message;
		try {
			switch (method) {
				case "initialize": {
					const requested = params.protocolVersion;
					return response(id, {
						protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
						capabilities: { tools: { listChanged: false } },
						serverInfo: this.#info,
					});
				}
				case "ping":
					return response(id, {});
				case "tools/list":
					return response(id, { tools: [...this.#tools.values()].map((tool) => tool.definition) });
				case "tools/call":
					return response(id, await this.#callTool(params));
				default:
					return failure(id, METHOD_NOT_FOUND, `Method not found: ${method}`);
			}
		} catch (error) {
			if (error?.code === INVALID_PARAMS) return failure(id, INVALID_PARAMS, error.message);
			return failure(id, INTERNAL_ERROR, error?.message || String(error));
		}
	}

	async #callTool({ name, arguments: args = {} }) {
		const tool = this.#tools.get(name);
		if (!tool) throw Object.assign(new Error(`Unknown tool: ${name}`), { code: INVALID_PARAMS });
		const input = structuredClone(args ?? {});
		// Invalid arguments are a tool error, not a protocol error, so the
		// model sees the message and can correct its call.
		if (!tool.validate(input)) {
			const details = tool.validate.errors.map((e) => `${e.instancePath || "(arguments)"} ${e.message}`).join("; ");
			return { content: [{ type: "text", text: `Invalid arguments for ${name}: ${details}` }], isError: true };
		}
		try {
			return await tool.handler(input);
		} catch (error) {
			return { content: [{ type: "text", text: typeof error === "string" ? error : error?.message || String(error) }], isError: true };
		}
	}

	async connect(transport) {
		await transport.start((message) => this.handle(message));
	}
}


// Newline-delimited JSON-RPC over a pair of streams (stdin/stdout by default).
// stdout carries protocol messages only. When the input ends, pending
// requests finish, then the process exits (the client closed the connection).
export class StdioServerTransport {
	constructor(input = process.stdin, output = process.stdout, { exitOnClose = true } = {}) {
		this.input = input;
		this.output = output;
		this.exitOnClose = exitOnClose;
	}

	start(onMessage) {
		let queue = Promise.resolve();
		const send = (message) => { if (message) this.output.write(JSON.stringify(message) + "\n"); };
		const lines = readline.createInterface({ input: this.input, crlfDelay: Infinity });
		lines.on("line", (line) => {
			if (!line.trim()) return;
			let message;
			try { message = JSON.parse(line); }
			catch { send(failure(null, PARSE_ERROR, "Parse error")); return; }
			queue = queue.then(() => onMessage(message)).then(send, (error) => send(failure(message?.id ?? null, INTERNAL_ERROR, error?.message || String(error))));
		});
		lines.on("close", () => {
			queue.finally(() => { if (this.exitOnClose) process.exit(0); });
		});
		this.done = new Promise((resolve) => lines.on("close", () => queue.finally(resolve)));
	}
}
