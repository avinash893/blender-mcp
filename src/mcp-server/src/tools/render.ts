/**
 * Blender MCP Server - Render Preview Tool
 * Token-optimized responses
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const renderPreviewSchema = {
    output_path: z.string().describe('Output .png/.jpg'),
    resolution: z.array(z.number().int().min(64).max(4096)).length(2).default([512, 512]).describe('[w,h]'),
    camera_angle: z.enum(['FRONT', 'TOP', 'SIDE', 'ISOMETRIC', 'CURRENT']).default('ISOMETRIC').describe('Angle'),
    samples: z.number().int().min(1).max(256).default(32).describe('Samples'),
    transparent: z.boolean().default(false).describe('Alpha'),
};

export type RenderPreviewParams = {
    output_path: string;
    resolution: number[];
    camera_angle: 'FRONT' | 'TOP' | 'SIDE' | 'ISOMETRIC' | 'CURRENT';
    samples: number;
    transparent: boolean;
};

interface RenderResponseData {
    output_path: string;
    resolution: number[];
    render_time_seconds: number;
    file_size_kb: number;
}

export async function handleRenderPreview(params: RenderPreviewParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('render', params);

    const response = await blenderBridge.send('render_preview', {
        output_path: params.output_path,
        resolution: params.resolution,
        camera_angle: params.camera_angle,
        samples: params.samples,
        transparent: params.transparent,
    });

    if (response.success && response.data) {
        const d = response.data as RenderResponseData;
        // Compact: {ok:1,p:"out.png",res:[512,512],t:1.5,kb:45}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, p: d.output_path, res: d.resolution, t: d.render_time_seconds, kb: d.file_size_kb }),
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
