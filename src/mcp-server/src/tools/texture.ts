/**
 * Blender MCP Server - Texture & Material Tools
 * Token-optimized responses
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const applyTextureSchema = {
    object_name: z.string().describe('Object'),
    texture_path: z.string().describe('Image path'),
    material_name: z.string().optional().describe('Mat name'),
    uv_project: z.enum(['AUTO', 'BOX', 'SPHERE', 'CYLINDER', 'SMART']).default('AUTO').describe('UV mode'),
    tiling: z.array(z.number()).length(2).default([1, 1]).describe('[x,y] tiling'),
};

export type ApplyTextureParams = {
    object_name: string;
    texture_path: string;
    material_name?: string;
    uv_project: 'AUTO' | 'BOX' | 'SPHERE' | 'CYLINDER' | 'SMART';
    tiling: number[];
};

export const setMaterialSchema = {
    object_name: z.string().describe('Object'),
    preset: z.enum(['METALLIC', 'PLASTIC', 'GLASS', 'WOOD', 'STONE', 'FABRIC', 'EMISSIVE', 'MATTE']).describe('Preset'),
    color: z.array(z.number()).length(3).optional().describe('[R,G,B] 0-1'),
    roughness: z.number().min(0).max(1).optional().describe('Rough'),
    metallic: z.number().min(0).max(1).optional().describe('Metal'),
};

export type SetMaterialParams = {
    object_name: string;
    preset: 'METALLIC' | 'PLASTIC' | 'GLASS' | 'WOOD' | 'STONE' | 'FABRIC' | 'EMISSIVE' | 'MATTE';
    color?: number[];
    roughness?: number;
    metallic?: number;
};

interface TextureResponseData {
    object_name: string;
    material_name: string;
    texture_applied: boolean;
    uv_generated?: boolean;
}

interface MaterialResponseData {
    object_name: string;
    material_name: string;
    preset: string;
}

export async function handleApplyTexture(params: ApplyTextureParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('tex', params);

    const response = await blenderBridge.send('apply_texture', {
        object_name: params.object_name,
        texture_path: params.texture_path,
        material_name: params.material_name,
        uv_project: params.uv_project,
        tiling: params.tiling,
    });

    if (response.success && response.data) {
        const d = response.data as TextureResponseData;
        // Compact: {ok:1,n:"Cube",m:"CubeMat",uv:1}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, n: d.object_name, m: d.material_name, uv: d.uv_generated ? 1 : 0 }),
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

export async function handleSetMaterial(params: SetMaterialParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('mat', params);

    const response = await blenderBridge.send('set_material', {
        object_name: params.object_name,
        preset: params.preset,
        color: params.color,
        roughness: params.roughness,
        metallic: params.metallic,
    });

    if (response.success && response.data) {
        const d = response.data as MaterialResponseData;
        // Compact: {ok:1,n:"Cube",m:"CubeMat",p:"GLASS"}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, n: d.object_name, m: d.material_name, p: d.preset }),
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
