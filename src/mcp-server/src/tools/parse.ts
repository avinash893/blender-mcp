/**
 * Blender MCP Server - Parse Tool
 * Analyzes user prompts and returns structured breakdown
 * Token-optimized
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';

export const parseSchema = {
    prompt: z.string().describe('User prompt to analyze'),
};

export type ParseParams = {
    prompt: string;
};

interface ParsedTask {
    objects: Array<{
        type: string;
        style?: string;
        size?: number;
        name?: string;
        material?: string;
        color?: number[];
        texture?: string;
    }>;
    actions: string[];
    materials: string[];
    textures: string[];
    optimize: boolean;
    bake: {
        enabled: boolean;
        types: string[];
        resolution?: number;
    };
    export: {
        enabled: boolean;
        format?: string;
        forEngine?: string;
    };
    scene: {
        clear: boolean;
        theme?: string;
    };
}

/**
 * Parse prompt and extract structured information
 */
function parsePrompt(prompt: string): ParsedTask {
    const p = prompt.toLowerCase();

    const result: ParsedTask = {
        objects: [],
        actions: [],
        materials: [],
        textures: [],
        optimize: false,
        bake: { enabled: false, types: [] },
        export: { enabled: false },
        scene: { clear: false },
    };

    // Detect scene clear
    if (p.includes('clear') || p.includes('bersih') || p.includes('hapus semua')) {
        result.scene.clear = true;
        result.actions.push('CLEAR_SCENE');
    }

    // Detect objects
    const objectPatterns: Array<{ pattern: RegExp; type: string; style?: string }> = [
        { pattern: /\b(kubus|cube|box)\b/i, type: 'CUBE' },
        { pattern: /\b(bola|sphere|ball)\b/i, type: 'SPHERE' },
        { pattern: /\b(silinder|cylinder)\b/i, type: 'CYLINDER' },
        { pattern: /\b(cone|kerucut)\b/i, type: 'CONE' },
        { pattern: /\b(plane|lantai|floor)\b/i, type: 'PLANE' },
        { pattern: /\b(torus|donut)\b/i, type: 'TORUS' },
        { pattern: /\b(monkey|suzanne)\b/i, type: 'MONKEY' },
        { pattern: /\b(rock|batu)\b/i, type: 'ROCK', style: 'procedural' },
        { pattern: /\b(tree|pohon)\b/i, type: 'TREE', style: 'procedural' },
        { pattern: /\b(terrain|ground|tanah)\b/i, type: 'TERRAIN', style: 'procedural' },
        { pattern: /\b(building|bangunan|gedung)\b/i, type: 'BUILDING', style: 'procedural' },
        { pattern: /\b(table|meja)\b/i, type: 'TABLE', style: 'furniture' },
        { pattern: /\b(chair|kursi)\b/i, type: 'CHAIR', style: 'furniture' },
        { pattern: /\b(shelf|rak)\b/i, type: 'SHELF', style: 'furniture' },
        { pattern: /\b(room|ruangan|kamar)\b/i, type: 'ROOM', style: 'scene' },
        { pattern: /\b(cauldron|kuali)\b/i, type: 'CAULDRON', style: 'prop' },
        { pattern: /\b(potion|ramuan|botol)\b/i, type: 'POTION', style: 'prop' },
        { pattern: /\b(candle|lilin)\b/i, type: 'CANDLE', style: 'prop' },
        { pattern: /\b(book|buku)\b/i, type: 'BOOK', style: 'prop' },
        { pattern: /\b(gun|senjata|weapon|pistol|rifle|awp|ak47|m4)\b/i, type: 'WEAPON', style: 'hardsurface' },
        { pattern: /\b(car|mobil|vehicle)\b/i, type: 'VEHICLE', style: 'hardsurface' },
        { pattern: /\b(robot)\b/i, type: 'ROBOT', style: 'hardsurface' },
    ];

    for (const { pattern, type, style } of objectPatterns) {
        if (pattern.test(p)) {
            const obj: ParsedTask['objects'][0] = { type };
            if (style) obj.style = style;

            // Detect size hints
            if (p.includes('besar') || p.includes('large') || p.includes('big')) {
                obj.size = 3;
            } else if (p.includes('kecil') || p.includes('small') || p.includes('tiny')) {
                obj.size = 0.5;
            }

            result.objects.push(obj);
        }
    }

    // Detect materials
    const materialPatterns: Array<{ pattern: RegExp; material: string }> = [
        { pattern: /\b(metal|metallic|besi|logam)\b/i, material: 'METAL' },
        { pattern: /\b(glass|kaca|transparan)\b/i, material: 'GLASS' },
        { pattern: /\b(plastic|plastik)\b/i, material: 'PLASTIC' },
        { pattern: /\b(wood|kayu)\b/i, material: 'WOOD' },
        { pattern: /\b(matte|doff)\b/i, material: 'MATTE' },
        { pattern: /\b(glow|emit|neon|menyala)\b/i, material: 'GLOW' },
        { pattern: /\b(stone|batu|rock)\b/i, material: 'STONE' },
    ];

    for (const { pattern, material } of materialPatterns) {
        if (pattern.test(p)) {
            result.materials.push(material);
        }
    }

    // Detect colors
    const colorPatterns: Array<{ pattern: RegExp; color: number[] }> = [
        { pattern: /\b(merah|red)\b/i, color: [1, 0, 0] },
        { pattern: /\b(biru|blue)\b/i, color: [0, 0, 1] },
        { pattern: /\b(hijau|green)\b/i, color: [0, 1, 0] },
        { pattern: /\b(kuning|yellow)\b/i, color: [1, 1, 0] },
        { pattern: /\b(hitam|black)\b/i, color: [0.05, 0.05, 0.05] },
        { pattern: /\b(putih|white)\b/i, color: [1, 1, 1] },
        { pattern: /\b(orange|oranye)\b/i, color: [1, 0.5, 0] },
        { pattern: /\b(ungu|purple)\b/i, color: [0.5, 0, 1] },
        { pattern: /\b(pink|merah muda)\b/i, color: [1, 0.4, 0.7] },
        { pattern: /\b(cokelat|brown)\b/i, color: [0.4, 0.2, 0.1] },
        { pattern: /\b(abu|gray|grey)\b/i, color: [0.5, 0.5, 0.5] },
        { pattern: /\b(gold|emas)\b/i, color: [1, 0.84, 0] },
        { pattern: /\b(silver|perak)\b/i, color: [0.75, 0.75, 0.75] },
    ];

    for (const { pattern, color } of colorPatterns) {
        if (pattern.test(p)) {
            // Apply color to objects
            if (result.objects.length > 0) {
                result.objects[result.objects.length - 1].color = color;
            }
        }
    }

    // Detect textures
    const texturePatterns = [
        'mossy', 'lumut', 'berumput',
        'rusty', 'berkarat', 'karat',
        'wooden', 'kayu',
        'stone', 'batu',
        'marble', 'marmer',
        'brick', 'bata',
        'concrete', 'beton',
        'fabric', 'kain',
        'leather', 'kulit',
        'camo', 'kamuflase',
        'scifi', 'futuristic',
    ];

    for (const tex of texturePatterns) {
        if (p.includes(tex)) {
            result.textures.push(tex);
            result.actions.push('APPLY_TEXTURE');
        }
    }

    // Detect optimization
    if (p.includes('optim') || p.includes('mobile') || p.includes('reduce') ||
        p.includes('low poly') || p.includes('low-poly') || p.includes('lowpoly') ||
        p.match(/\d+\s*(tris|triangle|polygon|poly)/i)) {
        result.optimize = true;
        result.actions.push('OPTIMIZE');
    }

    // Detect baking
    if (p.includes('bake') || p.includes('normal map') || p.includes('ao') ||
        p.includes('ambient occlusion') || p.includes('diffuse map')) {
        result.bake.enabled = true;
        result.actions.push('BAKE');

        if (p.includes('normal')) result.bake.types.push('NORMAL');
        if (p.includes('ao') || p.includes('ambient')) result.bake.types.push('AO');
        if (p.includes('diffuse')) result.bake.types.push('DIFFUSE');
        if (p.includes('roughness')) result.bake.types.push('ROUGHNESS');

        if (result.bake.types.length === 0) {
            result.bake.types = ['NORMAL', 'AO']; // Default
        }

        // Extract resolution
        const resMatch = p.match(/(\d{3,4})\s*x\s*\d{3,4}/i) || p.match(/(\d{3,4})\s*px/i);
        if (resMatch) {
            result.bake.resolution = parseInt(resMatch[1]);
        }
    }

    // Detect export
    if (p.includes('export') || p.includes('unity') || p.includes('unreal') ||
        p.includes('godot') || p.includes('game') || p.includes('glb') ||
        p.includes('fbx') || p.includes('gltf')) {
        result.export.enabled = true;
        result.actions.push('EXPORT');

        if (p.includes('glb') || p.includes('gltf')) result.export.format = 'GLB';
        else if (p.includes('fbx')) result.export.format = 'FBX';
        else if (p.includes('obj')) result.export.format = 'OBJ';
        else result.export.format = 'GLB'; // Default

        if (p.includes('unity')) result.export.forEngine = 'Unity';
        else if (p.includes('unreal')) result.export.forEngine = 'Unreal';
        else if (p.includes('godot')) result.export.forEngine = 'Godot';
    }

    // Detect scene theme
    const themes = ['magic', 'fantasy', 'scifi', 'medieval', 'modern', 'rpg', 'horror'];
    for (const theme of themes) {
        if (p.includes(theme)) {
            result.scene.theme = theme;
        }
    }

    // Add create action if objects detected
    if (result.objects.length > 0) {
        result.actions.unshift('CREATE_OBJECTS');
    }

    // Add material action if materials detected
    if (result.materials.length > 0) {
        result.actions.push('APPLY_MATERIALS');
    }

    return result;
}

/**
 * Generate execution plan from parsed data
 */
function generatePlan(parsed: ParsedTask): string[] {
    const plan: string[] = [];

    if (parsed.scene.clear) {
        plan.push('1. Clear scene: run({s:"L.clear()"})');
    }

    let step = parsed.scene.clear ? 2 : 1;

    for (const obj of parsed.objects) {
        let cmd = '';

        // HARDSURFACE models need custom Python code
        if (obj.style === 'hardsurface') {
            plan.push(`${step}. COMPLEX MODEL: ${obj.type}`);
            plan.push(`   → Use run({s:"..."}) with detailed bpy Python code`);
            plan.push(`   → AI must generate modeling code for: ${obj.type}`);
            plan.push(`   → Include: body, details, bevels, materials`);
            plan.push(`   → Example structure:`);
            plan.push(`     - Create base shape (cube/cylinder operations)`);
            plan.push(`     - Boolean operations for details`);
            plan.push(`     - Add bevels for hard edges`);
            plan.push(`     - Apply materials per part`);
            step++;
            continue;
        }

        if (obj.style === 'procedural') {
            cmd = `proc({type:"${obj.type}"${obj.size ? `,size:${obj.size}` : ''}})`;
        } else if (obj.style === 'furniture' || obj.style === 'prop') {
            const funcName = obj.type.toLowerCase();
            cmd = `run({s:"o=L.${funcName}([0,0,0],${obj.size || 1});result=o.name"})`;
        } else {
            cmd = `prim({type:"${obj.type}"${obj.size ? `,size:${obj.size}` : ''}})`;
        }
        plan.push(`${step}. Create ${obj.type}: ${cmd}`);
        step++;

        if (obj.color && parsed.materials.length > 0) {
            plan.push(`${step}. Apply material: mat({n:"[name]",preset:"${parsed.materials[0]}",color:[${obj.color.join(',')}]})`);
            step++;
        } else if (parsed.materials.length > 0) {
            plan.push(`${step}. Apply material: mat({n:"[name]",preset:"${parsed.materials[0]}"}`);
            step++;
        }
    }

    if (parsed.textures.length > 0) {
        plan.push(`${step}. Generate texture: generate_image({prompt:"seamless ${parsed.textures[0]} texture"})`);
        step++;
        plan.push(`${step}. Apply texture: gentex({n:"[name]",src:"[path]"})`);
        step++;
    }

    if (parsed.optimize) {
        plan.push(`${step}. Optimize: opt({object_name:"[name]",target_ratio:0.5})`);
        step++;
    }

    if (parsed.bake.enabled) {
        plan.push(`${step}. Bake textures: bake({object_name:"[name]",bake_types:${JSON.stringify(parsed.bake.types)}${parsed.bake.resolution ? `,resolution:${parsed.bake.resolution}` : ''}})`);
        step++;
    }

    if (parsed.export.enabled) {
        plan.push(`${step}. Export: export({format:"${parsed.export.format}",output_path:"[path].${parsed.export.format?.toLowerCase()}"}`);
    }

    return plan;
}

/**
 * Check if object requires complex modeling
 */
function isComplexModel(obj: ParsedTask['objects'][0]): boolean {
    return obj.style === 'hardsurface';
}

/**
 * Generate Python code template for complex models
 */
function getComplexModelTemplate(objType: string): string {
    const templates: Record<string, string> = {
        'WEAPON': `# AWP/Weapon Template
import bpy
from mathutils import Vector

# Clear and setup
bpy.ops.object.select_all(action='DESELECT')

# 1. CREATE BODY (main receiver)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0,0,0))
body = bpy.context.active_object
body.name = "Weapon_Body"
body.scale = (0.15, 1.2, 0.12)
bpy.ops.object.transform_apply(scale=True)

# 2. CREATE BARREL
bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=1.5, location=(0, 1.5, 0.02))
barrel = bpy.context.active_object
barrel.name = "Weapon_Barrel"
barrel.rotation_euler = (1.5708, 0, 0)  # 90 degrees X

# 3. CREATE STOCK
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.8, -0.05))
stock = bpy.context.active_object
stock.name = "Weapon_Stock"
stock.scale = (0.08, 0.5, 0.15)
bpy.ops.object.transform_apply(scale=True)

# 4. CREATE SCOPE (for sniper)
bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.3, location=(0, 0.3, 0.15))
scope = bpy.context.active_object
scope.name = "Weapon_Scope"
scope.rotation_euler = (1.5708, 0, 0)

# 5. CREATE MAGAZINE
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.1, -0.15))
mag = bpy.context.active_object
mag.name = "Weapon_Mag"
mag.scale = (0.06, 0.15, 0.2)
bpy.ops.object.transform_apply(scale=True)

# 6. JOIN ALL PARTS
bpy.ops.object.select_all(action='DESELECT')
for obj in [body, barrel, stock, scope, mag]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

# 7. ADD BEVEL MODIFIER
bpy.ops.object.modifier_add(type='BEVEL')
body.modifiers["Bevel"].width = 0.005
body.modifiers["Bevel"].segments = 2

# 8. APPLY MATERIAL
mat = bpy.data.materials.new("Weapon_Mat")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.1, 0.1, 0.1, 1)
bsdf.inputs["Metallic"].default_value = 0.9
bsdf.inputs["Roughness"].default_value = 0.3
body.data.materials.append(mat)

body.name = "AWP_Rifle"
result = f"Created {body.name} with {len(body.data.vertices)} verts"`,

        'VEHICLE': `# Vehicle Template - Basic Car Shape
import bpy
# Create car body, wheels, windows...
# (Template for vehicle creation)`,

        'ROBOT': `# Robot Template
import bpy  
# Create robot parts: head, body, arms, legs...
# (Template for robot creation)`,
    };

    return templates[objType] || `# Custom ${objType} model\nimport bpy\n# Generate modeling code here`;
}

/**
 * Handler for parse tool
 */
export async function handleParse(params: ParseParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    log.debug('parse', { promptLength: params.prompt.length });

    const parsed = parsePrompt(params.prompt);
    const plan = generatePlan(parsed);

    // Check if there are complex models that need code templates
    const complexModels = parsed.objects.filter(o => o.style === 'hardsurface');
    const codeTemplates: Record<string, string> = {};

    for (const obj of complexModels) {
        codeTemplates[obj.type] = getComplexModelTemplate(obj.type);
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                ok: 1,
                parsed: {
                    objects: parsed.objects,
                    materials: parsed.materials,
                    textures: parsed.textures,
                    optimize: parsed.optimize,
                    bake: parsed.bake,
                    export: parsed.export,
                    theme: parsed.scene.theme,
                },
                steps: parsed.actions,
                plan: plan,
                // Include code templates for complex models
                hasComplexModel: complexModels.length > 0,
                codeTemplates: complexModels.length > 0 ? codeTemplates : undefined,
                hint: complexModels.length > 0
                    ? 'COMPLEX MODEL DETECTED: Use run({s:"..."}) with the provided template code. Modify as needed.'
                    : undefined,
            }),
        }],
    };
}
