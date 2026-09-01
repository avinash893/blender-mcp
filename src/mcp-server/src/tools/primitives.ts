/**
 * Blender MCP Server - Primitives Tool
 * Token-optimized responses
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const createPrimitiveSchema = {
    type: z.enum(['CUBE', 'SPHERE', 'CYLINDER', 'CONE', 'PLANE', 'TORUS', 'MONKEY', 'CIRCLE', 'GRID'])
        .describe('Primitive type'),
    name: z.string().optional().describe('Name'),
    size: z.number().min(0.01).max(100).default(1.0).describe('Size'),
    location: z.array(z.number()).length(3).default([0, 0, 0]).describe('[x,y,z]'),
    rotation: z.array(z.number()).length(3).default([0, 0, 0]).describe('[rx,ry,rz] radians'),
    segments: z.number().min(3).max(256).optional().describe('Segments'),
};

export type CreatePrimitiveParams = {
    type: 'CUBE' | 'SPHERE' | 'CYLINDER' | 'CONE' | 'PLANE' | 'TORUS' | 'MONKEY' | 'CIRCLE' | 'GRID';
    name?: string;
    size: number;
    location: number[];
    rotation: number[];
    segments?: number;
};

interface PrimitiveResponseData {
    name: string;
    type?: string;
}

export async function handleCreatePrimitive(params: CreatePrimitiveParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('prim', params);

    const response = await blenderBridge.send('create_primitive', {
        primitive_type: params.type,
        name: params.name,
        size: params.size,
        location: params.location,
        rotation: params.rotation,
        segments: params.segments,
    });

    if (response.success && response.data) {
        const d = response.data as PrimitiveResponseData;
        // Compact: {ok:1,n:"Cube",t:"CUBE",l:[0,0,0]}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, n: d.name, t: params.type, l: params.location }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ ok: 0, e: response.error }),
        }],
    };
}
