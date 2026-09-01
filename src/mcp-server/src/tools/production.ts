/**
 * Blender MCP Server - Production & QA Tools
 * 
 * Provides high-level production asset creation, scale-aware detailing,
 * multi-angle camera inspection, and QA validation.
 */

import { z } from 'zod';
import { blenderBridge } from '../bridge/client.js';
import { log } from '../utils/logger.js';

export const createProductionAssetSchema = {
    type: z.enum(['DOOR', 'STAIRS', 'ROOM', 'WALLS', 'OFFICE_FLOOR', 'ELEVATOR_PORTAL', 'CURTAIN_WALL', 'HARD_SURFACE']).describe('Asset category to construct'),
    name: z.string().default('Asset_Production').describe('Name for the created asset'),
    params: z.record(z.any()).optional().default({}).describe('Custom configuration parameters (width, length, height, wall_thickness, doors, windows, rooms, openings, etc.)'),
};

export async function handleCreateProductionAsset(params: {
    type: 'DOOR' | 'STAIRS' | 'ROOM' | 'WALLS' | 'OFFICE_FLOOR' | 'ELEVATOR_PORTAL' | 'CURTAIN_WALL' | 'HARD_SURFACE';
    name: string;
    params?: Record<string, any>;
}) {
    log.debug('Executing: create_production_asset', params);
    
    let pythonCode = '';
    const p = params.params || {};
    const n = params.name;

    if (params.type === 'ROOM') {
        const w = p.width ?? 6.0;
        const l = p.length ?? 5.0;
        const h = p.height ?? 3.0;
        const th = p.wall_thickness ?? p.thickness ?? 0.15;
        const incFloor = p.include_floor ?? true;
        const incCeil = p.include_ceiling ?? false;
        const matWalls = p.material_walls ?? 'STRUCTURAL_CONCRETE';
        const matFloor = p.material_floor ?? 'WALNUT_WOOD';
        const doorsJson = JSON.stringify(p.doors ?? []);
        const windowsJson = JSON.stringify(p.windows ?? []);
        pythonCode = `
import bpy, json
doors = json.loads('''${doorsJson}''')
windows = json.loads('''${windowsJson}''')
root = P.room(name="${n}", width=${w}, length=${l}, height=${h}, wall_thickness=${th}, doors=doors, windows=windows, include_floor=${incFloor ? 'True' : 'False'}, include_ceiling=${incCeil ? 'True' : 'False'}, material_walls="${matWalls}", material_floor="${matFloor}")
P.setup_camera_rig(root)
walls_obj = bpy.data.objects.get(f"${n}_WALLS")
qc = P.quality_check(walls_obj) if walls_obj else {}
result = {"asset": root.name, "children": [c.name for c in root.children], "walls_qc": qc, "status": "CREATED_CONTINUOUS_WALLS"}
`;
    } else if (params.type === 'WALLS') {
        const h = p.height ?? 3.0;
        const th = p.wall_thickness ?? p.thickness ?? 0.15;
        const matWalls = p.material_preset ?? p.material ?? 'STRUCTURAL_CONCRETE';
        const pathsOrRooms = p.paths ?? p.rooms ?? [p.width ?? 6.0, p.length ?? 5.0];
        const pathsJson = JSON.stringify(pathsOrRooms);
        const openingsJson = JSON.stringify(p.openings ?? []);
        pythonCode = `
import bpy, json
paths_or_rooms = json.loads('''${pathsJson}''')
openings = json.loads('''${openingsJson}''')
wall_obj = P.create_continuous_wall_mesh(paths_or_rooms=paths_or_rooms, thickness=${th}, height=${h}, openings=openings, name="${n}", material_preset="${matWalls}")
P.setup_camera_rig(wall_obj)
qc = P.quality_check(wall_obj)
result = {"asset": wall_obj.name, "verts": len(wall_obj.data.vertices), "polygons": len(wall_obj.data.polygons), "qc": qc, "status": "CREATED_CONTINUOUS_WALLS"}
`;
    } else if (params.type === 'OFFICE_FLOOR') {
        const h = p.height ?? 3.0;
        const th = p.wall_thickness ?? p.thickness ?? 0.15;
        const incFloor = p.include_floor ?? true;
        const matWalls = p.material_walls ?? 'STRUCTURAL_CONCRETE';
        const matFloor = p.material_floor ?? 'WALNUT_WOOD';
        const roomsJson = JSON.stringify(p.rooms ?? null);
        const openingsJson = JSON.stringify(p.openings ?? null);
        pythonCode = `
import bpy, json
rooms = json.loads('''${roomsJson}''')
openings = json.loads('''${openingsJson}''')
root = P.office_floor(name="${n}", rooms=rooms, height=${h}, wall_thickness=${th}, openings=openings, include_floor=${incFloor ? 'True' : 'False'}, material_walls="${matWalls}", material_floor="${matFloor}")
P.setup_camera_rig(root)
walls_obj = bpy.data.objects.get(f"${n}_WALLS")
qc = P.quality_check(walls_obj) if walls_obj else {}
result = {"asset": root.name, "children": [c.name for c in root.children], "walls_qc": qc, "status": "CREATED_OFFICE_FLOOR"}
`;
    } else if (params.type === 'DOOR') {
        const w = p.width ?? 1.0;
        const h = p.height ?? 2.15;
        const th = p.thickness ?? 0.05;
        const ht = p.handle_type ?? 'PANIC_BAR';
        const cl = p.closer ?? true;
        const kp = p.kickplate ?? true;
        pythonCode = `
import bpy
root = P.door(name="${n}", width=${w}, height=${h}, thickness=${th}, handle_type="${ht}", closer=${cl ? 'True' : 'False'}, kickplate=${kp ? 'True' : 'False'})
P.setup_camera_rig(root)
result = {"asset": root.name, "children": [c.name for c in root.children], "status": "CREATED_AND_BEVELED"}
`;
    } else if (params.type === 'STAIRS') {
        const w = p.width ?? 1.20;
        const th = p.total_height ?? 3.60;
        const steps = p.num_steps ?? 18;
        const td = p.tread_depth ?? 0.28;
        pythonCode = `
import bpy
root = P.stairs(name="${n}", width=${w}, total_height=${th}, num_steps=${steps}, tread_depth=${td})
P.setup_camera_rig(root)
result = {"asset": root.name, "children": [c.name for c in root.children], "status": "CREATED_AND_BEVELED"}
`;
    } else {
        pythonCode = `
import bpy
o = P.door(name="${n}")
result = {"asset": o.name, "status": "CREATED"}
`;
    }

    const response = await blenderBridge.send('run_script', { script: pythonCode });
    if (response.success && response.data) {
        const d = response.data as any;
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ ok: 1, out: d?.out ?? d }),
            }],
        };
    }
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({ ok: 0, error: response.error }),
        }],
    };
}

export const setupCameraRigSchema = {
    target: z.string().optional().describe('Target object name to focus camera rig on'),
};

export async function handleSetupCameraRig(params: { target?: string }) {
    log.debug('Executing: setup_camera_rig', params);
    const response = await blenderBridge.send('setup_camera_rig', params);
    if (response.success && response.data) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify(response.data, null, 2),
            }],
        };
    }
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: response.error }),
        }],
    };
}

export const renderInspectionSchema = {
    camera: z.string().default('Cam_Inspect_Hero_3D').describe('Camera name to render from (e.g. Cam_Inspect_Front, Cam_Inspect_Hero_3D, Cam_Inspect_Closeup_HW)'),
};

export async function handleRenderInspection(params: { camera: string }) {
    log.debug('Executing: render_inspection', params);
    const response = await blenderBridge.send('render_inspection', params);
    if (response.success && response.data) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify(response.data, null, 2),
            }],
        };
    }
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: response.error }),
        }],
    };
}

export const qualityCheckSchema = {
    name: z.string().describe('Object name to run complete QA inspection on'),
};

export async function handleQualityCheck(params: { name: string }) {
    log.debug('Executing: quality_check', params);
    const response = await blenderBridge.send('quality_check', params);
    if (response.success && response.data) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify(response.data, null, 2),
            }],
        };
    }
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: response.error }),
        }],
    };
}
