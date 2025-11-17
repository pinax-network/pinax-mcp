#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
	JSONRPCMessage,
	JSONRPCRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { Option, program } from "commander";
import "dotenv/config";
import * as pkg from "./package.json";
import { z } from "zod";

// Configuration
const AUTH_HEADER_NAME = "Authorization";
const VERSION = pkg.version;

// CLI
const opts = program
	.name(pkg.name)
	.version(VERSION)
	.description(pkg.description)
	.showHelpAfterError()
	.addOption(
		new Option("--remote-url <string>", "Remote MCP server url").env(
			"REMOTE_URL",
		),
	)
	.addOption(
		new Option("--sse-url <string>", "[DEPRECATED] Use --remote-url instead")
			.env("SSE_URL")
			.hideHelp(),
	)
	.addOption(
		new Option("--access-token <string>", "JWT Access Token").env(
			"ACCESS_TOKEN",
		),
	)
	.addOption(
		new Option(
			"--rest",
			"Use streamable-http transport instead of SSE (default: false)",
		)
			.env("REST")
			.default(false),
	)
	.addOption(
		new Option("-v, --verbose <boolean>", "Enable verbose logging")
			.choices(["true", "false"])
			.env("VERBOSE")
			.default(false),
	)
	.parse()
	.opts();

const ACCESS_TOKEN = opts.accessToken;
const REMOTE_URL = opts.remoteUrl || opts.sseUrl;
const USE_REST = opts.rest;
const AUTH_HEADER_VALUE = `Bearer ${ACCESS_TOKEN}`;

// Show deprecation warning
if (opts.sseUrl && !opts.remoteUrl) {
	console.error(
		"Warning: --sse-url is deprecated. Please use --remote-url instead.",
	);
}

// Validation
if (!REMOTE_URL) {
	console.error(
		"Error: Missing required REMOTE_URL .env variable or --remote-url option",
	);
	process.exit(1);
}

if (!ACCESS_TOKEN) {
	console.error(
		"Error: Missing required ACCESS_TOKEN .env variable or --access-token option",
	);
	process.exit(1);
}

// Logger (stderr for logging, stdout for MCP protocol)
const logger = { info: opts.verbose ? console.error : () => {} };
const transportType = USE_REST ? "streamable-http" : "SSE";

// Signal handlers
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
process.on("SIGHUP", () => process.exit(0));
process.stdin.on("close", () => process.exit(0));

// Auth helper
const fetchWithAuth = (url: string | URL, init?: RequestInit) => {
	const headers = new Headers(init?.headers);
	headers.set(AUTH_HEADER_NAME, AUTH_HEADER_VALUE);
	return fetch(url.toString(), { ...init, headers });
};

// Create transport based on type
const createTransport = () => {
	if (USE_REST) {
		return new StreamableHTTPClientTransport(new URL(REMOTE_URL), {
			requestInit: { headers: { [AUTH_HEADER_NAME]: AUTH_HEADER_VALUE } },
			fetch: fetchWithAuth,
		});
	} else {
		return new SSEClientTransport(new URL(REMOTE_URL), {
			eventSourceInit: { fetch: fetchWithAuth },
			requestInit: { headers: { [AUTH_HEADER_NAME]: AUTH_HEADER_VALUE } },
		});
	}
};

// Main
(async () => {
	logger.info(`Connecting to remote ${transportType} at ${REMOTE_URL}`);

	// Connect stdio transport first
	const stdioTransport = new StdioServerTransport();
	await stdioTransport.start();

	// Connect remote client
	const remoteTransport = createTransport();
	const remoteClient = new Client(
		{ name: "MCP Remote Client", version: VERSION },
		{ capabilities: {} },
	);

	// Intercept transport messages to catch notifications BEFORE the Client processes them
	const originalOnMessage = remoteTransport.onmessage;
	remoteTransport.onmessage = async (message: JSONRPCMessage) => {
		// Check if it's a notification (has method but no id)
		if ("method" in message && !("id" in message)) {
			logger.info("Remote → Stdio (notification):", message);
			// Forward notification to stdio
			await stdioTransport.send(message);
		}

		// Also let the Client handle it (for internal processing if needed)
		if (originalOnMessage) {
			originalOnMessage(message);
		}
	};

	remoteTransport.onerror = (err) =>
		logger.info(`${transportType} error:`, err);
	remoteTransport.onclose = () => {
		logger.info(`${transportType} connection closed`);
		process.exit(1);
	};

	await remoteClient.connect(remoteTransport);
	logger.info(`${transportType} successfully connected!`);

	// Forward all REQUEST messages from stdio to remote
	stdioTransport.onmessage = async (message) => {
		logger.info("Stdio message:", message);
		const isRequest = "method" in message && "id" in message;

		if (isRequest) {
			const request = message as JSONRPCRequest;
			logger.info("Stdio → Remote (request):", request);

			try {
				// Forward the request to remote server and get response
				const result = await remoteClient.request(request, z.any());

				// Build response message
				const response: JSONRPCMessage = {
					jsonrpc: "2.0" as const,
					id: request.id,
					result,
				};

				logger.info("Remote → Stdio (response):", response);
				await stdioTransport.send(response);
			} catch (err: any) {
				logger.info("Request error:", err);

				// Build error response
				const errorResponse: JSONRPCMessage = {
					jsonrpc: "2.0" as const,
					id: request.id,
					error: {
						code: typeof err?.code === "number" ? err.code : -32000,
						message: err?.message ?? "Internal error",
					},
				};

				await stdioTransport.send(errorResponse);
			}
		}
	};

	logger.info("Bridge running: Stdio ↔ " + transportType);
})();
