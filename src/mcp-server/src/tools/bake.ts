/**
 * Blender MCP Server - Bake Textures Tool
 * Token-optimized responses
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const bakeTexturesSchema = {
    object_name: z.string().describe('Object'),
    bake_types: z.array(z.enum([
        'COMBINED', 'DIFFUSE', 'NORMAL', 'AO', 'ROUGHNESS', 'METALLIC', 'EMIT', 'SHADOW',
    ])).default(['DIFFUSE', 'NORMAL', 'AO']).describe('Bake types'),
    output_dir: z.string().describe('Output dir'),
    resolution: z.number().int().min(128).max(8192).default(1024).describe('Res'),
    samples: z.number().int().min(1).max(512).default(64).describe('Samples'),
    margin: z.number().int().min(0).max(64).default(4).describe('Margin px'),
    highpoly_source: z.string().optional().describe('Highpoly obj'),
    cage_extrusion: z.number().min(0).max(1).default(0.1).describe('Cage dist'),
};

export type BakeTexturesParams = {
    object_name: string;
    bake_types: Array<'COMBINED' | 'DIFFUSE' | 'NORMAL' | 'AO' | 'ROUGHNESS' | 'METALLIC' | 'EMIT' | 'SHADOW'>;
    output_dir: string;
    resolution: number;
    samples: number;
    margin: number;
    highpoly_source?: string;
    cage_extrusion: number;
};

interface BakeResponseData {
    object_name: string;
    baked_maps: string[];
    output_dir: string;
    resolution: number;
    total_time_seconds: number;
}

export async function handleBakeTextures(params: BakeTexturesParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('bake', params);

    const response = await blenderBridge.send('bake_textures', {
        object_name: params.object_name,
        bake_types: params.bake_types,
        output_dir: params.output_dir,
        resolution: params.resolution,
        samples: params.samples,
        margin: params.margin,
        highpoly_source: params.highpoly_source,
        cage_extrusion: params.cage_extrusion,
    });

    if (response.success && response.data) {
        const d = response.data as BakeResponseData;
        // Compact: {ok:1,n:"Cube",maps:["a.png","b.png"],res:1024,t:5.2}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, n: d.object_name, maps: d.baked_maps, res: d.resolution, t: d.total_time_seconds }),
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
