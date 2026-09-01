/**
 * Blender MCP Server - Status Tool
 * 
 * Tool to check Blender connection status and version.
 */

import { z } from 'zod';
import { blenderBridge } from '../bridge/client.js';

export const statusToolDefinition = {
    name: 'get_blender_status',
    description: 'Check if Blender is connected and running. Returns version info and connection status. Use this first to verify the connection before other operations.',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [] as string[],
    },
};

export async function handleGetBlenderStatus(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    const startTime = Date.now();

    // Check if we can connect
    if (!blenderBridge.isConnected) {
        try {
            await blenderBridge.connect();
        } catch {
            // Connection failed - return status
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        connected: false,
                        error: {
                            code: 'CONNECTION_FAILED',
                            message: 'Cannot connect to Blender',
                            suggestion: 'Start Blender and enable the MCP addon, then click "Start Server"',
                        },
                    }),
                }],
            };
        }
    }

    // Try to get version
    const response = await blenderBridge.send('get_version');
    const durationMs = Date.now() - startTime;

    if (response.success) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    connected: true,
                    version: response.data,
                    latency_ms: durationMs,
                }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                connected: false,
                error: response.error,
            }),
        }],
    };
}
