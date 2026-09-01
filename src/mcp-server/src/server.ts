/**
 * Blender MCP Server - Main Server Setup
 * 
 * Creates and configures the MCP server with all production tools.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from './utils/logger.js';
import { config } from './utils/config.js';
import { blenderBridge } from './bridge/client.js';
import { createPrimitiveSchema, handleCreatePrimitive } from './tools/primitives.js';
import { exportModelSchema, handleExportModel } from './tools/export.js';
import { applyTextureSchema, handleApplyTexture, setMaterialSchema, handleSetMaterial } from './tools/texture.js';
import { generateProceduralSchema, handleGenerateProcedural } from './tools/procedural.js';
import { optimizeMeshSchema, handleOptimizeMesh } from './tools/optimize.js';
import { renderPreviewSchema, handleRenderPreview } from './tools/render.js';
import { bakeTexturesSchema, handleBakeTextures } from './tools/bake.js';
import { genTexSchema, handleGenTex } from './tools/gentex.js';
import { pipelineSchema, handlePipeline } from './tools/pipeline.js';
import { parseSchema, handleParse } from './tools/parse.js';
import { blueprintSchema, handleBlueprint } from './tools/blueprint.js';
import { sculptSchema, handleSculpt } from './tools/sculpt.js';
import { previewSchema, handlePreview } from './tools/preview.js';
import { inspectSceneSchema, handleInspectScene, inspectObjectSchema, handleInspectObject } from './tools/inspect.js';
import {
    createProductionAssetSchema,
    handleCreateProductionAsset,
    setupCameraRigSchema,
    handleSetupCameraRig,
    renderInspectionSchema,
    handleRenderInspection,
    qualityCheckSchema,
    handleQualityCheck
} from './tools/production.js';
import {
    phSearchSchema,
    handlePhSearch,
    phImportSchema,
    handlePhImport,
    phTextureSchema,
    handlePhTexture,
    phHdriSchema,
    handlePhHdri,
    phReplaceSchema,
    handlePhReplace,
    phInspectSchema,
    handlePhInspect,
    phStatusSchema,
    handlePhStatus,
} from './tools/polyhaven.js';

export function createServer(): McpServer {
    log.info('Creating MCP server...', {
        name: config.server.name,
        version: config.server.version
    });

    const server = new McpServer({
        name: config.server.name,
        version: config.server.version,
    });

    // Register tools
    registerTools(server);

    log.info('MCP server created successfully');
    return server;
}

function registerTools(server: McpServer): void {
    log.info('Registering tools...');

    // Tool 1: status - Check Blender connection
    server.tool(
        'status',
        'Check Blender connection. Returns version and status.',
        {},
        async () => {
            log.debug('Executing: status');
            return handleGetBlenderStatus();
        }
    );

    // Tool 2: scene - List objects in scene
    server.tool(
        'scene',
        'List objects in Blender scene with pagination.',
        {
            limit: z.number().min(1).max(100).default(20).describe('Max objects'),
            offset: z.number().min(0).default(0).describe('Offset'),
            type: z.enum(['ALL', 'MESH', 'LIGHT', 'CAMERA', 'EMPTY']).default('ALL').describe('Filter type'),
            v: z.enum(['min', 'std', 'full']).default('std').describe('Verbosity'),
        },
        async (params) => {
            log.debug('Executing: scene', params);
            return handleGetSceneInfo({
                limit: params.limit,
                offset: params.offset,
                filter_type: params.type,
                verbosity: params.v === 'min' ? 'minimal' : params.v === 'full' ? 'detailed' : 'standard',
            });
        }
    );

    // Tool 3: inspect_scene - Deep scene structure inspection
    server.tool(
        'inspect_scene',
        'Inspect full scene: collections, dimensions, materials, modifiers, lights, and cameras.',
        inspectSceneSchema,
        async (params) => {
            return handleInspectScene(params);
        }
    );

    // Tool 4: inspect_object - Deep object QA and geometry validation
    server.tool(
        'inspect_object',
        'Deep mesh inspection: topology, scale application, UV layers, bevels, materials, and manifold status.',
        inspectObjectSchema,
        async (params) => {
            return handleInspectObject(params);
        }
    );

    // Tool 5: create_production_asset - Production architectural asset builder
    server.tool(
        'create_production_asset',
        'Construct production-grade architectural asset (ROOM, WALLS, OFFICE_FLOOR, DOOR, STAIRS, ELEVATOR_PORTAL, CURTAIN_WALL, HARD_SURFACE) with continuous connected wall meshes, real-world dimensions, multi-stage hardware, scale-aware bevels, and PBR materials.',
        createProductionAssetSchema,
        async (params) => {
            return handleCreateProductionAsset(params);
        }
    );

    // Tool 6: setup_camera_rig - Camera QA inspection suite
    server.tool(
        'setup_camera_rig',
        'Create 4-point or 8-point look-at inspection camera rig targeted at active object or origin.',
        setupCameraRigSchema,
        async (params) => {
            return handleSetupCameraRig(params);
        }
    );

    // Tool 7: render_inspection - High-res QA viewport/render capture
    server.tool(
        'render_inspection',
        'Render inspection camera view (Cam_Inspect_Front, Cam_Inspect_Hero_3D, Cam_Inspect_Closeup_HW) to disk for AI visual inspection.',
        renderInspectionSchema,
        async (params) => {
            return handleRenderInspection(params);
        }
    );

    // Tool 8: quality_check - Comprehensive 100-point QA scorecard
    server.tool(
        'quality_check',
        'Evaluate 3D asset across 6 pillars: Topology, Scale, Bevels, UV Maps, PBR Materials, and Dimensions.',
        qualityCheckSchema,
        async (params) => {
            return handleQualityCheck(params);
        }
    );

    // Tool 9: prim - Create primitive shapes
    server.tool(
        'prim',
        'Create 3D primitive (CUBE/SPHERE/CYLINDER/CONE/PLANE/TORUS/MONKEY/CIRCLE/GRID).',
        createPrimitiveSchema,
        async (params) => {
            return handleCreatePrimitive(params);
        }
    );

    // Tool 10: export - Export model to file
    server.tool(
        'export',
        'Export model to FBX/GLB/GLTF/OBJ format.',
        exportModelSchema,
        async (params) => {
            return handleExportModel(params);
        }
    );

    // Tool 11: tex - Apply texture to object
    server.tool(
        'tex',
        'Apply image texture to object. Auto-generates UVs if needed.',
        applyTextureSchema,
        async (params) => {
            return handleApplyTexture(params);
        }
    );

    // Tool 12: mat - Apply material preset
    server.tool(
        'mat',
        'Apply Unity-friendly material preset. Presets: METALLIC/PLASTIC/GLASS/WOOD/STONE/FABRIC/EMISSIVE/MATTE/RUBBER/CERAMIC/PAINTED_METAL/DARK_METAL/RUST.',
        setMaterialSchema,
        async (params) => {
            return handleSetMaterial(params);
        }
    );

    // Tool 13: proc - Generate procedural objects
    server.tool(
        'proc',
        'Generate procedural TREE/ROCK/TERRAIN/BUILDING. Auto smooth-shaded and beveled.',
        generateProceduralSchema,
        async (params) => {
            return handleGenerateProcedural(params);
        }
    );

    // Tool 14: opt - Optimize mesh (reduce polys)
    server.tool(
        'opt',
        'Reduce polygon count. Params: object_name, target_ratio (0.1-1.0).',
        optimizeMeshSchema,
        async (params) => {
            return handleOptimizeMesh(params);
        }
    );

    // Tool 15: render - Render scene preview
    server.tool(
        'render',
        'Render scene to image. Angles: FRONT/TOP/SIDE/ISOMETRIC/CURRENT.',
        renderPreviewSchema,
        async (params) => {
            return handleRenderPreview(params);
        }
    );

    // Tool 16: bake - Bake textures for game engine
    server.tool(
        'bake',
        'Bake textures for Unity/Unreal. Types: DIFFUSE/NORMAL/AO/ROUGHNESS/METALLIC/COMBINED/EMIT/SHADOW. Requires UV map.',
        bakeTexturesSchema,
        async (params) => {
            return handleBakeTextures(params);
        }
    );

    // Tool 17: gentex - Generate/Apply texture from AI or URL
    server.tool(
        'gentex',
        `Apply texture from path/URL. WORKFLOW: 1) Use generate_image to create texture 2) Use gentex with artifacts path.\nParams: n=object, src=path/URL, uv=AUTO/BOX/SPHERE/CYLINDER, tile=[x,y]`,
        genTexSchema,
        async (params) => {
            return handleGenTex(params);
        }
    );

    // Tool 18: pipe - Step-by-step workflow orchestrator
    server.tool(
        'pipe',
        `Workflow orchestrator for multi-stage asset production.\nActions: start(task="description"), next(id="pipe_xxx"), back, status, cancel.`,
        pipelineSchema,
        async (params) => {
            return handlePipeline(params);
        }
    );

    // Tool 19: parse - Analyze prompt and return structured breakdown
    server.tool(
        'parse',
        `Analyze user prompt and extract structured information: objects, materials, textures, optimization, and plan.`,
        parseSchema,
        async (params) => {
            return handleParse(params);
        }
    );

    // Tool 20: blueprint - Structural breakdown for complex models
    server.tool(
        'blueprint',
        `Structural breakdown for complex models. Returns components list + generated Python code.`,
        blueprintSchema,
        async (params) => {
            return handleBlueprint(params);
        }
    );

    // Tool 21: sculpt - AI-assisted mesh modification
    server.tool(
        'sculpt',
        `Modify mesh geometry with AI-assisted operations.`,
        sculptSchema,
        async (params) => {
            return handleSculpt(params);
        }
    );

    // Tool 22: preview - Quick viewport capture for AI vision
    server.tool(
        'preview',
        `Quick viewport render for AI to SEE the scene. Returns image path.`,
        previewSchema,
        async (params) => {
            return handlePreview(params);
        }
    );

    // Tool 23: run - Execute Python script DIRECTLY in Blender with P Production & Enhancement Library
    server.tool(
        'run',
        `IMPORTANT: Execute Python code DIRECTLY in Blender.

15 ENHANCEMENT PATTERNS & UTILITIES:
- create_custom_cube(name, size_x, size_y, size_z, subdivisions, position)
- create_custom_sphere(name, radius, subdivisions, position)
- create_custom_cylinder(name, radius, height, subdivisions, vertices, position)
- create_roof(name, width, depth, height, angle, thickness, position)
- build_simple_house(name, position)
- add_subdivision_surface_modifier(obj_name, levels, render_levels)
- add_bevel_modifier(obj_name, width, segments, limit_method)
- add_mirror_modifier(obj_name, axis, use_clip)
- add_array_modifier(obj_name, count, axis, offset)
- apply_all_modifiers(obj_name)
- inset_face(obj_name, depth, thickness)
- transform_object(obj_name, scale, rotation, location)
- create_material(name, base_color, metallic, roughness, emission)
- assign_material_to_object(obj_name, material_name)
- create_textured_material(name, texture_type, base_color, roughness)

P PRODUCTION ARCHITECTURAL & ASSET LIBRARY:
- P.room(name, width, length, height, wall_thickness, doors, windows, include_floor, include_ceiling, material_walls, material_floor)
- P.create_continuous_wall_mesh(paths_or_rooms, thickness, height, openings, name, material_preset)
- P.office_floor(name, rooms, height, wall_thickness, openings, include_floor)
- P.create_wall_opening(wall_obj, opening_type, position, size, rotation_z)
- P.create_architectural_bevel(obj, width, segments, angle_limit)
- P.generate_unity_colliders(wall_obj)
- P.door(name, width, height, thickness, handle_type, closer, kickplate)
- P.stairs(name, width, total_height, num_steps, tread_depth)
- P.bevel(obj, width, segments, angle_limit)
- P.create_pbr_material(name, preset, base_color, roughness, metallic, bump)
- P.smart_uv(obj, angle_limit, margin)
- P.setup_camera_rig(target_obj)
- P.render_inspection(cam_name)
- P.validate_geometry(obj)
- P.quality_check(obj)

POLY HAVEN INTEGRATION:
- PH.import_model(slug, location, rotation, scale, resolution)
- PH.import_texture(slug, target_objects, resolution)
- PH.load_hdri(slug, rotation_z, strength)
- PH.search(query, asset_type, limit)

ALSO AVAILABLE: bpy, bmesh, math, mathutils, random, os.
EXAMPLE: run({s:"r=build_simple_house('My_House'); result=r"})`,
        {
            s: z.string().describe('Python code to execute. Use P.func(), PH.func(), or enhancement functions. Set result="..." for return output.'),
        },
        async (params) => {
            log.debug('Executing: run', { len: params.s.length });
            const response = await blenderBridge.send('run_script', { script: params.s });
            if (response.success) {
                const d = response.data as any;
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ ok: 1, out: d?.out ?? d?.output ?? 'done' }),
                    }],
                };
            }
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ ok: 0, err: response.error }),
                }],
            };
        }
    );

    // Tool 24: unity_finalize - One-shot Unity prep before export
    server.tool(
        'unity_finalize',
        `UNITY PREP TOOL — Applies scale, multi-segment bevels, weighted normals, and smart UVs to all objects.`,
        {
            object_names: z.array(z.string()).optional().default([]).describe('Object names to finalize (empty=all visible meshes)'),
            bevel_width: z.number().min(0).max(0.5).default(0.008).describe('Bevel edge width'),
            bevel_segments: z.number().int().min(1).max(6).default(3).describe('Bevel smoothness segments (3=standard)'),
        },
        async (params) => {
            log.debug('Executing: unity_finalize', params);
            const response = await blenderBridge.send('unity_finalize', {
                object_names: params.object_names || [],
                bevel_width: params.bevel_width,
                bevel_segments: params.bevel_segments,
            });
            if (response.success && response.data) {
                const d = response.data as any;
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ ok: 1, finalized: d.finalized, objects: d.objects }),
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
    );

    log.info('Tools registered', { count: 31 });

    // Tool 25: ph_status — Check Poly Haven integration status
    server.tool(
        'ph_status',
        'Check Poly Haven integration status: addon availability, asset library path, and cached asset count',
        phStatusSchema,
        async () => handlePhStatus()
    );

    // Tool 26: ph_search — Search local Poly Haven asset catalog
    server.tool(
        'ph_search',
        'Search the local Poly Haven asset catalog (HDRIs, textures, models). Uses cached asset list — no internet required. Returns slug, name, type, categories, tags, and whether already downloaded.',
        phSearchSchema,
        async (params) => handlePhSearch(params as { query: string; asset_type: 'all' | 'hdri' | 'texture' | 'model'; max_results: number })
    );

    // Tool 27: ph_import — Import a Poly Haven model into the scene
    server.tool(
        'ph_import',
        'Import a Poly Haven model/prop into the current Blender scene. Downloads the asset if needed (requires internet for first download). Automatically grounds the asset to Z=0 and registers PH metadata.',
        phImportSchema,
        async (params) => handlePhImport(params as { slug: string; location: number[]; rotation: number[]; scale: number; resolution: string })
    );

    // Tool 28: ph_texture — Apply a Poly Haven texture/material to objects
    server.tool(
        'ph_texture',
        'Apply a Poly Haven PBR texture/material to one or more objects. Downloads if needed. Validates and auto-generates UVs if missing. Returns material validation report.',
        phTextureSchema,
        async (params) => handlePhTexture(params as { slug: string; objects?: string[]; resolution: string })
    );

    // Tool 29: ph_hdri — Load a Poly Haven HDRI as scene world
    server.tool(
        'ph_hdri',
        'Load a Poly Haven HDRI and set it as the scene world for environment lighting. Downloads if needed. Control rotation (degrees) and strength.',
        phHdriSchema,
        async (params) => handlePhHdri(params as { slug: string; rotation_z: number; strength: number; resolution: string })
    );

    // Tool 30: ph_replace — Replace an existing PH asset with a different one
    server.tool(
        'ph_replace',
        'Replace an existing Poly Haven asset in the scene with a different one, preserving the original location, rotation, and scale.',
        phReplaceSchema,
        async (params) => handlePhReplace(params as { old_slug: string; new_slug: string; resolution: string })
    );

    // Tool 31: ph_inspect — Inspect a Poly Haven asset in the scene
    server.tool(
        'ph_inspect',
        'Inspect a Poly Haven imported asset hierarchy in the scene: list all objects, materials, texture maps, PBR validation score, and dimensional scale check.',
        phInspectSchema,
        async (params) => handlePhInspect(params as { slug: string })
    );
}


/**
 * Handler for get_blender_status
 */
async function handleGetBlenderStatus(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    const startTime = Date.now();

    if (!blenderBridge.isConnected) {
        try {
            await blenderBridge.connect();
        } catch {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        connected: false,
                        error: {
                            code: 'CONNECTION_FAILED',
                            message: 'Cannot connect to Blender',
                            suggestion: 'Start Blender and enable the MCP addon, then click "Start Server"',
                        },
                    }),
                }],
            };
        }
    }

    const response = await blenderBridge.send('get_version');
    const durationMs = Date.now() - startTime;

    if (response.success) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    connected: true,
                    version: response.data,
                    latency_ms: durationMs,
                }),
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                connected: false,
                error: response.error,
            }),
        }],
    };
}

/**
 * Handler for get_scene_info
 */
async function handleGetSceneInfo(params: {
    limit: number;
    offset: number;
    filter_type: string;
    verbosity: string;
}): Promise<{
    content: Array<{ type: 'text'; text: string }>;
}> {
    const response = await blenderBridge.send('get_scene_info', params);

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response.success ? response.data : { error: response.error }),
        }],
    };
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(): void {
    const shutdown = () => {
        log.info('Shutting down...');
        blenderBridge.disconnect();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
