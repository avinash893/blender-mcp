/**
 * Blender MCP Server - Procedural Generation Tool
 * Token-optimized responses
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const generateProceduralSchema = {
    type: z.enum(['TREE', 'ROCK', 'TERRAIN', 'BUILDING']).describe('Type'),
    style: z.enum(['LOW_POLY', 'REALISTIC', 'STYLIZED']).default('LOW_POLY').describe('Style'),
    size: z.number().min(0.1).max(100).default(2.0).describe('Size'),
    seed: z.number().int().optional().describe('Seed'),
    location: z.array(z.number()).length(3).default([0, 0, 0]).describe('[x,y,z]'),
    complexity: z.enum(['SIMPLE', 'MEDIUM', 'COMPLEX']).default('MEDIUM').describe('Detail'),
};

export type GenerateProceduralParams = {
    type: 'TREE' | 'ROCK' | 'TERRAIN' | 'BUILDING';
    style: 'LOW_POLY' | 'REALISTIC' | 'STYLIZED';
    size: number;
    seed?: number;
    location: number[];
    complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX';
};

interface ProceduralResponseData {
    object_name: string;
    type: string;
    vertices: number;
    faces: number;
}

export async function handleGenerateProcedural(params: GenerateProceduralParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('proc', params);

    const response = await blenderBridge.send('generate_procedural', {
        proc_type: params.type,
        style: params.style,
        size: params.size,
        seed: params.seed,
        location: params.location,
        complexity: params.complexity,
    });

    if (response.success && response.data) {
        const d = response.data as ProceduralResponseData;
        // Compact: {ok:1,n:"Tree_123",t:"TREE",v:256,f:128}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, n: d.object_name, t: params.type, v: d.vertices, f: d.faces }),
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
