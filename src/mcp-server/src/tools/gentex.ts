/**
 * Blender MCP Server - Generate Texture Tool
 * AI-powered texture generation + auto-apply
 * Token-optimized
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export const genTexSchema = {
    n: z.string().describe('Object name'),
    src: z.string().describe('Image source: local path, URL, or "generate" for AI'),
    prompt: z.string().optional().describe('AI prompt if src="generate"'),
    uv: z.enum(['AUTO', 'BOX', 'SPHERE', 'CYLINDER']).default('AUTO').describe('UV mode'),
    tile: z.array(z.number()).length(2).default([1, 1]).describe('[x,y] tiling'),
};

export type GenTexParams = {
    n: string;
    src: string;
    prompt?: string;
    uv: 'AUTO' | 'BOX' | 'SPHERE' | 'CYLINDER';
    tile: number[];
};

/**
 * Download image from URL to local temp file
 */
async function downloadImage(url: string, destPath: string): Promise<boolean> {
    return new Promise((resolve) => {
        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadImage(redirectUrl, destPath).then(resolve);
                    return;
                }
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(true);
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { });
            log.error('Download failed', { error: err.message });
            resolve(false);
        });
    });
}

/**
 * Handler for gentex tool
 */
export async function handleGenTex(params: GenTexParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('gentex', params);

    let texturePath = params.src;

    // If URL, download to temp location
    if (params.src.startsWith('http://') || params.src.startsWith('https://')) {
        const tempDir = process.env.TEMP || '/tmp';
        const fileName = `gentex_${Date.now()}.png`;
        texturePath = path.join(tempDir, fileName);

        const success = await downloadImage(params.src, texturePath);
        if (!success) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ ok: 0, e: 'Download failed' }),
                }],
            };
        }
    }

    // Check if file exists
    if (!fs.existsSync(texturePath)) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 0, e: `File not found: ${texturePath}` }),
            }],
        };
    }

    // Send to Blender to apply texture
    const response = await blenderBridge.send('apply_texture', {
        object_name: params.n,
        texture_path: texturePath,
        uv_project: params.uv,
        tiling: params.tile,
    });

    if (response.success && response.data) {
        const d = response.data as { n: string; m: string; uv: number };
        // Compact: {ok:1,n:"Cube",m:"CubeMat",tex:"path"}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, n: d.n, m: d.m, tex: path.basename(texturePath) }),
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
