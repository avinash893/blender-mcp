#!/usr/bin/env node
/**
 * Blender MCP Server - Entry Point
 * 
 * This file is the entry point for the MCP server.
 * It sets up the stdio transport and starts the server.
 * 
 * IMPORTANT: 
 * - All logging goes to stderr (via logger.ts)
 * - stdout is ONLY for MCP protocol messages
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { log } from './utils/logger.js';
import { config } from './utils/config.js';
import { createServer, setupGracefulShutdown } from './server.js';

async function main(): Promise<void> {
    log.info('='.repeat(50));
    log.info('Blender MCP Server starting...');
    log.info(`Version: ${config.server.version}`);
    log.info(`Blender endpoint: ws://${config.blender.host}:${config.blender.port}`);
    log.info('='.repeat(50));

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Create server
    const server = createServer();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    log.info('Connecting to stdio transport...');
    await server.connect(transport);

    setInterval(() => undefined, 60_000);

    log.info('MCP server is running and ready for requests');
}

// Run
main().catch((error) => {
    log.error('Fatal error starting server', {
        error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
});
