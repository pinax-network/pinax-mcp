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
import 'dotenv/config'

// defaults
const AUTH_HEADER_NAME = "x-api-key";
const DEFAULT_SSE_URL = "https://token-api.service.pinax.network/sse";
const VERSION = pkg.version;

// CLI
const opts = program
  .name(pkg.name)
  .version(VERSION)
  .description(pkg.description)
  .showHelpAfterError()
  .addOption(new Option("--sse-url <string>", "SSE URL").env("SSE_URL").default(DEFAULT_SSE_URL))
  .addOption(new Option("--api-key <string>", "Pinax API Key").env("PINAX_API_KEY"))
  .parse()
  .opts();

const AUTH_HEADER_VALUE = opts.apiKey;
const SSE_URL = opts.sseUrl;

// Using console.error as logger since stdout is used for MCP communication
// See https://modelcontextprotocol.io/docs/tools/debugging#server-side-logging
const logger = { info: console.error };

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
    { name: 'Pinax MCP SSE Client', version: VERSION },
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
    sseClient.getServerVersion() ?? { name: 'Pinax MCP Stdio Server', version: VERSION },
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