#!/usr/bin/env node

// Based on implementation from https://github.com/supercorp-ai/supergateway

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCMessage, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as pkg from "./pkg.mjs";
import { Option, program } from "commander";
import 'dotenv/config';

// defaults
const AUTH_HEADER_NAME = "Authorization";
const VERSION = pkg.version;

// CLI
const opts = program
    .name(pkg.name)
    .version(VERSION)
    .description(pkg.description)
    .showHelpAfterError()
    .addOption(new Option("--sse-url <string>", "Server-Sent Events (SSE) url").env("SSE_URL"))
    .addOption(new Option("--access-token <string>", "JWT Access Token from https://thegraph.market").env("ACCESS_TOKEN"))
    .addOption(new Option("-v, --verbose <boolean>", "Enable verbose logging").choices(["true", "false"]).env("VERBOSE").default(false))
    .parse()
    .opts();

const ACCESS_TOKEN = opts.accessToken;
const SSE_URL = opts.sseUrl;
const AUTH_HEADER_VALUE = `Bearer ${ACCESS_TOKEN}`;

// CLI or .env validation
if (!ACCESS_TOKEN) {
    console.error("Error: Missing required ACCESS_TOKEN .env variable or --access-token option");
    process.exit(1);
} else {
    const jwtSchema = z.string().regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const result = jwtSchema.safeParse(ACCESS_TOKEN);
    if (!result.success) {
        console.error("Error: Invalid ACCESS_TOKEN .env variable or --access-token option");
        process.exit(1);
    }
}

if (!SSE_URL) {
    console.error("Error: Missing required SSE_URL .env variable or --sse-url option");
    process.exit(1);
} else {
    const result = z.string().url().safeParse(SSE_URL);
    if (!result.success) {
        console.error("Error: Invalid SSE_URL .env variable or --sse-url option");
        process.exit(1);
    }
}

// Using console.error as logger since stdout is used for MCP communication
// See https://modelcontextprotocol.io/docs/tools/debugging#server-side-logging
const logger = { info: opts.verbose ? console.error : () => {} };

logger.info(`Connecting to remote SSE at ${SSE_URL}`);

process.on('SIGINT', () => {
    logger.info('Caught SIGINT. Exiting...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Caught SIGTERM. Exiting...');
    process.exit(0);
});

process.on('SIGHUP', () => {
    logger.info('Caught SIGHUP. Exiting...');
    process.exit(0);
});

process.stdin.on('close', () => {
    logger.info('stdin closed. Exiting...');
    process.exit(0);
});

const fetchWithAuth = (url: string | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set(AUTH_HEADER_NAME, AUTH_HEADER_VALUE);

    return fetch(url.toString(), { ...init, headers });
};

const sseTransport = new SSEClientTransport(new URL(SSE_URL), {
    // Adds auth header to initial connect (e.g. `/sse`)
    eventSourceInit: {
        fetch: fetchWithAuth,
    },
    // Adds auth header to all subsequent messages (e.g. `/messages`)
    requestInit: {
        headers: { [AUTH_HEADER_NAME]: AUTH_HEADER_VALUE },
    }
});

const sseClient = new Client(
    { name: 'MCP SSE Client', version: VERSION },
    { capabilities: {} }
);

sseTransport.onerror = err => {
    logger.info('SSE error:', err);
};

sseTransport.onclose = () => {
    logger.info('SSE connection closed');
    process.exit(1);
};

await sseClient.connect(sseTransport);
logger.info('SSE successfully connected !');

const stdioServer = new Server(
    sseClient.getServerVersion() ?? { name: 'MCP Stdio Server', version: VERSION },
    { capabilities: sseClient.getServerCapabilities() }
);

const stdioTransport = new StdioServerTransport();
await stdioServer.connect(stdioTransport);

const wrapResponse = (req: JSONRPCRequest, payload: object) => ({
    jsonrpc: req.jsonrpc || '2.0',
    id: req.id,
    ...payload,
});

stdioServer.transport!.onmessage = async (message: JSONRPCMessage) => {
    const isRequest = 'method' in message && 'id' in message;
    if (isRequest) {
        logger.info('Stdio → SSE:', message);

        const req = message as JSONRPCRequest;
        let result;

        try {
            result = await sseClient.request(req, z.any());
        } catch (err) {
            logger.info('Request error:', err);

            const errorCode =
                err && typeof err === 'object' && 'code' in err
                    ? (err as any).code
                    : -32000;

            let errorMsg =
                err && typeof err === 'object' && 'message' in err
                    ? (err as any).message
                    : 'Internal error';

            const prefix = `MCP error ${errorCode}:`;

            if (errorMsg.startsWith(prefix))
                errorMsg = errorMsg.slice(prefix.length).trim();

            const errorResp = wrapResponse(req, {
                error: {
                    code: errorCode,
                    message: errorMsg,
                },
            });

            process.stdout.write(JSON.stringify(errorResp) + '\n');
            return;
        }

        const response = wrapResponse(
            req,
            result.hasOwnProperty('error')
                ? { error: { ...result.error } }
                : { result: { ...result } }
        );

        logger.info('Response:', response);
        process.stdout.write(JSON.stringify(response) + '\n');
    } else {
        logger.info('SSE → Stdio:', message);
        process.stdout.write(JSON.stringify(message) + '\n');
    }
};