/**
 * Blender MCP Server - Export Tool
 * Token-optimized responses
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const exportModelSchema = {
    object_names: z.array(z.string()).optional().describe('Objects (empty=all)'),
    format: z.enum(['FBX', 'GLB', 'GLTF', 'OBJ']).default('GLB').describe('Format'),
    output_path: z.string().describe('Output path'),
    apply_modifiers: z.boolean().default(true).describe('Apply mods'),
    include_textures: z.boolean().default(true).describe('Inc textures'),
};

export type ExportModelParams = {
    object_names?: string[];
    format: 'FBX' | 'GLB' | 'GLTF' | 'OBJ';
    output_path: string;
    apply_modifiers: boolean;
    include_textures: boolean;
};

interface ExportResponseData {
    output_path: string;
    objects_count: number;
    file_size_kb?: number;
}

export async function handleExportModel(params: ExportModelParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('export', params);

    const ext = params.format.toLowerCase();
    const actualExt = params.output_path.split('.').pop()?.toLowerCase();

    if (actualExt !== ext && !(params.format === 'GLTF' && actualExt === 'gltf')) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 0, e: `Use .${ext} extension` }),
            }],
        };
    }

    const response = await blenderBridge.send('export_model', {
        object_names: params.object_names || [],
        format: params.format,
        output_path: params.output_path,
        apply_modifiers: params.apply_modifiers,
        include_textures: params.include_textures,
    });

    if (response.success && response.data) {
        const d = response.data as ExportResponseData;
        // Compact: {ok:1,p:"path.glb",f:"GLB",cnt:3,kb:120}
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ ok: 1, p: d.output_path, f: params.format, cnt: d.objects_count, kb: d.file_size_kb }),
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
