/**
 * Blender MCP Server - Sculpt Tool
 * AI-assisted mesh modification via LLM-generated bpy code
 * Token-optimized
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { blenderBridge } from '../bridge/client.js';

export const sculptSchema = {
    object_name: z.string().describe('Name of object to sculpt'),
    operation: z.string().describe('What to do: "make into head", "add horns", "make more muscular", etc.'),
    intensity: z.enum(['subtle', 'normal', 'extreme']).default('normal').describe('How much to modify'),
};

export type SculptParams = {
    object_name: string;
    operation: string;
    intensity: 'subtle' | 'normal' | 'extreme';
};

// Common sculpt operation templates
const OPERATION_TEMPLATES: Record<string, {
    keywords: string[];
    bpy_template: string;
    description: string;
}> = {
    'SUBDIVIDE': {
        keywords: ['smooth', 'detail', 'subdivide', 'refine', 'halus'],
        description: 'Add more vertices for detail',
        bpy_template: `
# Subdivide for more detail
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.subdivide(number_cuts=2)
bpy.ops.object.mode_set(mode='OBJECT')`,
    },
    'SPHERIFY': {
        keywords: ['round', 'sphere', 'bulat', 'ball', 'orb'],
        description: 'Make mesh more spherical',
        bpy_template: `
# Make more spherical
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.transform.tosphere(value=0.8)
bpy.ops.object.mode_set(mode='OBJECT')`,
    },
    'EXTRUDE_UP': {
        keywords: ['horn', 'spike', 'tanduk', 'point', 'tower', 'tall'],
        description: 'Extrude vertices upward',
        bpy_template: `
# Extrude top vertices upward
import bmesh
bm = bmesh.new()
bm.from_mesh(obj.data)
top_verts = [v for v in bm.verts if v.co.z > 0.5 * max(v.co.z for v in bm.verts)]
for v in top_verts:
    v.co.z += 0.5
bm.to_mesh(obj.data)
bm.free()`,
    },
    'PUSH_FORWARD': {
        keywords: ['nose', 'hidung', 'snout', 'beak', 'moncong', 'forward', 'front'],
        description: 'Push front vertices forward',
        bpy_template: `
# Push forward vertices
import bmesh
bm = bmesh.new()
bm.from_mesh(obj.data)
front_verts = [v for v in bm.verts if v.co.y > 0.3 * max(v.co.y for v in bm.verts)]
for v in front_verts:
    v.co.y += 0.3
bm.to_mesh(obj.data)
bm.free()`,
    },
    'INDENT': {
        keywords: ['eye', 'mata', 'socket', 'hole', 'indent', 'depression', 'cave'],
        description: 'Create indentation',
        bpy_template: `
# Create indentation (eye sockets, etc)
import bmesh
from mathutils import Vector
bm = bmesh.new()
bm.from_mesh(obj.data)
# Select vertices in eye region (upper front)
center_l = Vector((-0.25, 0.4, 0.3))
center_r = Vector((0.25, 0.4, 0.3))
for v in bm.verts:
    dist_l = (v.co - center_l).length
    dist_r = (v.co - center_r).length
    if dist_l < 0.15 or dist_r < 0.15:
        v.co.y -= 0.1
bm.to_mesh(obj.data)
bm.free()`,
    },
    'SCALE_BOTTOM': {
        keywords: ['base', 'bottom', 'foot', 'stand', 'wider', 'stable'],
        description: 'Scale bottom part wider',
        bpy_template: `
# Scale bottom vertices wider
import bmesh
bm = bmesh.new()
bm.from_mesh(obj.data)
min_z = min(v.co.z for v in bm.verts)
max_z = max(v.co.z for v in bm.verts)
for v in bm.verts:
    factor = 1.0 - (v.co.z - min_z) / (max_z - min_z)
    v.co.x *= 1.0 + factor * 0.5
    v.co.y *= 1.0 + factor * 0.5
bm.to_mesh(obj.data)
bm.free()`,
    },
    'STRETCH_HEIGHT': {
        keywords: ['tall', 'tinggi', 'stretch', 'elongate', 'higher'],
        description: 'Stretch mesh vertically',
        bpy_template: `
# Stretch height
obj.scale.z *= 1.5
bpy.ops.object.transform_apply(scale=True)`,
    },
    'FLATTEN_TOP': {
        keywords: ['flat', 'datar', 'plateau', 'table', 'cut'],
        description: 'Flatten top of mesh',
        bpy_template: `
# Flatten top vertices
import bmesh
bm = bmesh.new()
bm.from_mesh(obj.data)
max_z = max(v.co.z for v in bm.verts)
threshold = max_z * 0.8
for v in bm.verts:
    if v.co.z > threshold:
        v.co.z = threshold
bm.to_mesh(obj.data)
bm.free()`,
    },
    'PINCH_WAIST': {
        keywords: ['waist', 'pinggang', 'narrow', 'pinch', 'hourglass'],
        description: 'Narrow the middle section',
        bpy_template: `
# Pinch waist
import bmesh
bm = bmesh.new()
bm.from_mesh(obj.data)
min_z = min(v.co.z for v in bm.verts)
max_z = max(v.co.z for v in bm.verts)
mid_z = (min_z + max_z) / 2
for v in bm.verts:
    dist_from_mid = abs(v.co.z - mid_z) / ((max_z - min_z) / 2)
    scale = 0.6 + 0.4 * dist_from_mid
    v.co.x *= scale
    v.co.y *= scale
bm.to_mesh(obj.data)
bm.free()`,
    },
    'SMOOTH': {
        keywords: ['smooth', 'halus', 'soften', 'blur'],
        description: 'Smooth the mesh',
        bpy_template: `
# Smooth mesh
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.vertices_smooth(factor=0.5, repeat=3)
bpy.ops.object.mode_set(mode='OBJECT')`,
    },
    'NOISE': {
        keywords: ['rough', 'kasar', 'noise', 'bumpy', 'organic', 'rocky'],
        description: 'Add random displacement',
        bpy_template: `
# Add noise/roughness
import bmesh
import random
bm = bmesh.new()
bm.from_mesh(obj.data)
for v in bm.verts:
    v.co.x += random.uniform(-0.05, 0.05)
    v.co.y += random.uniform(-0.05, 0.05)
    v.co.z += random.uniform(-0.05, 0.05)
bm.to_mesh(obj.data)
bm.free()`,
    },
    'BEVEL_EDGES': {
        keywords: ['bevel', 'rounded edges', 'soft edges', 'chamfer'],
        description: 'Bevel sharp edges',
        bpy_template: `
# Add bevel modifier
bpy.ops.object.modifier_add(type='BEVEL')
obj.modifiers["Bevel"].width = 0.02
obj.modifiers["Bevel"].segments = 3`,
    },
};

// Intensity multipliers
const INTENSITY_MULT: Record<string, number> = {
    'subtle': 0.5,
    'normal': 1.0,
    'extreme': 2.0,
};

/**
 * Get mesh info from Blender
 */
async function getMeshInfo(objectName: string): Promise<{
    vertices: number;
    faces: number;
    bounds: { min: number[]; max: number[] };
} | null> {
    const script = `
import bpy
import json

obj = bpy.data.objects.get("${objectName}")
if obj and obj.type == 'MESH':
    mesh = obj.data
    verts = len(mesh.vertices)
    faces = len(mesh.polygons)
    
    # Get bounds
    min_co = [min(v.co[i] for v in mesh.vertices) for i in range(3)]
    max_co = [max(v.co[i] for v in mesh.vertices) for i in range(3)]
    
    result = json.dumps({
        "vertices": verts,
        "faces": faces,
        "bounds": {"min": min_co, "max": max_co}
    })
else:
    result = json.dumps({"error": "Object not found or not a mesh"})
`;

    const response = await blenderBridge.send('run_script', { script });
    if (response.success && response.data) {
        try {
            return JSON.parse((response.data as any).output || '{}');
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Find matching operations based on prompt
 */
function findMatchingOperations(operation: string): string[] {
    const op = operation.toLowerCase();
    const matches: string[] = [];

    for (const [key, template] of Object.entries(OPERATION_TEMPLATES)) {
        for (const keyword of template.keywords) {
            if (op.includes(keyword)) {
                matches.push(key);
                break;
            }
        }
    }

    return matches;
}

/**
 * Generate sculpt code
 */
function generateSculptCode(
    objectName: string,
    operations: string[],
    intensity: string,
    customPrompt: string
): string {
    const mult = INTENSITY_MULT[intensity] || 1.0;

    const lines: string[] = [
        'import bpy',
        'import bmesh',
        'import random',
        'from mathutils import Vector',
        '',
        `# Sculpt operations for ${objectName}`,
        `# Intensity: ${intensity}`,
        '',
        `obj = bpy.data.objects.get("${objectName}")`,
        'if obj and obj.type == "MESH":',
        '    bpy.context.view_layer.objects.active = obj',
        '    obj.select_set(True)',
        '',
    ];

    // Add matching operations
    for (const opKey of operations) {
        const template = OPERATION_TEMPLATES[opKey];
        if (template) {
            lines.push(`    # ${template.description}`);
            // Indent and add template code
            const templateLines = template.bpy_template.trim().split('\n');
            for (const line of templateLines) {
                lines.push(`    ${line}`);
            }
            lines.push('');
        }
    }

    // If no matching operations, add subdivide + smooth as default
    if (operations.length === 0) {
        lines.push('    # Default: Subdivide and smooth');
        lines.push('    bpy.ops.object.mode_set(mode="EDIT")');
        lines.push('    bpy.ops.mesh.select_all(action="SELECT")');
        lines.push('    bpy.ops.mesh.subdivide(number_cuts=1)');
        lines.push('    bpy.ops.mesh.vertices_smooth(factor=0.5)');
        lines.push('    bpy.ops.object.mode_set(mode="OBJECT")');
        lines.push('');
    }

    lines.push('    # Final smooth pass');
    lines.push('    bpy.ops.object.shade_smooth()');
    lines.push('');
    lines.push('    mesh = obj.data');
    lines.push('    result = f"Modified {obj.name}: {len(mesh.vertices)} verts, {len(mesh.polygons)} faces"');
    lines.push('else:');
    lines.push('    result = "Error: Object not found"');

    return lines.join('\n');
}

/**
 * Handler for sculpt tool
 */
export async function handleSculpt(params: SculptParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('sculpt', params);

    // Get object info first
    const meshInfo = await getMeshInfo(params.object_name);

    if (!meshInfo || 'error' in meshInfo) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 0,
                    e: `Object "${params.object_name}" not found or not a mesh`,
                }),
            }],
        };
    }

    // Find matching operations
    const matchedOps = findMatchingOperations(params.operation);

    // Generate sculpt code
    const code = generateSculptCode(
        params.object_name,
        matchedOps,
        params.intensity,
        params.operation
    );

    // Execute the code
    const response = await blenderBridge.send('run_script', { script: code });

    if (response.success) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 1,
                    n: params.object_name,
                    operation: params.operation,
                    intensity: params.intensity,
                    matched_ops: matchedOps.length > 0 ? matchedOps : ['DEFAULT'],
                    before: {
                        verts: meshInfo.vertices,
                        faces: meshInfo.faces,
                    },
                    result: (response.data as any)?.output || 'Modified',
                    hint: matchedOps.length === 0
                        ? 'No specific operation matched. Applied default subdivide + smooth. Try keywords: smooth, horn, nose, eye, stretch, pinch, bevel'
                        : undefined,
                }),
            }],
        };
    } else {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 0,
                    e: response.error || 'Sculpt operation failed',
                }),
            }],
        };
    }
}
