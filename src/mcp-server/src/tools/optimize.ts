/**
 * Blender MCP Server - Mesh Optimization Tool
 * Token-optimized responses
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const optimizeMeshSchema = {
    object_name: z.string().describe('Object'),
    target_ratio: z.number().min(0.01).max(1.0).default(0.5).describe('Ratio 0.5=50%'),
    preserve_uvs: z.boolean().default(true).describe('Keep UVs'),
    preserve_bounds: z.boolean().default(true).describe('Keep bounds'),
    symmetry: z.boolean().default(false).describe('Use symmetry'),
};

export type OptimizeMeshParams = {
    object_name: string;
    target_ratio: number;
    preserve_uvs: boolean;
    preserve_bounds: boolean;
    symmetry: boolean;
};

interface OptimizeResponseData {
    object_name: string;
    original_vertices: number;
    original_faces: number;
    new_vertices: number;
    new_faces: number;
    reduction_percent: number;
}

export async function handleOptimizeMesh(params: OptimizeMeshParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('opt', params);

    const response = await blenderBridge.send('optimize_mesh', {
        object_name: params.object_name,
        target_ratio: params.target_ratio,
        preserve_uvs: params.preserve_uvs,
        preserve_bounds: params.preserve_bounds,
        symmetry: params.symmetry,
    });

    if (response.success && response.data) {
        const d = response.data as OptimizeResponseData;
        // Compact: {ok:1,n:"Cube",before:{v:1000,f:500},after:{v:500,f:250},pct:50}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, n: d.object_name, before: { v: d.original_vertices, f: d.original_faces }, after: { v: d.new_vertices, f: d.new_faces }, pct: d.reduction_percent }),
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
