/**
 * Blender MCP Server - Blueprint Tool
 * Provides structural breakdown for complex models
 * AI follows this structure instead of guessing
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';

export const blueprintSchema = {
    model_type: z.string().describe('Type: BUILDING, WEAPON, VEHICLE, ROBOT, or CUSTOM'),
    style: z.string().optional().describe('Style: CYBERPUNK, MEDIEVAL, SCIFI, MODERN, FANTASY'),
    detail_level: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM').describe('Detail level'),
    description: z.string().optional().describe('For CUSTOM type: describe what to create (e.g., "dragon with wings and tail")'),
};

export type BlueprintParams = {
    model_type: string;
    style?: string;
    detail_level: 'LOW' | 'MEDIUM' | 'HIGH';
    description?: string;
};

interface ComponentSpec {
    name: string;
    mesh_type: string;          // CUBE, CYLINDER, PLANE, etc.
    relative_size: number[];    // [x, y, z] relative scale
    relative_pos: number[];     // [x, y, z] relative position
    material?: string;          // Material preset
    color?: number[];           // RGB color
    optional?: boolean;         // Can be skipped for LOW detail
    children?: ComponentSpec[]; // Sub-components
}

interface Blueprint {
    name: string;
    category: string;
    components: ComponentSpec[];
    assembly_order: string[];
    style_modifiers?: Record<string, {
        materials?: Record<string, string>;
        extra_components?: ComponentSpec[];
        color_palette?: number[][];
    }>;
    optimization_hints?: {
        target_verts: number;
        can_join: boolean;
        bevel_width: number;
    };
}

// Blueprint database
const BLUEPRINTS: Record<string, Blueprint> = {
    'BUILDING': {
        name: 'Building',
        category: 'ARCHITECTURE',
        components: [
            {
                name: 'foundation',
                mesh_type: 'CUBE',
                relative_size: [1.2, 1.2, 0.1],
                relative_pos: [0, 0, -0.05],
                material: 'STONE',
                color: [0.3, 0.3, 0.3],
            },
            {
                name: 'main_body',
                mesh_type: 'CUBE',
                relative_size: [1, 1, 2],
                relative_pos: [0, 0, 1],
                material: 'MATTE',
                color: [0.5, 0.5, 0.5],
            },
            {
                name: 'floor_1',
                mesh_type: 'PLANE',
                relative_size: [0.95, 0.95, 1],
                relative_pos: [0, 0, 0.5],
                children: [
                    { name: 'window_f1_1', mesh_type: 'CUBE', relative_size: [0.15, 0.02, 0.2], relative_pos: [-0.3, 0.5, 0], material: 'GLASS' },
                    { name: 'window_f1_2', mesh_type: 'CUBE', relative_size: [0.15, 0.02, 0.2], relative_pos: [0, 0.5, 0], material: 'GLASS' },
                    { name: 'window_f1_3', mesh_type: 'CUBE', relative_size: [0.15, 0.02, 0.2], relative_pos: [0.3, 0.5, 0], material: 'GLASS' },
                ],
            },
            {
                name: 'floor_2',
                mesh_type: 'PLANE',
                relative_size: [0.95, 0.95, 1],
                relative_pos: [0, 0, 1.2],
                optional: true,
                children: [
                    { name: 'window_f2_1', mesh_type: 'CUBE', relative_size: [0.15, 0.02, 0.2], relative_pos: [-0.3, 0.5, 0], material: 'GLASS' },
                    { name: 'window_f2_2', mesh_type: 'CUBE', relative_size: [0.15, 0.02, 0.2], relative_pos: [0, 0.5, 0], material: 'GLASS' },
                    { name: 'window_f2_3', mesh_type: 'CUBE', relative_size: [0.15, 0.02, 0.2], relative_pos: [0.3, 0.5, 0], material: 'GLASS' },
                ],
            },
            {
                name: 'roof',
                mesh_type: 'CUBE',
                relative_size: [1.1, 1.1, 0.15],
                relative_pos: [0, 0, 2.1],
                material: 'MATTE',
                color: [0.2, 0.2, 0.25],
            },
            {
                name: 'door',
                mesh_type: 'CUBE',
                relative_size: [0.2, 0.05, 0.35],
                relative_pos: [0, 0.5, 0.175],
                material: 'WOOD',
                color: [0.3, 0.2, 0.1],
            },
        ],
        assembly_order: ['foundation', 'main_body', 'floor_1', 'floor_2', 'roof', 'door'],
        style_modifiers: {
            'CYBERPUNK': {
                materials: {
                    'main_body': 'METAL',
                    'roof': 'METAL',
                },
                extra_components: [
                    { name: 'neon_sign_1', mesh_type: 'CUBE', relative_size: [0.3, 0.02, 0.08], relative_pos: [-0.4, 0.51, 1.5], material: 'GLOW', color: [0, 1, 1] },
                    { name: 'neon_sign_2', mesh_type: 'CUBE', relative_size: [0.2, 0.02, 0.05], relative_pos: [0.3, 0.51, 1.8], material: 'GLOW', color: [1, 0, 1] },
                    { name: 'pipe_1', mesh_type: 'CYLINDER', relative_size: [0.03, 0.03, 1], relative_pos: [0.45, 0.45, 1], material: 'METAL', color: [0.4, 0.4, 0.4] },
                    { name: 'pipe_2', mesh_type: 'CYLINDER', relative_size: [0.03, 0.03, 0.8], relative_pos: [-0.45, 0.45, 1.2], material: 'METAL', color: [0.4, 0.4, 0.4] },
                    { name: 'ac_unit', mesh_type: 'CUBE', relative_size: [0.25, 0.15, 0.2], relative_pos: [0.35, 0.4, 0.6], material: 'METAL', color: [0.6, 0.6, 0.6] },
                    { name: 'antenna', mesh_type: 'CYLINDER', relative_size: [0.01, 0.01, 0.4], relative_pos: [0.3, 0, 2.4], material: 'METAL' },
                    { name: 'vent', mesh_type: 'CUBE', relative_size: [0.15, 0.15, 0.1], relative_pos: [-0.3, 0, 2.2], material: 'METAL', color: [0.3, 0.3, 0.35] },
                ],
                color_palette: [
                    [0.1, 0.1, 0.15],   // Dark base
                    [0.2, 0.2, 0.25],   // Medium gray
                    [0, 1, 1],          // Cyan neon
                    [1, 0, 1],          // Magenta neon
                    [1, 0.5, 0],        // Orange accent
                ],
            },
            'MEDIEVAL': {
                materials: {
                    'main_body': 'STONE',
                    'roof': 'WOOD',
                },
                extra_components: [
                    { name: 'chimney', mesh_type: 'CUBE', relative_size: [0.15, 0.15, 0.4], relative_pos: [0.3, 0, 2.3], material: 'STONE', color: [0.4, 0.35, 0.3] },
                    { name: 'torch_1', mesh_type: 'CYLINDER', relative_size: [0.02, 0.02, 0.15], relative_pos: [-0.35, 0.51, 1], material: 'WOOD' },
                    { name: 'torch_flame', mesh_type: 'SPHERE', relative_size: [0.05, 0.05, 0.08], relative_pos: [-0.35, 0.51, 1.1], material: 'GLOW', color: [1, 0.5, 0] },
                ],
                color_palette: [
                    [0.4, 0.35, 0.3],   // Stone
                    [0.3, 0.2, 0.1],    // Wood
                    [0.5, 0.45, 0.4],   // Light stone
                ],
            },
            'SCIFI': {
                materials: {
                    'main_body': 'METAL',
                    'foundation': 'METAL',
                },
                extra_components: [
                    { name: 'light_strip_1', mesh_type: 'CUBE', relative_size: [0.9, 0.02, 0.02], relative_pos: [0, 0.51, 0.3], material: 'GLOW', color: [0, 0.5, 1] },
                    { name: 'light_strip_2', mesh_type: 'CUBE', relative_size: [0.9, 0.02, 0.02], relative_pos: [0, 0.51, 1], material: 'GLOW', color: [0, 0.5, 1] },
                    { name: 'dish', mesh_type: 'SPHERE', relative_size: [0.2, 0.2, 0.1], relative_pos: [0, 0, 2.3], material: 'METAL' },
                ],
                color_palette: [
                    [0.8, 0.8, 0.85],   // White metal
                    [0.2, 0.2, 0.25],   // Dark accent
                    [0, 0.5, 1],        // Blue glow
                ],
            },
        },
        optimization_hints: {
            target_verts: 500,
            can_join: true,
            bevel_width: 0.01,
        },
    },

    'WEAPON': {
        name: 'Weapon',
        category: 'PROPS',
        components: [
            {
                name: 'receiver',
                mesh_type: 'CUBE',
                relative_size: [0.15, 1.0, 0.12],
                relative_pos: [0, 0, 0],
                material: 'METAL',
                color: [0.15, 0.15, 0.15],
            },
            {
                name: 'barrel',
                mesh_type: 'CYLINDER',
                relative_size: [0.025, 0.025, 1.2],
                relative_pos: [0, 0.9, 0.02],
                material: 'METAL',
                color: [0.2, 0.2, 0.2],
            },
            {
                name: 'stock',
                mesh_type: 'CUBE',
                relative_size: [0.08, 0.45, 0.13],
                relative_pos: [0, -0.5, -0.02],
                material: 'WOOD',
                color: [0.3, 0.2, 0.1],
            },
            {
                name: 'grip',
                mesh_type: 'CUBE',
                relative_size: [0.06, 0.08, 0.12],
                relative_pos: [0, -0.1, -0.12],
                material: 'PLASTIC',
                color: [0.1, 0.1, 0.1],
            },
            {
                name: 'trigger_guard',
                mesh_type: 'TORUS',
                relative_size: [0.04, 0.04, 0.02],
                relative_pos: [0, 0, -0.08],
                material: 'METAL',
            },
            {
                name: 'magazine',
                mesh_type: 'CUBE',
                relative_size: [0.05, 0.12, 0.18],
                relative_pos: [0, 0.1, -0.15],
                material: 'METAL',
                color: [0.12, 0.12, 0.12],
            },
            {
                name: 'scope',
                mesh_type: 'CYLINDER',
                relative_size: [0.035, 0.035, 0.25],
                relative_pos: [0, 0.1, 0.095],  // Fixed: Z = receiver height/2 + scope radius
                material: 'METAL',
                color: [0.1, 0.1, 0.1],
                optional: true,
            },
            {
                name: 'scope_lens_front',
                mesh_type: 'CYLINDER',
                relative_size: [0.03, 0.03, 0.01],
                relative_pos: [0, 0.23, 0.095],  // Fixed: same Z as scope, Y adjusted for length
                material: 'GLASS',
                color: [0.2, 0.3, 0.8],
                optional: true,
            },
        ],
        assembly_order: ['receiver', 'barrel', 'stock', 'grip', 'trigger_guard', 'magazine', 'scope', 'scope_lens_front'],
        optimization_hints: {
            target_verts: 300,
            can_join: true,
            bevel_width: 0.003,
        },
    },

    'VEHICLE': {
        name: 'Vehicle',
        category: 'VEHICLES',
        components: [
            {
                name: 'body',
                mesh_type: 'CUBE',
                relative_size: [1.8, 4.0, 0.8],
                relative_pos: [0, 0, 0.5],
                material: 'METAL',
                color: [0.8, 0.1, 0.1],
            },
            {
                name: 'cabin',
                mesh_type: 'CUBE',
                relative_size: [1.6, 1.8, 0.7],
                relative_pos: [0, 0.3, 1.1],
                material: 'METAL',
                color: [0.7, 0.1, 0.1],
            },
            {
                name: 'windshield',
                mesh_type: 'CUBE',
                relative_size: [1.5, 0.05, 0.6],
                relative_pos: [0, 1.1, 1.1],
                material: 'GLASS',
                color: [0.2, 0.3, 0.4],
            },
            {
                name: 'wheel_fl',
                mesh_type: 'CYLINDER',
                relative_size: [0.35, 0.35, 0.2],
                relative_pos: [-0.9, 1.2, 0.35],
                material: 'PLASTIC',
                color: [0.05, 0.05, 0.05],
            },
            {
                name: 'wheel_fr',
                mesh_type: 'CYLINDER',
                relative_size: [0.35, 0.35, 0.2],
                relative_pos: [0.9, 1.2, 0.35],
                material: 'PLASTIC',
                color: [0.05, 0.05, 0.05],
            },
            {
                name: 'wheel_rl',
                mesh_type: 'CYLINDER',
                relative_size: [0.35, 0.35, 0.2],
                relative_pos: [-0.9, -1.2, 0.35],
                material: 'PLASTIC',
                color: [0.05, 0.05, 0.05],
            },
            {
                name: 'wheel_rr',
                mesh_type: 'CYLINDER',
                relative_size: [0.35, 0.35, 0.2],
                relative_pos: [0.9, -1.2, 0.35],
                material: 'PLASTIC',
                color: [0.05, 0.05, 0.05],
            },
            {
                name: 'headlight_l',
                mesh_type: 'SPHERE',
                relative_size: [0.15, 0.1, 0.1],
                relative_pos: [-0.6, 2.0, 0.6],
                material: 'GLOW',
                color: [1, 1, 0.9],
            },
            {
                name: 'headlight_r',
                mesh_type: 'SPHERE',
                relative_size: [0.15, 0.1, 0.1],
                relative_pos: [0.6, 2.0, 0.6],
                material: 'GLOW',
                color: [1, 1, 0.9],
            },
        ],
        assembly_order: ['body', 'cabin', 'windshield', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'headlight_l', 'headlight_r'],
        style_modifiers: {
            'CYBERPUNK': {
                extra_components: [
                    { name: 'neon_underglow', mesh_type: 'CUBE', relative_size: [1.7, 3.8, 0.02], relative_pos: [0, 0, 0.05], material: 'GLOW', color: [0, 1, 1] },
                    { name: 'spoiler', mesh_type: 'CUBE', relative_size: [1.6, 0.3, 0.1], relative_pos: [0, -1.9, 1.2], material: 'METAL', color: [0.1, 0.1, 0.1] },
                ],
            },
        },
        optimization_hints: {
            target_verts: 800,
            can_join: false,
            bevel_width: 0.02,
        },
    },

    'ROBOT': {
        name: 'Robot',
        category: 'CHARACTER',
        components: [
            {
                name: 'torso',
                mesh_type: 'CUBE',
                relative_size: [0.6, 0.3, 0.8],
                relative_pos: [0, 0, 1.2],
                material: 'METAL',
                color: [0.7, 0.7, 0.75],
            },
            {
                name: 'head',
                mesh_type: 'CUBE',
                relative_size: [0.35, 0.3, 0.35],
                relative_pos: [0, 0, 1.8],
                material: 'METAL',
                color: [0.6, 0.6, 0.65],
            },
            {
                name: 'eye_l',
                mesh_type: 'SPHERE',
                relative_size: [0.06, 0.06, 0.06],
                relative_pos: [-0.1, 0.15, 1.85],
                material: 'GLOW',
                color: [0, 0.8, 1],
            },
            {
                name: 'eye_r',
                mesh_type: 'SPHERE',
                relative_size: [0.06, 0.06, 0.06],
                relative_pos: [0.1, 0.15, 1.85],
                material: 'GLOW',
                color: [0, 0.8, 1],
            },
            {
                name: 'arm_l',
                mesh_type: 'CYLINDER',
                relative_size: [0.08, 0.08, 0.5],
                relative_pos: [-0.45, 0, 1.3],
                material: 'METAL',
            },
            {
                name: 'arm_r',
                mesh_type: 'CYLINDER',
                relative_size: [0.08, 0.08, 0.5],
                relative_pos: [0.45, 0, 1.3],
                material: 'METAL',
            },
            {
                name: 'leg_l',
                mesh_type: 'CYLINDER',
                relative_size: [0.1, 0.1, 0.6],
                relative_pos: [-0.15, 0, 0.4],
                material: 'METAL',
            },
            {
                name: 'leg_r',
                mesh_type: 'CYLINDER',
                relative_size: [0.1, 0.1, 0.6],
                relative_pos: [0.15, 0, 0.4],
                material: 'METAL',
            },
            {
                name: 'foot_l',
                mesh_type: 'CUBE',
                relative_size: [0.15, 0.25, 0.05],
                relative_pos: [-0.15, 0.05, 0.05],
                material: 'METAL',
            },
            {
                name: 'foot_r',
                mesh_type: 'CUBE',
                relative_size: [0.15, 0.25, 0.05],
                relative_pos: [0.15, 0.05, 0.05],
                material: 'METAL',
            },
        ],
        assembly_order: ['torso', 'head', 'eye_l', 'eye_r', 'arm_l', 'arm_r', 'leg_l', 'leg_r', 'foot_l', 'foot_r'],
        optimization_hints: {
            target_verts: 400,
            can_join: false,
            bevel_width: 0.01,
        },
    },
};

/**
 * Generate Python code from blueprint
 */
function generateCodeFromBlueprint(
    blueprint: Blueprint,
    style: string | undefined,
    detailLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    baseSize: number = 2
): string {
    const lines: string[] = [
        'import bpy',
        'from mathutils import Vector',
        '',
        '# Clear selection',
        'bpy.ops.object.select_all(action=\'DESELECT\')',
        '',
        '# Store created objects',
        'created_objects = []',
        '',
    ];

    // Add style-specific components
    let allComponents = [...blueprint.components];
    const styleModifier = style ? blueprint.style_modifiers?.[style.toUpperCase()] : undefined;

    if (styleModifier?.extra_components) {
        allComponents = [...allComponents, ...styleModifier.extra_components];
    }

    // Filter by detail level
    if (detailLevel === 'LOW') {
        allComponents = allComponents.filter(c => !c.optional);
    }

    // Generate code for each component
    for (const comp of allComponents) {
        const size = comp.relative_size.map(s => s * baseSize);
        const pos = comp.relative_pos.map(p => p * baseSize);

        // Apply style color override
        let color = comp.color || [0.5, 0.5, 0.5];
        let material = comp.material || 'MATTE';

        if (styleModifier?.materials?.[comp.name]) {
            material = styleModifier.materials[comp.name];
        }

        lines.push(`# --- ${comp.name} ---`);

        switch (comp.mesh_type) {
            case 'CUBE':
                lines.push(`bpy.ops.mesh.primitive_cube_add(size=1, location=(${pos[0]}, ${pos[1]}, ${pos[2]}))`);
                lines.push(`obj = bpy.context.active_object`);
                lines.push(`obj.scale = (${size[0]}, ${size[1]}, ${size[2]})`);
                break;
            case 'CYLINDER':
                lines.push(`bpy.ops.mesh.primitive_cylinder_add(radius=${size[0]}, depth=${size[2]}, location=(${pos[0]}, ${pos[1]}, ${pos[2]}))`);
                lines.push(`obj = bpy.context.active_object`);
                break;
            case 'SPHERE':
                lines.push(`bpy.ops.mesh.primitive_uv_sphere_add(radius=${size[0]}, location=(${pos[0]}, ${pos[1]}, ${pos[2]}))`);
                lines.push(`obj = bpy.context.active_object`);
                break;
            case 'PLANE':
                lines.push(`bpy.ops.mesh.primitive_plane_add(size=${size[0] * 2}, location=(${pos[0]}, ${pos[1]}, ${pos[2]}))`);
                lines.push(`obj = bpy.context.active_object`);
                break;
            case 'TORUS':
                lines.push(`bpy.ops.mesh.primitive_torus_add(major_radius=${size[0]}, minor_radius=${size[0] / 4}, location=(${pos[0]}, ${pos[1]}, ${pos[2]}))`);
                lines.push(`obj = bpy.context.active_object`);
                break;
            default:
                lines.push(`bpy.ops.mesh.primitive_cube_add(size=1, location=(${pos[0]}, ${pos[1]}, ${pos[2]}))`);
                lines.push(`obj = bpy.context.active_object`);
        }

        lines.push(`obj.name = "${comp.name}"`);
        lines.push(`bpy.ops.object.transform_apply(scale=True)`);
        // Unity guideline: always smooth-shade and bevel every component
        lines.push(`bpy.ops.object.shade_smooth()`);

        // Material
        lines.push(`mat = bpy.data.materials.new("${comp.name}_mat")`);
        lines.push(`mat.use_nodes = True`);
        lines.push(`bsdf = mat.node_tree.nodes["Principled BSDF"]`);
        lines.push(`bsdf.inputs["Base Color"].default_value = (${color[0]}, ${color[1]}, ${color[2]}, 1)`);

        // Unity-friendly material values: low metallic, high roughness
        switch (material) {
            case 'METAL':
                // NOT hyper-glossy — muted worn metal for game assets
                lines.push(`bsdf.inputs["Metallic"].default_value = 0.15`);
                lines.push(`bsdf.inputs["Roughness"].default_value = 0.55`);
                break;
            case 'GLASS':
                lines.push(`bsdf.inputs["Metallic"].default_value = 0.0`);
                lines.push(`bsdf.inputs["Roughness"].default_value = 0.08`);
                lines.push(`bsdf.inputs["Transmission Weight"].default_value = 0.9`);
                break;
            case 'GLOW':
                lines.push(`bsdf.inputs["Emission Strength"].default_value = 5.0`);
                lines.push(`bsdf.inputs["Emission Color"].default_value = (${color[0]}, ${color[1]}, ${color[2]}, 1)`);
                break;
            case 'PLASTIC':
                lines.push(`bsdf.inputs["Metallic"].default_value = 0.0`);
                lines.push(`bsdf.inputs["Roughness"].default_value = 0.50`);
                break;
            case 'WOOD':
                lines.push(`bsdf.inputs["Metallic"].default_value = 0.0`);
                lines.push(`bsdf.inputs["Roughness"].default_value = 0.65`);
                break;
            case 'STONE':
                lines.push(`bsdf.inputs["Metallic"].default_value = 0.0`);
                lines.push(`bsdf.inputs["Roughness"].default_value = 0.82`);
                break;
            default:
                // MATTE default
                lines.push(`bsdf.inputs["Metallic"].default_value = 0.0`);
                lines.push(`bsdf.inputs["Roughness"].default_value = 0.75`);
        }

        lines.push(`obj.data.materials.append(mat)`);
        lines.push(`created_objects.append(obj)`);
        lines.push('');
    }

    // Add bevel to all created objects for smooth edges
    lines.push('# Apply bevel to all components for Unity-ready smooth edges');
    lines.push('import math as _math');
    lines.push('for _obj in created_objects:');
    lines.push('    bpy.context.view_layer.objects.active = _obj');
    lines.push('    _obj.select_set(True)');
    lines.push('    _bev = _obj.modifiers.new(name="Bevel", type=\'BEVEL\')');
    lines.push('    _bev.width = 0.01');
    lines.push('    _bev.segments = 3');
    lines.push('    _bev.limit_method = \'ANGLE\'');
    lines.push('    _bev.angle_limit = _math.radians(30)');
    lines.push('    _obj.select_set(False)');
    lines.push('');

    // Optional: Join all objects
    if (blueprint.optimization_hints?.can_join && detailLevel !== 'HIGH') {
        lines.push('# Join all objects');
        lines.push('bpy.ops.object.select_all(action=\'DESELECT\')');
        lines.push('for obj in created_objects:');
        lines.push('    obj.select_set(True)');
        lines.push('bpy.context.view_layer.objects.active = created_objects[0]');
        lines.push('bpy.ops.object.join()');
        lines.push('final_obj = bpy.context.active_object');
        lines.push(`final_obj.name = "${blueprint.name}_${style || 'default'}"`);

        // Add bevel
        if (blueprint.optimization_hints?.bevel_width) {
            lines.push('bpy.ops.object.modifier_add(type=\'BEVEL\')');
            lines.push(`final_obj.modifiers["Bevel"].width = ${blueprint.optimization_hints.bevel_width}`);
            lines.push('final_obj.modifiers["Bevel"].segments = 2');
        }

        lines.push('');
        lines.push(`result = f"Created {final_obj.name} with {len(final_obj.data.vertices)} vertices"`);
    } else {
        lines.push(`result = f"Created ${allComponents.length} components for ${blueprint.name}"`);
    }

    return lines.join('\n');
}

/**
 * DYNAMIC BLUEPRINT GENERATOR
 * Generates structure for custom/unknown model types based on description
 */
interface DynamicPattern {
    keywords: string[];
    category: string;
    baseComponents: ComponentSpec[];
    suggestedMaterial: string;
}

const DYNAMIC_PATTERNS: DynamicPattern[] = [
    // Creatures - Quadruped
    {
        keywords: ['dog', 'cat', 'wolf', 'fox', 'horse', 'deer', 'lion', 'tiger', 'bear', 'anjing', 'kucing', 'kuda'],
        category: 'QUADRUPED',
        suggestedMaterial: 'MATTE',
        baseComponents: [
            { name: 'body', mesh_type: 'SPHERE', relative_size: [0.5, 1.0, 0.4], relative_pos: [0, 0, 0.5], material: 'MATTE', color: [0.5, 0.4, 0.3] },
            { name: 'head', mesh_type: 'SPHERE', relative_size: [0.25, 0.3, 0.25], relative_pos: [0, 0.7, 0.6], material: 'MATTE', color: [0.5, 0.4, 0.3] },
            { name: 'snout', mesh_type: 'CUBE', relative_size: [0.1, 0.15, 0.08], relative_pos: [0, 0.9, 0.55], material: 'MATTE', color: [0.4, 0.3, 0.25] },
            { name: 'ear_l', mesh_type: 'CONE', relative_size: [0.06, 0.06, 0.12], relative_pos: [-0.1, 0.65, 0.8], material: 'MATTE' },
            { name: 'ear_r', mesh_type: 'CONE', relative_size: [0.06, 0.06, 0.12], relative_pos: [0.1, 0.65, 0.8], material: 'MATTE' },
            { name: 'leg_fl', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.35], relative_pos: [-0.2, 0.35, 0.18], material: 'MATTE' },
            { name: 'leg_fr', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.35], relative_pos: [0.2, 0.35, 0.18], material: 'MATTE' },
            { name: 'leg_bl', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.35], relative_pos: [-0.2, -0.35, 0.18], material: 'MATTE' },
            { name: 'leg_br', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.35], relative_pos: [0.2, -0.35, 0.18], material: 'MATTE' },
            { name: 'tail', mesh_type: 'CYLINDER', relative_size: [0.04, 0.04, 0.3], relative_pos: [0, -0.6, 0.55], material: 'MATTE' },
        ],
    },
    // Creatures - Dragon/Flying
    {
        keywords: ['dragon', 'naga', 'wyvern', 'bird', 'eagle', 'burung', 'phoenix', 'griffin'],
        category: 'WINGED_CREATURE',
        suggestedMaterial: 'MATTE',
        baseComponents: [
            { name: 'body', mesh_type: 'SPHERE', relative_size: [0.4, 1.2, 0.35], relative_pos: [0, 0, 0.5], material: 'MATTE', color: [0.2, 0.5, 0.2] },
            { name: 'head', mesh_type: 'SPHERE', relative_size: [0.2, 0.25, 0.2], relative_pos: [0, 0.8, 0.7], material: 'MATTE', color: [0.2, 0.5, 0.2] },
            { name: 'neck', mesh_type: 'CYLINDER', relative_size: [0.08, 0.08, 0.3], relative_pos: [0, 0.55, 0.6], material: 'MATTE' },
            { name: 'snout', mesh_type: 'CONE', relative_size: [0.08, 0.15, 0.08], relative_pos: [0, 1.0, 0.65], material: 'MATTE' },
            { name: 'horn_l', mesh_type: 'CONE', relative_size: [0.03, 0.03, 0.15], relative_pos: [-0.08, 0.75, 0.85], material: 'MATTE', color: [0.3, 0.3, 0.2] },
            { name: 'horn_r', mesh_type: 'CONE', relative_size: [0.03, 0.03, 0.15], relative_pos: [0.08, 0.75, 0.85], material: 'MATTE', color: [0.3, 0.3, 0.2] },
            { name: 'wing_l', mesh_type: 'PLANE', relative_size: [0.8, 0.5, 0.02], relative_pos: [-0.6, 0.1, 0.6], material: 'MATTE', color: [0.15, 0.4, 0.15] },
            { name: 'wing_r', mesh_type: 'PLANE', relative_size: [0.8, 0.5, 0.02], relative_pos: [0.6, 0.1, 0.6], material: 'MATTE', color: [0.15, 0.4, 0.15] },
            { name: 'leg_l', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.25], relative_pos: [-0.15, -0.1, 0.2], material: 'MATTE' },
            { name: 'leg_r', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.25], relative_pos: [0.15, -0.1, 0.2], material: 'MATTE' },
            { name: 'tail', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.8], relative_pos: [0, -0.9, 0.4], material: 'MATTE' },
            { name: 'tail_tip', mesh_type: 'CONE', relative_size: [0.1, 0.15, 0.08], relative_pos: [0, -1.3, 0.35], material: 'MATTE', color: [0.3, 0.2, 0.1] },
        ],
    },
    // Creatures - Humanoid/Character
    {
        keywords: ['human', 'character', 'person', 'man', 'woman', 'orc', 'elf', 'dwarf', 'manusia', 'karakter', 'zombie', 'skeleton'],
        category: 'HUMANOID',
        suggestedMaterial: 'MATTE',
        baseComponents: [
            { name: 'torso', mesh_type: 'CUBE', relative_size: [0.4, 0.25, 0.6], relative_pos: [0, 0, 1.0], material: 'MATTE', color: [0.7, 0.6, 0.5] },
            { name: 'hip', mesh_type: 'CUBE', relative_size: [0.35, 0.2, 0.2], relative_pos: [0, 0, 0.7], material: 'MATTE', color: [0.3, 0.3, 0.5] },
            { name: 'head', mesh_type: 'SPHERE', relative_size: [0.18, 0.2, 0.22], relative_pos: [0, 0, 1.5], material: 'MATTE', color: [0.8, 0.7, 0.6] },
            { name: 'neck', mesh_type: 'CYLINDER', relative_size: [0.06, 0.06, 0.1], relative_pos: [0, 0, 1.35], material: 'MATTE' },
            { name: 'arm_l', mesh_type: 'CYLINDER', relative_size: [0.05, 0.05, 0.35], relative_pos: [-0.3, 0, 1.1], material: 'MATTE' },
            { name: 'arm_r', mesh_type: 'CYLINDER', relative_size: [0.05, 0.05, 0.35], relative_pos: [0.3, 0, 1.1], material: 'MATTE' },
            { name: 'hand_l', mesh_type: 'SPHERE', relative_size: [0.05, 0.05, 0.05], relative_pos: [-0.3, 0, 0.75], material: 'MATTE' },
            { name: 'hand_r', mesh_type: 'SPHERE', relative_size: [0.05, 0.05, 0.05], relative_pos: [0.3, 0, 0.75], material: 'MATTE' },
            { name: 'leg_l', mesh_type: 'CYLINDER', relative_size: [0.07, 0.07, 0.4], relative_pos: [-0.1, 0, 0.3], material: 'MATTE', color: [0.3, 0.3, 0.5] },
            { name: 'leg_r', mesh_type: 'CYLINDER', relative_size: [0.07, 0.07, 0.4], relative_pos: [0.1, 0, 0.3], material: 'MATTE', color: [0.3, 0.3, 0.5] },
            { name: 'foot_l', mesh_type: 'CUBE', relative_size: [0.08, 0.15, 0.04], relative_pos: [-0.1, 0.03, 0.02], material: 'MATTE' },
            { name: 'foot_r', mesh_type: 'CUBE', relative_size: [0.08, 0.15, 0.04], relative_pos: [0.1, 0.03, 0.02], material: 'MATTE' },
        ],
    },
    // Objects - Furniture
    {
        keywords: ['chair', 'kursi', 'sofa', 'couch', 'bench', 'bangku', 'stool'],
        category: 'SEATING',
        suggestedMaterial: 'WOOD',
        baseComponents: [
            { name: 'seat', mesh_type: 'CUBE', relative_size: [0.5, 0.5, 0.08], relative_pos: [0, 0, 0.45], material: 'WOOD', color: [0.4, 0.3, 0.2] },
            { name: 'backrest', mesh_type: 'CUBE', relative_size: [0.5, 0.08, 0.5], relative_pos: [0, -0.22, 0.75], material: 'WOOD', color: [0.4, 0.3, 0.2] },
            { name: 'leg_fl', mesh_type: 'CYLINDER', relative_size: [0.03, 0.03, 0.4], relative_pos: [-0.2, 0.2, 0.2], material: 'WOOD' },
            { name: 'leg_fr', mesh_type: 'CYLINDER', relative_size: [0.03, 0.03, 0.4], relative_pos: [0.2, 0.2, 0.2], material: 'WOOD' },
            { name: 'leg_bl', mesh_type: 'CYLINDER', relative_size: [0.03, 0.03, 0.4], relative_pos: [-0.2, -0.2, 0.2], material: 'WOOD' },
            { name: 'leg_br', mesh_type: 'CYLINDER', relative_size: [0.03, 0.03, 0.4], relative_pos: [0.2, -0.2, 0.2], material: 'WOOD' },
        ],
    },
    // Objects - Container
    {
        keywords: ['box', 'chest', 'crate', 'container', 'kotak', 'peti', 'barrel', 'tong'],
        category: 'CONTAINER',
        suggestedMaterial: 'WOOD',
        baseComponents: [
            { name: 'body', mesh_type: 'CUBE', relative_size: [0.6, 0.4, 0.4], relative_pos: [0, 0, 0.2], material: 'WOOD', color: [0.4, 0.3, 0.2] },
            { name: 'lid', mesh_type: 'CUBE', relative_size: [0.65, 0.45, 0.05], relative_pos: [0, 0, 0.42], material: 'WOOD', color: [0.45, 0.35, 0.25] },
            { name: 'handle', mesh_type: 'TORUS', relative_size: [0.08, 0.08, 0.03], relative_pos: [0, 0.22, 0.42], material: 'METAL', color: [0.6, 0.5, 0.3] },
            { name: 'lock', mesh_type: 'CUBE', relative_size: [0.06, 0.03, 0.08], relative_pos: [0, 0.21, 0.3], material: 'METAL', color: [0.6, 0.5, 0.3] },
        ],
    },
    // Objects - Weapon/Tool
    {
        keywords: ['sword', 'pedang', 'axe', 'kapak', 'hammer', 'palu', 'spear', 'tombak', 'shield', 'perisai', 'staff', 'tongkat'],
        category: 'MELEE_WEAPON',
        suggestedMaterial: 'METAL',
        baseComponents: [
            { name: 'blade', mesh_type: 'CUBE', relative_size: [0.08, 0.02, 0.8], relative_pos: [0, 0, 0.6], material: 'METAL', color: [0.7, 0.7, 0.75] },
            { name: 'guard', mesh_type: 'CUBE', relative_size: [0.2, 0.03, 0.04], relative_pos: [0, 0, 0.18], material: 'METAL', color: [0.5, 0.4, 0.2] },
            { name: 'handle', mesh_type: 'CYLINDER', relative_size: [0.025, 0.025, 0.2], relative_pos: [0, 0, 0.05], material: 'WOOD', color: [0.3, 0.2, 0.1] },
            { name: 'pommel', mesh_type: 'SPHERE', relative_size: [0.04, 0.04, 0.04], relative_pos: [0, 0, -0.05], material: 'METAL', color: [0.5, 0.4, 0.2] },
        ],
    },
    // Nature - Tree
    {
        keywords: ['tree', 'pohon', 'plant', 'tanaman', 'palm', 'pine', 'oak'],
        category: 'TREE',
        suggestedMaterial: 'WOOD',
        baseComponents: [
            { name: 'trunk', mesh_type: 'CYLINDER', relative_size: [0.15, 0.15, 1.0], relative_pos: [0, 0, 0.5], material: 'WOOD', color: [0.35, 0.25, 0.15] },
            { name: 'branch_1', mesh_type: 'CYLINDER', relative_size: [0.05, 0.05, 0.4], relative_pos: [-0.2, 0, 0.9], material: 'WOOD', color: [0.35, 0.25, 0.15] },
            { name: 'branch_2', mesh_type: 'CYLINDER', relative_size: [0.05, 0.05, 0.35], relative_pos: [0.15, 0.1, 0.85], material: 'WOOD', color: [0.35, 0.25, 0.15] },
            { name: 'foliage', mesh_type: 'SPHERE', relative_size: [0.6, 0.6, 0.5], relative_pos: [0, 0, 1.3], material: 'MATTE', color: [0.2, 0.5, 0.15] },
            { name: 'foliage_2', mesh_type: 'SPHERE', relative_size: [0.45, 0.45, 0.4], relative_pos: [-0.25, 0, 1.1], material: 'MATTE', color: [0.2, 0.5, 0.15] },
            { name: 'foliage_3', mesh_type: 'SPHERE', relative_size: [0.4, 0.4, 0.35], relative_pos: [0.2, 0.1, 1.2], material: 'MATTE', color: [0.2, 0.5, 0.15] },
        ],
    },
    // Misc - Food
    {
        keywords: ['food', 'makanan', 'fruit', 'buah', 'apple', 'bread', 'roti', 'cake', 'kue'],
        category: 'FOOD',
        suggestedMaterial: 'MATTE',
        baseComponents: [
            { name: 'base', mesh_type: 'SPHERE', relative_size: [0.15, 0.15, 0.12], relative_pos: [0, 0, 0.08], material: 'MATTE', color: [0.8, 0.2, 0.1] },
            { name: 'stem', mesh_type: 'CYLINDER', relative_size: [0.015, 0.015, 0.04], relative_pos: [0, 0, 0.18], material: 'WOOD', color: [0.35, 0.25, 0.15] },
            { name: 'leaf', mesh_type: 'PLANE', relative_size: [0.04, 0.03, 0.01], relative_pos: [0.02, 0, 0.19], material: 'MATTE', color: [0.2, 0.5, 0.15] },
        ],
    },
];

/**
 * Generate dynamic blueprint from description
 */
function generateDynamicBlueprint(description: string, style?: string): Blueprint | null {
    const desc = description.toLowerCase();

    // Find matching pattern
    let matchedPattern: DynamicPattern | null = null;
    let matchScore = 0;

    for (const pattern of DYNAMIC_PATTERNS) {
        let score = 0;
        for (const keyword of pattern.keywords) {
            if (desc.includes(keyword)) {
                score += keyword.length; // Longer matches = higher score
            }
        }
        if (score > matchScore) {
            matchScore = score;
            matchedPattern = pattern;
        }
    }

    if (!matchedPattern) {
        return null;
    }

    // Create dynamic blueprint
    const blueprint: Blueprint = {
        name: `Custom_${matchedPattern.category}`,
        category: matchedPattern.category,
        components: [...matchedPattern.baseComponents],
        assembly_order: matchedPattern.baseComponents.map(c => c.name),
        optimization_hints: {
            target_verts: 400,
            can_join: true,
            bevel_width: 0.005,
        },
    };

    // Apply style modifications
    if (style) {
        const styleUpper = style.toUpperCase();
        if (styleUpper === 'CYBERPUNK' || styleUpper === 'SCIFI') {
            // Add glow elements
            blueprint.components.push({
                name: 'glow_accent',
                mesh_type: 'CUBE',
                relative_size: [0.02, 0.5, 0.02],
                relative_pos: [0, 0, 0.8],
                material: 'GLOW',
                color: [0, 1, 1],
            });
        }
    }

    return blueprint;
}

/**
 * Handler for blueprint tool
 */
export async function handleBlueprint(params: BlueprintParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('blueprint', params);

    const modelType = params.model_type.toUpperCase();
    let blueprint = BLUEPRINTS[modelType];
    let isDynamic = false;

    // Handle CUSTOM type with description
    if (!blueprint && modelType === 'CUSTOM' && params.description) {
        blueprint = generateDynamicBlueprint(params.description, params.style) as Blueprint;
        isDynamic = true;

        if (!blueprint) {
            // Couldn't match any pattern, provide guidance
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        ok: 0,
                        e: 'Could not generate blueprint from description',
                        hint: 'Try including keywords like: dragon, dog, cat, human, character, sword, tree, chair, chest',
                        supported_categories: [
                            'QUADRUPED (dog, cat, wolf, horse, etc.)',
                            'WINGED_CREATURE (dragon, bird, phoenix, etc.)',
                            'HUMANOID (human, character, orc, elf, etc.)',
                            'SEATING (chair, sofa, bench, etc.)',
                            'CONTAINER (box, chest, barrel, etc.)',
                            'MELEE_WEAPON (sword, axe, hammer, etc.)',
                            'TREE (tree, plant, etc.)',
                            'FOOD (fruit, bread, cake, etc.)',
                        ],
                        fallback: 'Or use predefined types: BUILDING, WEAPON, VEHICLE, ROBOT',
                    }),
                }],
            };
        }
    }

    if (!blueprint) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    ok: 0,
                    e: `Unknown model type: ${modelType}`,
                    available: Object.keys(BLUEPRINTS),
                    hint: 'For custom models, use: blueprint({model_type:"CUSTOM", description:"your description"})',
                }),
            }],
        };
    }

    const code = generateCodeFromBlueprint(
        blueprint,
        params.style,
        params.detail_level,
        2 // base size
    );

    // Get available styles for this model type
    const availableStyles = blueprint.style_modifiers ? Object.keys(blueprint.style_modifiers) : [];

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                ok: 1,
                model: blueprint.name,
                category: blueprint.category,
                style: params.style || 'default',
                detail: params.detail_level,
                components: blueprint.components.length,
                component_list: blueprint.components.map(c => ({
                    name: c.name,
                    type: c.mesh_type,
                    material: c.material,
                })),
                extra_components: blueprint.style_modifiers?.[params.style?.toUpperCase() || '']?.extra_components?.length || 0,
                available_styles: availableStyles,
                optimization: blueprint.optimization_hints,
                isDynamic: isDynamic,
                // The Python code to execute
                code: code,
                // Instruction for AI
                instruction: `Execute this code using: run({s: "..."})`,
            }),
        }],
    };
}
