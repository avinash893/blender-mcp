/**
 * Blender MCP Server - Inspection Tools
 * 
 * Provides deep inspection of Blender scenes, objects, topology, and materials.
 */

import { z } from 'zod';
import { blenderBridge } from '../bridge/client.js';
import { log } from '../utils/logger.js';

export const inspectSceneSchema = {
    limit: z.number().min(1).max(200).default(50).describe('Max objects to inspect'),
};

export async function handleInspectScene(params: { limit: number }) {
    log.debug('Executing: inspect_scene', params);
    const response = await blenderBridge.send('inspect_scene', params);
    if (response.success && response.data) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify(response.data, null, 2),
            }],
        };
    }
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: response.error }),
        }],
    };
}

export const inspectObjectSchema = {
    name: z.string().describe('Exact name of the object to inspect'),
};

export async function handleInspectObject(params: { name: string }) {
    log.debug('Executing: inspect_object', params);
    const response = await blenderBridge.send('inspect_object', params);
    if (response.success && response.data) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify(response.data, null, 2),
            }],
        };
    }
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: response.error }),
        }],
    };
}
