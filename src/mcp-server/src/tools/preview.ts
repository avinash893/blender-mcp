/**
 * Blender MCP Server - Preview Tool
 * Quick viewport capture for AI vision feedback
 * Token-optimized
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';
import * as path from 'path';
import * as os from 'os';

export const previewSchema = {
    angle: z.enum(['FRONT', 'BACK', 'LEFT', 'RIGHT', 'TOP', 'PERSPECTIVE']).default('PERSPECTIVE').describe('Camera angle'),
    focus_object: z.string().optional().describe('Object name to focus on'),
    resolution: z.number().default(512).describe('Image resolution (square)'),
};

export type PreviewParams = {
    angle: 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'TOP' | 'PERSPECTIVE';
    focus_object?: string;
    resolution: number;
};

// Camera positions for different angles
const CAMERA_ANGLES: Record<string, { location: number[]; rotation: number[] }> = {
    'FRONT': { location: [0, -10, 1], rotation: [1.5708, 0, 0] },
    'BACK': { location: [0, 10, 1], rotation: [1.5708, 0, 3.1416] },
    'LEFT': { location: [-10, 0, 1], rotation: [1.5708, 0, -1.5708] },
    'RIGHT': { location: [10, 0, 1], rotation: [1.5708, 0, 1.5708] },
    'TOP': { location: [0, 0, 10], rotation: [0, 0, 0] },
    'PERSPECTIVE': { location: [7, -7, 5], rotation: [1.0, 0, 0.785] },
};

/**
 * Handler for preview tool
 */
export async function handlePreview(params: PreviewParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('preview', params);

    const timestamp = Date.now();
    const outputPath = path.join(os.tmpdir(), `blender_preview_${timestamp}.png`);

    const angle = CAMERA_ANGLES[params.angle] || CAMERA_ANGLES['PERSPECTIVE'];

    const script = `
import bpy
import os

# Store original camera if exists
orig_cam = bpy.context.scene.camera

# Create temp camera
bpy.ops.object.camera_add(location=(${angle.location.join(', ')}), rotation=(${angle.rotation.join(', ')}))
cam = bpy.context.active_object
cam.name = "_preview_cam"
bpy.context.scene.camera = cam

# Focus on object if specified
focus_obj = ${params.focus_object ? `bpy.data.objects.get("${params.focus_object}")` : 'None'}
if focus_obj:
    # Point camera at object
    constraint = cam.constraints.new('TRACK_TO')
    constraint.target = focus_obj
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'
    
    # Adjust distance based on object size
    dims = focus_obj.dimensions
    max_dim = max(dims.x, dims.y, dims.z)
    if max_dim > 0:
        scale_factor = (max_dim * 2 + 3) / 7
        cam.location.x *= scale_factor
        cam.location.y *= scale_factor
        cam.location.z *= scale_factor

# Get scene info before render
objects = [obj.name for obj in bpy.context.scene.objects if obj.type == 'MESH']
object_count = len(objects)

# Setup render settings
bpy.context.scene.render.resolution_x = ${params.resolution}
bpy.context.scene.render.resolution_y = ${params.resolution}
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.context.scene.render.filepath = r"${outputPath.replace(/\\/g, '/')}"

# Quick render with EEVEE for speed
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'

# Render
bpy.ops.render.render(write_still=True)

# Cleanup temp camera
bpy.data.objects.remove(cam)

# Restore original camera
if orig_cam:
    bpy.context.scene.camera = orig_cam

# Get file size
file_size = os.path.getsize(r"${outputPath.replace(/\\/g, '/')}") // 1024

result = f"Preview rendered: {object_count} objects, {file_size}KB"
`;

    const response = await blenderBridge.send('run_script', { script });

    if (response.success) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    angle: params.angle,
                    focus: params.focus_object || 'scene',
                    resolution: params.resolution,
                    path: outputPath,
                    result: (response.data as any)?.output || 'Preview rendered',
                    // Instruction for AI
                    instruction: `To VIEW this preview, use Antigravity's view_file tool with path: ${outputPath}`,
                    hint: 'After viewing, you can revise the model using sculpt, blueprint, or run tools',
                }),
            }],
        };
    } else {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 0,
                    e: response.error || 'Preview failed',
                }),
            }],
        };
    }
}
