"""
Blender MCP Connector v2 — Production Modeling Engine + Poly Haven Integration
WebSocket MCP bridge server + P (Production) + PH (Poly Haven) libraries.
"""

bl_info = {
    "name": "MCP Connector v2",
    "description": "WebSocket MCP bridge with Production (P) and Poly Haven (PH) libraries",
    "author": "BlenderMCP",
    "version": (2, 1, 0),
    "blender": (4, 0, 0),
    "location": "N-Panel > MCP",
    "category": "Interface",
}

import bpy
import math
import random
import os
import json
import threading
import asyncio
import sys
import builtins
import traceback
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────
# P  — Production-Grade Modeling & QA Engine
# ─────────────────────────────────────────────────────────────────────
class P:
    """
    Production-Grade Autonomous 3D Asset & Architecture Engine.
    Enforces real-world dimensions, multi-stage detailing, scale-aware bevels,
    smart UV unwrapping, layered PBR materials, and camera-based QA inspections.
    """

    @staticmethod
    def smooth(obj, auto_smooth_angle=35.0):
        if not obj or obj.type != 'MESH': return obj
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.shade_smooth()
        if hasattr(obj.data, "use_auto_smooth"):
            obj.data.use_auto_smooth = True
            obj.data.auto_smooth_angle = math.radians(auto_smooth_angle)
        return obj

    @staticmethod
    def bevel(obj, width=0.008, segments=3, angle_limit=35.0, add_weighted_normal=True):
        if not obj or obj.type != 'MESH': return obj
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        for mod in list(obj.modifiers):
            if mod.type in {'BEVEL', 'WEIGHTED_NORMAL'}:
                obj.modifiers.remove(mod)
        if width > 0:
            bmod = obj.modifiers.new(name="Bevel_Production", type='BEVEL')
            bmod.width = width
            bmod.segments = max(2, segments)
            bmod.limit_method = 'ANGLE'
            bmod.angle_limit = math.radians(angle_limit)
            bmod.use_clamp_overlap = True
        if add_weighted_normal:
            wn = obj.modifiers.new(name="Weighted_Normal", type='WEIGHTED_NORMAL')
            wn.keep_sharp = True
        P.smooth(obj, auto_smooth_angle=angle_limit)
        return obj

    @staticmethod
    def apply_scale(obj):
        if not obj: return
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    @staticmethod
    def door(name="Industrial_Fire_Door", width=1.00, height=2.15, thickness=0.05,
             frame_depth=0.16, frame_width=0.06, loc=(0,0,0), rot=(0,0,0),
             handle_type="PANIC_BAR", closer=True, kickplate=True):
        parts = []
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-width*0.5 - frame_width*0.5, 0.0, height*0.5))
        jamb_l = bpy.context.active_object
        jamb_l.name = f"{name}_Jamb_Left"
        jamb_l.scale = (frame_width, frame_depth, height)
        parts.append(jamb_l)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(width*0.5 + frame_width*0.5, 0.0, height*0.5))
        jamb_r = bpy.context.active_object
        jamb_r.name = f"{name}_Jamb_Right"
        jamb_r.scale = (frame_width, frame_depth, height)
        parts.append(jamb_r)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, height + frame_width*0.5))
        header = bpy.context.active_object
        header.name = f"{name}_Header"
        header.scale = (width + frame_width*2.0, frame_depth, frame_width)
        parts.append(header)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -thickness*0.5 - 0.01, height*0.5))
        stop = bpy.context.active_object
        stop.name = f"{name}_Stop_Bead"
        stop.scale = (width, 0.02, height)
        parts.append(stop)
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts: p.select_set(True)
        bpy.context.view_layer.objects.active = jamb_l
        bpy.ops.object.join()
        frame_obj = bpy.context.active_object
        frame_obj.name = f"{name}_Frame"
        P.apply_scale(frame_obj)
        P.bevel(frame_obj, width=0.005, segments=3)
        P.smart_uv(frame_obj)
        mat_frame = P.create_pbr_material(f"Mat_{name}_Frame", preset="DARK_METAL", base_color=(0.18, 0.20, 0.22, 1.0))
        frame_obj.data.materials.append(mat_frame)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, height*0.5))
        door_slab = bpy.context.active_object
        door_slab.name = f"{name}_Slab"
        door_slab.scale = (width - 0.015, thickness, height - 0.015)
        P.apply_scale(door_slab)
        P.bevel(door_slab, width=0.004, segments=3)
        P.smart_uv(door_slab)
        mat_slab = P.create_pbr_material(f"Mat_{name}_Slab", preset="POWDER_COATED_STEEL", base_color=(0.28, 0.32, 0.36, 1.0))
        door_slab.data.materials.append(mat_slab)
        hinges = []
        for hz in [0.25, height*0.5, height - 0.25]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.12, vertices=16, location=(-width*0.5 + 0.005, 0.0, hz))
            hpin = bpy.context.active_object
            hpin.name = f"{name}_Hinge_Z{hz:.2f}"
            P.bevel(hpin, width=0.002, segments=2)
            hinges.append(hpin)
        hardware_parts = list(hinges)
        if handle_type == "PANIC_BAR":
            bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=width*0.75, vertices=16, location=(0.0, thickness*0.5 + 0.06, 1.00))
            pbar = bpy.context.active_object
            pbar.rotation_euler = (0, math.radians(90), 0)
            P.apply_scale(pbar)
            P.bevel(pbar, width=0.003, segments=2)
            hardware_parts.append(pbar)
            for bx in [-width*0.35, width*0.35]:
                bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, thickness*0.5 + 0.03, 1.00))
                bbase = bpy.context.active_object
                bbase.scale = (0.08, 0.06, 0.18)
                P.apply_scale(bbase)
                P.bevel(bbase, width=0.003, segments=2)
                hardware_parts.append(bbase)
        if kickplate:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, thickness*0.5 + 0.003, 0.12))
            kplate = bpy.context.active_object
            kplate.name = f"{name}_Kickplate"
            kplate.scale = (width - 0.06, 0.006, 0.22)
            P.apply_scale(kplate)
            P.bevel(kplate, width=0.002, segments=2)
            hardware_parts.append(kplate)
        if closer:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, thickness*0.5 + 0.04, height - 0.08))
            cl_body = bpy.context.active_object
            cl_body.name = f"{name}_Closer_Body"
            cl_body.scale = (0.28, 0.06, 0.06)
            P.apply_scale(cl_body)
            P.bevel(cl_body, width=0.003, segments=2)
            hardware_parts.append(cl_body)
            bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.32, vertices=12, location=(0.08, thickness*0.5 + 0.05, height - 0.04))
            cl_arm = bpy.context.active_object
            cl_arm.rotation_euler = (math.radians(-30), math.radians(45), 0)
            P.apply_scale(cl_arm)
            hardware_parts.append(cl_arm)
        bpy.ops.object.select_all(action='DESELECT')
        for hp in hardware_parts: hp.select_set(True)
        bpy.context.view_layer.objects.active = hardware_parts[0]
        bpy.ops.object.join()
        hw_obj = bpy.context.active_object
        hw_obj.name = f"{name}_Hardware"
        P.apply_scale(hw_obj)
        P.smart_uv(hw_obj)
        mat_hw = P.create_pbr_material(f"Mat_{name}_Stainless_HW", preset="BRUSHED_STAINLESS", base_color=(0.85, 0.86, 0.88, 1.0))
        hw_obj.data.materials.append(mat_hw)
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=loc)
        root = bpy.context.active_object
        root.name = name
        root.rotation_euler = tuple(rot)
        for obj_child in [frame_obj, door_slab, hw_obj]:
            obj_child.parent = root
        return root

    @staticmethod
    def create_pbr_material(name, preset="POWDER_COATED_STEEL", base_color=None,
                            roughness=0.55, metallic=0.0, normal_strength=0.5,
                            edge_wear=0.15, uv_scale=(1.0, 1.0)):
        presets_config = {
            "POWDER_COATED_STEEL": {"m": 0.15, "r": 0.55, "c": (0.30, 0.33, 0.36, 1.0), "bump": 0.35},
            "BRUSHED_STAINLESS":   {"m": 0.85, "r": 0.28, "c": (0.85, 0.86, 0.88, 1.0), "bump": 0.20},
            "ANODIZED_ALUMINUM":   {"m": 0.75, "r": 0.35, "c": (0.22, 0.24, 0.26, 1.0), "bump": 0.15},
            "DARK_METAL":          {"m": 0.25, "r": 0.65, "c": (0.15, 0.17, 0.19, 1.0), "bump": 0.40},
            "STRUCTURAL_CONCRETE": {"m": 0.01, "r": 0.78, "c": (0.70, 0.72, 0.74, 1.0), "bump": 0.65},
            "POLISHED_GRANITE":    {"m": 0.05, "r": 0.22, "c": (0.45, 0.48, 0.52, 1.0), "bump": 0.10},
            "DARK_OFFICE_GLAZING": {"m": 0.88, "r": 0.06, "c": (0.08, 0.12, 0.16, 1.0), "bump": 0.05},
            "WALNUT_WOOD":         {"m": 0.00, "r": 0.60, "c": (0.35, 0.22, 0.14, 1.0), "bump": 0.50},
            "MATTE_PLASTIC":       {"m": 0.00, "r": 0.50, "c": (0.80, 0.80, 0.80, 1.0), "bump": 0.20},
            "RUBBER_SEAL":         {"m": 0.00, "r": 0.90, "c": (0.08, 0.08, 0.09, 1.0), "bump": 0.30},
            "EMISSIVE_LED":        {"m": 0.00, "r": 0.10, "c": (0.95, 0.98, 1.00, 1.0), "bump": 0.0, "emit": 4.5},
            "EXIT_SIGN_GREEN":     {"m": 0.00, "r": 0.20, "c": (0.10, 0.85, 0.35, 1.0), "bump": 0.0, "emit": 4.0},
        }
        cfg = presets_config.get(preset.upper(), presets_config["POWDER_COATED_STEEL"])
        col = base_color if base_color is not None else cfg["c"]
        met = metallic if metallic != 0.0 else cfg["m"]
        rough = roughness if roughness != 0.55 else cfg["r"]
        bump_val = normal_strength if normal_strength != 0.5 else cfg["bump"]
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        node_out = nodes.new(type='ShaderNodeOutputMaterial')
        node_out.location = (800, 0)
        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
        bsdf.location = (400, 0)
        links.new(bsdf.outputs['BSDF'], node_out.inputs['Surface'])
        bsdf.inputs['Base Color'].default_value = col
        bsdf.inputs['Metallic'].default_value = met
        bsdf.inputs['Roughness'].default_value = rough
        if "emit" in cfg and 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = cfg["emit"]
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = col
        tc = nodes.new(type='ShaderNodeTexCoord')
        tc.location = (-800, 0)
        mapping = nodes.new(type='ShaderNodeMapping')
        mapping.location = (-600, 0)
        mapping.inputs['Scale'].default_value = (uv_scale[0], uv_scale[1], 1.0)
        links.new(tc.outputs['UV'], mapping.inputs['Vector'])
        noise = nodes.new(type='ShaderNodeTexNoise')
        noise.location = (-400, -200)
        noise.inputs['Scale'].default_value = 45.0
        noise.inputs['Detail'].default_value = 6.0
        noise.inputs['Roughness'].default_value = 0.65
        links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
        if bump_val > 0:
            bump = nodes.new(type='ShaderNodeBump')
            bump.location = (100, -250)
            bump.inputs['Strength'].default_value = bump_val * 0.25
            bump.inputs['Distance'].default_value = 0.01
            links.new(noise.outputs['Fac'], bump.inputs['Height'])
            links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
        return mat

    @staticmethod
    def smart_uv(obj, angle_limit=66.0, margin=0.02):
        if not obj or obj.type != 'MESH': return
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        P.apply_scale(obj)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(
            angle_limit=math.radians(angle_limit),
            island_margin=margin,
            area_weight=0.0,
            correct_aspect=True,
            scale_to_bounds=False
        )
        bpy.ops.object.mode_set(mode='OBJECT')

    @staticmethod
    def validate_uv(obj):
        if not obj or obj.type != 'MESH' or not obj.data: return {"valid": False, "error": "Invalid mesh"}
        mesh = obj.data
        if not mesh.uv_layers: return {"valid": False, "error": "No UV layers found"}
        return {"valid": True, "uv_name": mesh.uv_layers.active.name, "polygons": len(mesh.polygons)}

    @staticmethod
    def setup_camera_rig(target_obj_or_name=None, distance_mult=2.2):
        import mathutils
        target_loc = (0.0, 0.0, 1.0)
        target_size = 2.0
        if target_obj_or_name:
            tobj = bpy.data.objects.get(target_obj_or_name) if isinstance(target_obj_or_name, str) else target_obj_or_name
            if tobj:
                target_loc = tuple(tobj.location)
                target_size = max(tobj.dimensions) if hasattr(tobj, 'dimensions') and max(tobj.dimensions) > 0.1 else 2.0
        dist = max(target_size * distance_mult, 2.5)
        col_cams = bpy.data.collections.get("Inspection_Cameras")
        if not col_cams:
            col_cams = bpy.data.collections.new("Inspection_Cameras")
            bpy.context.scene.collection.children.link(col_cams)
        cams_info = [
            ("Cam_Inspect_Front",      (target_loc[0], target_loc[1] - dist, target_loc[2] + dist*0.2), 35),
            ("Cam_Inspect_Side_Left",  (target_loc[0] - dist, target_loc[1], target_loc[2] + dist*0.2), 35),
            ("Cam_Inspect_Hero_3D",    (target_loc[0] + dist*0.7, target_loc[1] - dist*0.7, target_loc[2] + dist*0.5), 32),
            ("Cam_Inspect_Closeup_HW", (target_loc[0] + dist*0.3, target_loc[1] - dist*0.3, target_loc[2] + 0.1), 50),
        ]
        created_cams = []
        for cname, cloc, lens in cams_info:
            cobj = bpy.data.objects.get(cname)
            if not cobj:
                cdata = bpy.data.cameras.new(cname)
                cobj = bpy.data.objects.new(cname, cdata)
                col_cams.objects.link(cobj)
            cobj.data.lens = lens
            cobj.location = cloc
            dir_vec = mathutils.Vector(target_loc) - mathutils.Vector(cloc)
            cobj.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
            created_cams.append(cname)
        if not bpy.data.objects.get("Light_QA_Sun"):
            bpy.ops.object.light_add(type='SUN', location=(15, -15, 20))
            sun = bpy.context.active_object
            sun.name = "Light_QA_Sun"
            sun.data.energy = 4.5
        return created_cams

    @staticmethod
    def render_inspection(cam_name="Cam_Inspect_Hero_3D", resolution=(1920, 1080), output_path=None):
        cam = bpy.data.objects.get(cam_name)
        if not cam: return {"error": f"Camera {cam_name} not found"}
        scene = bpy.context.scene
        scene.camera = cam
        scene.render.resolution_x = resolution[0]
        scene.render.resolution_y = resolution[1]
        if not output_path:
            render_dir = r"C:\Users\avina\Desktop\blender mcp\Renders"
            os.makedirs(render_dir, exist_ok=True)
            output_path = os.path.join(render_dir, f"{cam_name}.png")
        scene.render.filepath = output_path
        bpy.ops.render.render(write_still=True)
        return {"camera": cam_name, "path": output_path, "status": "rendered"}

    @staticmethod
    def validate_geometry(obj):
        import bmesh
        if not obj or obj.type != 'MESH' or not obj.data: return {"error": "Invalid mesh"}
        scale_applied = all(abs(s - 1.0) < 0.001 for s in obj.scale)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        non_manifold = sum(1 for e in bm.edges if not e.is_manifold)
        loose_v = sum(1 for v in bm.verts if len(v.link_edges) == 0)
        zero_faces = sum(1 for f in bm.faces if f.calc_area() < 1e-6)
        poly_count = len(bm.faces)
        bm.free()
        return {
            "object": obj.name,
            "scale_applied": scale_applied,
            "polygons": poly_count,
            "non_manifold_edges": non_manifold,
            "loose_vertices": loose_v,
            "zero_area_faces": zero_faces,
            "clean_topology": (non_manifold == 0 and loose_v == 0 and zero_faces == 0)
        }

    @staticmethod
    def quality_check(obj):
        if isinstance(obj, str): obj = bpy.data.objects.get(obj)
        if not obj: return {"score": 0, "status": "FAIL", "reason": "Object not found"}
        geo = P.validate_geometry(obj) if obj.type == 'MESH' else {"clean_topology": True, "scale_applied": True}
        uv = P.validate_uv(obj) if obj.type == 'MESH' else {"valid": True}
        has_bevel = any(m.type == 'BEVEL' for m in obj.modifiers) if hasattr(obj, 'modifiers') else False
        has_mat = len(obj.data.materials) > 0 if hasattr(obj, 'data') and hasattr(obj.data, 'materials') else False
        score = 0
        checks = {}
        if geo.get("scale_applied", False): score += 20; checks["scale"] = "PASS"
        else: checks["scale"] = "FAIL"
        if geo.get("clean_topology", False): score += 25; checks["topology"] = "PASS"
        else: checks["topology"] = "WARN"
        if has_bevel: score += 20; checks["bevels"] = "PASS"
        else: checks["bevels"] = "WARN"
        if uv.get("valid", False): score += 15; checks["uv"] = "PASS"
        else: checks["uv"] = "FAIL"
        if has_mat: score += 20; checks["materials"] = "PASS"
        else: checks["materials"] = "FAIL"
        status = "PRODUCTION_READY" if score >= 80 else "NEEDS_IMPROVEMENT"
        return {"object": obj.name, "qa_score": f"{score}/100", "status": status, "checks": checks, "geometry_stats": geo}

    @staticmethod
    def cleanup_architectural_mesh(obj, merge_dist=0.001):
        """Cleanup duplicate vertices, dissolve degenerate edges, and recalc normals."""
        if not obj or obj.type != 'MESH' or not obj.data: return obj
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge_dist)
        bmesh.ops.dissolve_degenerate(bm, dist=merge_dist, edges=bm.edges)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(obj.data)
        bm.free()
        return obj

    @staticmethod
    def setup_architectural_normals(obj, angle_limit=35.0):
        """Configure smooth shading and auto-smooth / weighted normals for architectural surfaces."""
        if not obj or obj.type != 'MESH': return obj
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.shade_smooth()
        if hasattr(obj.data, "use_auto_smooth"):
            obj.data.use_auto_smooth = True
            obj.data.auto_smooth_angle = math.radians(angle_limit)
        return obj

    @staticmethod
    def create_architectural_bevel(obj, width=0.004, segments=3, angle_limit=35.0, add_weighted_normal=True):
        """Apply a scale-aware architectural bevel modifier with weighted normal."""
        if not obj or obj.type != 'MESH': return obj
        P.apply_scale(obj)
        min_dim = min(obj.dimensions) if hasattr(obj, 'dimensions') and min(obj.dimensions) > 0 else 1.0
        safe_width = min(width, min_dim * 0.1)
        for mod in list(obj.modifiers):
            if mod.type in {'BEVEL', 'WEIGHTED_NORMAL'}:
                obj.modifiers.remove(mod)
        if safe_width > 0:
            bmod = obj.modifiers.new(name="Bevel_Architectural", type='BEVEL')
            bmod.width = safe_width
            bmod.segments = max(2, segments)
            bmod.limit_method = 'ANGLE'
            bmod.angle_limit = math.radians(angle_limit)
            bmod.use_clamp_overlap = True
        if add_weighted_normal:
            wn = obj.modifiers.new(name="Weighted_Normal", type='WEIGHTED_NORMAL')
            wn.keep_sharp = True
        P.setup_architectural_normals(obj, angle_limit=angle_limit)
        return obj

    @staticmethod
    def create_wall_opening(wall_obj, opening_type="door", position=(0, 0, 0), size=(1.0, 0.5, 2.15), rotation_z=0.0):
        """
        Cut a clean architectural opening (door/window) into a wall mesh.
        position: (x, y, z_bottom) where z_bottom is sill/floor height.
        size: (width, depth, height).
        """
        if not wall_obj or wall_obj.type != 'MESH': return False
        import bmesh
        import mathutils
        c_mesh = bpy.data.meshes.new(f"_Cutter_{opening_type}_Mesh")
        c_obj = bpy.data.objects.new(f"_Cutter_{opening_type}", c_mesh)
        bpy.context.scene.collection.objects.link(c_obj)
        
        c_bm = bmesh.new()
        bmesh.ops.create_cube(c_bm, size=1.0)
        w, d, h = size
        d_punch = max(d, 0.6)
        bmesh.ops.scale(c_bm, vec=(w, d_punch, h), verts=c_bm.verts)
        px, py, pz = position
        cz = pz + h * 0.5
        bmesh.ops.translate(c_bm, vec=(px, py, cz), verts=c_bm.verts)
        if abs(rotation_z) > 1e-4:
            rot_mat = mathutils.Matrix.Rotation(rotation_z, 4, 'Z')
            c_bm.transform(rot_mat)
        c_bm.to_mesh(c_mesh)
        c_bm.free()
        
        mod = wall_obj.modifiers.new(name=f"Bool_{opening_type}", type='BOOLEAN')
        mod.operation = 'DIFFERENCE'
        mod.object = c_obj
        mod.solver = 'EXACT'
        
        bpy.context.view_layer.objects.active = wall_obj
        wall_obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        
        bpy.data.objects.remove(c_obj, do_unlink=True)
        bpy.data.meshes.remove(c_mesh, do_unlink=True)
        P.cleanup_architectural_mesh(wall_obj)
        return True

    @staticmethod
    def create_continuous_wall_mesh(paths_or_rooms, thickness=0.15, height=3.0, openings=None,
                                    name="ROOM_WALLS", material_preset="STRUCTURAL_CONCRETE",
                                    base_color=None, bevel_width=0.004, loc=(0,0,0), rot=(0,0,0)):
        """
        Construct a continuous, watertight, non-overlapping architectural wall mesh.
        Supports:
        - Rectangular room dimensions: (width, length)
        - 2D Closed Polygon list of points: [(x0,y0), (x1,y1), ...]
        - Multi-room layout list of room dicts: [{'name': 'R1', 'x': 0, 'y': 0, 'w': 5, 'l': 4}, ...]
        """
        import bmesh
        mesh = bpy.data.meshes.new(f"{name}_Mesh")
        wall_obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(wall_obj)
        
        # Case 1: Tuple/List of 2 floats -> (width, length) rectangular room
        if isinstance(paths_or_rooms, (tuple, list)) and len(paths_or_rooms) == 2 and isinstance(paths_or_rooms[0], (int, float)):
            width, length = float(paths_or_rooms[0]), float(paths_or_rooms[1])
            hw = width * 0.5
            hl = length * 0.5
            t = thickness
            bm = bmesh.new()
            v_out = [
                bm.verts.new((-hw - t, -hl - t, 0)),
                bm.verts.new(( hw + t, -hl - t, 0)),
                bm.verts.new(( hw + t,  hl + t, 0)),
                bm.verts.new((-hw - t,  hl + t, 0)),
            ]
            v_in = [
                bm.verts.new((-hw, -hl, 0)),
                bm.verts.new(( hw, -hl, 0)),
                bm.verts.new(( hw,  hl, 0)),
                bm.verts.new((-hw,  hl, 0)),
            ]
            base_faces = [
                bm.faces.new([v_out[0], v_out[1], v_in[1], v_in[0]]),
                bm.faces.new([v_out[1], v_out[2], v_in[2], v_in[1]]),
                bm.faces.new([v_out[2], v_out[3], v_in[3], v_in[2]]),
                bm.faces.new([v_out[3], v_out[0], v_in[0], v_in[3]]),
            ]
            extruded = bmesh.ops.extrude_face_region(bm, geom=base_faces)
            extruded_verts = [v for v in extruded['geom'] if isinstance(v, bmesh.types.BMVert)]
            bmesh.ops.translate(bm, vec=(0, 0, height), verts=extruded_verts)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(mesh)
            bm.free()

        # Case 2: Multi-room layout list of dicts: [{'x': ..., 'y': ..., 'w': ..., 'l': ...}, ...]
        elif isinstance(paths_or_rooms, list) and len(paths_or_rooms) > 0 and isinstance(paths_or_rooms[0], dict):
            rooms = paths_or_rooms
            t = thickness
            min_x = min(r.get('x', 0) for r in rooms)
            max_x = max(r.get('x', 0) + r.get('w', 4) for r in rooms)
            min_y = min(r.get('y', 0) for r in rooms)
            max_y = max(r.get('y', 0) + r.get('l', 4) for r in rooms)
            env_w = (max_x - min_x) + 2 * t
            env_l = (max_y - min_y) + 2 * t
            center_x = (min_x + max_x) * 0.5
            center_y = (min_y + max_y) * 0.5
            
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, vec=(env_w, env_l, height), verts=bm.verts)
            bmesh.ops.translate(bm, vec=(center_x, center_y, height * 0.5), verts=bm.verts)
            bm.to_mesh(mesh)
            bm.free()
            
            cutters = []
            for r_idx, r in enumerate(rooms):
                r_name = r.get('name', f"Room_{r_idx}")
                rx = r.get('x', 0) + r.get('w', 4) * 0.5
                ry = r.get('y', 0) + r.get('l', 4) * 0.5
                rw = r.get('w', 4)
                rl = r.get('l', 4)
                c_mesh = bpy.data.meshes.new(f"_Cutter_{r_name}_Mesh")
                c_obj = bpy.data.objects.new(f"_Cutter_{r_name}", c_mesh)
                bpy.context.scene.collection.objects.link(c_obj)
                c_bm = bmesh.new()
                bmesh.ops.create_cube(c_bm, size=1.0)
                bmesh.ops.scale(c_bm, vec=(rw, rl, height + 0.1), verts=c_bm.verts)
                bmesh.ops.translate(c_bm, vec=(rx, ry, height * 0.5), verts=c_bm.verts)
                c_bm.to_mesh(c_mesh)
                c_bm.free()
                cutters.append((c_obj, c_mesh))
                
            bpy.context.view_layer.objects.active = wall_obj
            wall_obj.select_set(True)
            for c_obj, c_mesh in cutters:
                mod = wall_obj.modifiers.new(name=f"Bool_{c_obj.name}", type='BOOLEAN')
                mod.operation = 'DIFFERENCE'
                mod.object = c_obj
                mod.solver = 'EXACT'
                bpy.ops.object.modifier_apply(modifier=mod.name)
                bpy.data.objects.remove(c_obj, do_unlink=True)
                bpy.data.meshes.remove(c_mesh, do_unlink=True)
            P.cleanup_architectural_mesh(wall_obj)

        # Case 3: 2D Closed Polygon list of points [(x0,y0), (x1,y1), ...]
        elif isinstance(paths_or_rooms, list) and len(paths_or_rooms) >= 3:
            import mathutils
            from mathutils import Vector
            points = paths_or_rooms
            n = len(points)
            pts = [Vector((p[0], p[1], 0.0)) for p in points]
            area2 = sum(pts[i].x * pts[(i+1)%n].y - pts[(i+1)%n].x * pts[i].y for i in range(n))
            if area2 < 0:
                pts.reverse()
            outer_pts = []
            for i in range(n):
                p_prev = pts[(i - 1 + n) % n]
                p_curr = pts[i]
                p_next = pts[(i + 1) % n]
                d_prev = (p_curr - p_prev).normalized()
                d_next = (p_next - p_curr).normalized()
                n_prev = Vector((d_prev.y, -d_prev.x, 0.0))
                n_next = Vector((d_next.y, -d_next.x, 0.0))
                bisector = (n_prev + n_next).normalized()
                cos_half_angle = bisector.dot(n_next)
                miter_len = min(thickness / cos_half_angle, thickness * 3.0) if abs(cos_half_angle) > 1e-4 else thickness
                outer_pts.append(p_curr + bisector * miter_len)
            bm = bmesh.new()
            v_in = [bm.verts.new(p) for p in pts]
            v_out = [bm.verts.new(p) for p in outer_pts]
            base_faces = [bm.faces.new([v_in[i], v_in[(i+1)%n], v_out[(i+1)%n], v_out[i]]) for i in range(n)]
            extruded = bmesh.ops.extrude_face_region(bm, geom=base_faces)
            extruded_verts = [v for v in extruded['geom'] if isinstance(v, bmesh.types.BMVert)]
            bmesh.ops.translate(bm, vec=(0, 0, height), verts=extruded_verts)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(mesh)
            bm.free()

        # Apply openings if provided
        if openings:
            for op in openings:
                op_type = op.get('type', 'door')
                pos = op.get('pos', (0, 0, 0))
                w = op.get('width', op.get('size', (1.0, 0.5, 2.15))[0] if 'size' in op else (1.0 if op_type == 'door' else 1.4))
                h = op.get('height', op.get('size', (1.0, 0.5, 2.15))[2] if 'size' in op else (2.15 if op_type == 'door' else 1.3))
                d = op.get('depth', op.get('size', (1.0, 0.5, 2.15))[1] if 'size' in op else thickness * 3.0)
                sill = op.get('sill', op.get('sill_height', 0.0 if op_type == 'door' else 0.90))
                rot_z = op.get('rot', op.get('rot_z', 0.0))
                
                if 'wall' in op and isinstance(paths_or_rooms, (tuple, list)) and len(paths_or_rooms) == 2:
                    w_side = str(op['wall']).upper()
                    w_off = float(op.get('offset', op.get('pos_x', 0.0)))
                    hw = float(paths_or_rooms[0]) * 0.5
                    hl = float(paths_or_rooms[1]) * 0.5
                    if w_side == "SOUTH":
                        pos = (w_off, -hl - thickness * 0.5, sill)
                        rot_z = 0.0
                    elif w_side == "NORTH":
                        pos = (w_off, hl + thickness * 0.5, sill)
                        rot_z = 0.0
                    elif w_side == "EAST":
                        pos = (hw + thickness * 0.5, w_off, sill)
                        rot_z = math.pi * 0.5
                    elif w_side == "WEST":
                        pos = (-hw - thickness * 0.5, w_off, sill)
                        rot_z = math.pi * 0.5
                elif len(pos) == 2:
                    pos = (pos[0], pos[1], sill)
                    
                P.create_wall_opening(
                    wall_obj,
                    opening_type=op_type,
                    position=pos,
                    size=(w, d, h),
                    rotation_z=rot_z
                )

        wall_obj.location = tuple(loc)
        wall_obj.rotation_euler = tuple(rot)
        P.apply_scale(wall_obj)
        P.create_architectural_bevel(wall_obj, width=bevel_width, segments=3, angle_limit=35.0, add_weighted_normal=True)
        P.smart_uv(wall_obj)
        mat = P.create_pbr_material(f"Mat_{name}", preset=material_preset, base_color=base_color)
        wall_obj.data.materials.clear()
        wall_obj.data.materials.append(mat)
        return wall_obj

    @staticmethod
    def create_wall_layout(*args, **kwargs):
        """Alias for create_continuous_wall_mesh."""
        return P.create_continuous_wall_mesh(*args, **kwargs)

    @staticmethod
    def room(name="ROOM", width=6.0, length=5.0, height=3.0, wall_thickness=0.15,
             doors=None, windows=None, include_floor=True, include_ceiling=False,
             material_walls="STRUCTURAL_CONCRETE", material_floor="WALNUT_WOOD",
             material_ceiling="MATTE_PLASTIC", loc=(0,0,0), rot=(0,0,0), bevel_width=0.004):
        """
        High-level production room generator. Creates:
        - Single continuous wall mesh with seamless corners and real openings
        - Optional continuous floor slab
        - Optional ceiling slab
        - Hierarchy under an empty root object
        """
        import bmesh
        openings = []
        if doors:
            for d in doors:
                d_copy = dict(d)
                d_copy['type'] = 'door'
                openings.append(d_copy)
        if windows:
            for w in windows:
                w_copy = dict(w)
                w_copy['type'] = 'window'
                openings.append(w_copy)
                
        wall_obj = P.create_continuous_wall_mesh(
            paths_or_rooms=(width, length),
            thickness=wall_thickness,
            height=height,
            openings=openings,
            name=f"{name}_WALLS",
            material_preset=material_walls,
            bevel_width=bevel_width
        )
        parts = [wall_obj]
        
        if include_floor:
            f_mesh = bpy.data.meshes.new(f"{name}_FLOOR_Mesh")
            f_obj = bpy.data.objects.new(f"{name}_FLOOR", f_mesh)
            bpy.context.scene.collection.objects.link(f_obj)
            f_bm = bmesh.new()
            bmesh.ops.create_cube(f_bm, size=1.0)
            fw = width + 2 * wall_thickness
            fl = length + 2 * wall_thickness
            f_depth = 0.15
            bmesh.ops.scale(f_bm, vec=(fw, fl, f_depth), verts=f_bm.verts)
            bmesh.ops.translate(f_bm, vec=(0, 0, -f_depth * 0.5), verts=f_bm.verts)
            f_bm.to_mesh(f_mesh)
            f_bm.free()
            P.apply_scale(f_obj)
            P.create_architectural_bevel(f_obj, width=0.003, segments=2)
            P.smart_uv(f_obj)
            mat_f = P.create_pbr_material(f"Mat_{name}_Floor", preset=material_floor)
            f_obj.data.materials.append(mat_f)
            parts.append(f_obj)
            
        if include_ceiling:
            c_mesh = bpy.data.meshes.new(f"{name}_CEILING_Mesh")
            c_obj = bpy.data.objects.new(f"{name}_CEILING", c_mesh)
            bpy.context.scene.collection.objects.link(c_obj)
            c_bm = bmesh.new()
            bmesh.ops.create_cube(c_bm, size=1.0)
            cw = width + 2 * wall_thickness
            cl = length + 2 * wall_thickness
            c_depth = 0.10
            bmesh.ops.scale(c_bm, vec=(cw, cl, c_depth), verts=c_bm.verts)
            bmesh.ops.translate(c_bm, vec=(0, 0, height + c_depth * 0.5), verts=c_bm.verts)
            c_bm.to_mesh(c_mesh)
            c_bm.free()
            P.apply_scale(c_obj)
            P.create_architectural_bevel(c_obj, width=0.003, segments=2)
            P.smart_uv(c_obj)
            mat_c = P.create_pbr_material(f"Mat_{name}_Ceiling", preset=material_ceiling)
            c_obj.data.materials.append(mat_c)
            parts.append(c_obj)
            
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=loc)
        root = bpy.context.active_object
        root.name = name
        root.rotation_euler = tuple(rot)
        for p in parts:
            p.parent = root
        return root

    @staticmethod
    def office_floor(name="OFFICE_FLOOR", rooms=None, height=3.0, wall_thickness=0.15,
                     openings=None, include_floor=True, include_ceiling=False,
                     material_walls="STRUCTURAL_CONCRETE", material_floor="WALNUT_WOOD",
                     loc=(0,0,0), rot=(0,0,0), bevel_width=0.004):
        """
        Multi-room office floor generator with connected continuous walls and corridor.
        """
        import bmesh
        if not rooms:
            rooms = [
                {"name": "Room_1_Work",    "x": 0.0,  "y": 0.0,  "w": 6.0, "l": 5.0},
                {"name": "Room_2_Manager", "x": 6.15, "y": 0.0,  "w": 5.0, "l": 5.0},
                {"name": "Room_3_Cafe",    "x": 0.0,  "y": 7.15, "w": 5.0, "l": 4.5},
                {"name": "Room_4_Meeting", "x": 5.15, "y": 7.15, "w": 6.0, "l": 4.5},
                {"name": "Corridor",       "x": 0.0,  "y": 5.15, "w": 11.15, "l": 1.85},
            ]
        if not openings:
            openings = [
                {"type": "door", "pos": (3.0, 5.075, 0.0), "size": (1.0, 0.5, 2.15)},
                {"type": "door", "pos": (8.5, 5.075, 0.0), "size": (1.0, 0.5, 2.15)},
                {"type": "door", "pos": (2.5, 7.075, 0.0), "size": (1.0, 0.5, 2.15)},
                {"type": "door", "pos": (8.0, 7.075, 0.0), "size": (1.0, 0.5, 2.15)},
                {"type": "window", "pos": (3.0, -0.075, 0.90), "size": (2.0, 0.5, 1.40)},
                {"type": "window", "pos": (8.5, -0.075, 0.90), "size": (2.0, 0.5, 1.40)},
                {"type": "window", "pos": (2.5, 11.725, 0.90), "size": (2.0, 0.5, 1.40)},
                {"type": "window", "pos": (8.0, 11.725, 0.90), "size": (2.0, 0.5, 1.40)},
            ]
        wall_obj = P.create_continuous_wall_mesh(
            paths_or_rooms=rooms,
            thickness=wall_thickness,
            height=height,
            openings=openings,
            name=f"{name}_WALLS",
            material_preset=material_walls,
            bevel_width=bevel_width
        )
        parts = [wall_obj]
        
        min_x = min(r['x'] for r in rooms)
        max_x = max(r['x'] + r['w'] for r in rooms)
        min_y = min(r['y'] for r in rooms)
        max_y = max(r['y'] + r['l'] for r in rooms)
        fw = (max_x - min_x) + 2 * wall_thickness
        fl = (max_y - min_y) + 2 * wall_thickness
        cx = (min_x + max_x) * 0.5
        cy = (min_y + max_y) * 0.5
        
        if include_floor:
            f_mesh = bpy.data.meshes.new(f"{name}_FLOOR_Mesh")
            f_obj = bpy.data.objects.new(f"{name}_FLOOR", f_mesh)
            bpy.context.scene.collection.objects.link(f_obj)
            f_bm = bmesh.new()
            bmesh.ops.create_cube(f_bm, size=1.0)
            f_depth = 0.15
            bmesh.ops.scale(f_bm, vec=(fw, fl, f_depth), verts=f_bm.verts)
            bmesh.ops.translate(f_bm, vec=(cx, cy, -f_depth * 0.5), verts=f_bm.verts)
            f_bm.to_mesh(f_mesh)
            f_bm.free()
            P.apply_scale(f_obj)
            P.create_architectural_bevel(f_obj, width=0.003, segments=2)
            P.smart_uv(f_obj)
            mat_f = P.create_pbr_material(f"Mat_{name}_Floor", preset=material_floor)
            f_obj.data.materials.append(mat_f)
            parts.append(f_obj)
            
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=loc)
        root = bpy.context.active_object
        root.name = name
        root.rotation_euler = tuple(rot)
        for p in parts:
            p.parent = root
        return root

    @staticmethod
    def stairs(name="Industrial_Stairs", width=1.20, total_height=3.60, num_steps=18,
               tread_depth=0.28, stringer_width=0.05, loc=(0,0,0), rot=(0,0,0)):
        """Production stairs with treads, risers, and structural stringers."""
        riser_h = total_height / max(1, num_steps)
        parts = []
        for i in range(num_steps):
            x = 0.0
            y = i * tread_depth
            z = (i + 1) * riser_h - riser_h * 0.5
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y, z))
            step = bpy.context.active_object
            step.name = f"{name}_Step_{i+1:02d}"
            step.scale = (width, tread_depth, riser_h)
            parts.append(step)
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts: p.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        stairs_obj = bpy.context.active_object
        stairs_obj.name = f"{name}_Mesh"
        P.apply_scale(stairs_obj)
        P.create_architectural_bevel(stairs_obj, width=0.004, segments=2)
        P.smart_uv(stairs_obj)
        mat = P.create_pbr_material(f"Mat_{name}", preset="DARK_METAL")
        stairs_obj.data.materials.append(mat)
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=loc)
        root = bpy.context.active_object
        root.name = name
        root.rotation_euler = tuple(rot)
        stairs_obj.parent = root
        return root

    @staticmethod
    def generate_unity_colliders(wall_obj, collection_name="5_Unity_Colliders"):
        """Generate simplified box collider in Unity colliders collection."""
        if not wall_obj or wall_obj.type != 'MESH': return []
        import bmesh
        col = bpy.data.collections.get(collection_name)
        if not col:
            col = bpy.data.collections.new(collection_name)
            bpy.context.scene.collection.children.link(col)
        mesh_col = bpy.data.meshes.new(f"COL_{wall_obj.name}_Mesh")
        obj_col = bpy.data.objects.new(f"COL_{wall_obj.name}", mesh_col)
        col.objects.link(obj_col)
        bm = bmesh.new()
        bm.from_mesh(wall_obj.data)
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(5.0), verts=bm.verts, edges=bm.edges)
        bm.to_mesh(mesh_col)
        bm.free()
        obj_col.location = wall_obj.location
        obj_col.rotation_euler = wall_obj.rotation_euler
        obj_col.scale = wall_obj.scale
        obj_col.display_type = 'WIRE'
        obj_col.hide_render = True
        return [obj_col.name]



# ─────────────────────────────────────────────────────────────────────
# PH  — Poly Haven Production Integration Layer
# ─────────────────────────────────────────────────────────────────────
class PH:
    """
    Poly Haven Integration Layer — uses the installed polyhavenassets addon's
    local asset library cache and blend files. NO external API calls;
    assets are served directly from the local library.
    """

    PH_LIB_NAME = "poly haven"

    TYPE_HDRI    = 0
    TYPE_TEXTURE = 1
    TYPE_MODEL   = 2
    TYPE_NAMES   = {0: "hdri", 1: "texture", 2: "model"}
    TYPE_CODES   = {
        "hdri": 0, "hdris": 0, "environment": 0,
        "texture": 1, "textures": 1, "material": 1, "materials": 1, "mat": 1,
        "model": 2, "models": 2, "mesh": 2, "object": 2, "prop": 2, "props": 2,
        "all": None
    }

    # ── Library discovery ─────────────────────────────────────────────
    @staticmethod
    def check_addon():
        """Verify the polyhavenassets addon is enabled."""
        try:
            import addon_utils
            enabled = addon_utils.check("polyhavenassets")[1]
            if not enabled:
                addon_utils.enable("polyhavenassets", default_set=True)
                enabled = addon_utils.check("polyhavenassets")[1]
            return {"available": bool(enabled), "module": "polyhavenassets"}
        except Exception as e:
            return {"available": False, "error": str(e)}

    @staticmethod
    def get_asset_lib_path():
        """Return the Path to the 'Poly Haven' asset library, or None."""
        try:
            for lib in bpy.context.preferences.filepaths.asset_libraries:
                if lib.name.lower() == PH.PH_LIB_NAME:
                    p = Path(bpy.path.abspath(lib.path))
                    if p.exists():
                        return p
        except Exception:
            pass
        # Known default paths
        candidates = [
            Path(r"C:\Users\avina\Documents\Blender\Assets\Poly Haven"),
            Path(os.path.expanduser(r"~\Documents\Blender\Assets\Poly Haven")),
        ]
        for c in candidates:
            if c.exists():
                return c
        return None

    @staticmethod
    def get_asset_list_cache():
        """Load local asset list cache. Returns (error_str_or_None, dict_or_None)."""
        lib_path = PH.get_asset_lib_path()
        if lib_path is None:
            return ('Poly Haven asset library not found. '
                    'Configure an asset library named "Poly Haven" in Blender Preferences.', None)
        cache_file = lib_path / "asset_list_cache.json"
        if not cache_file.exists():
            return (f'Asset list cache not found at {cache_file}', None)
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return (None, data)
        except Exception as e:
            return (f"Failed to read asset cache: {e}", None)

    # ── Natural Language Smart Search ─────────────────────────────────
    @staticmethod
    def search(query="", asset_type=None, max_results=20):
        """
        Token-aware natural language search against local Poly Haven catalog.
        Supports natural requests like 'office chair', 'dirty concrete', 'dark industrial'.
        """
        # Normalize asset_type if passed as string
        if isinstance(asset_type, str):
            asset_type = PH.TYPE_CODES.get(asset_type.lower(), None)

        error, assets = PH.get_asset_list_cache()
        if error:
            return {"error": error, "results": [], "count": 0}

        lib_path = PH.get_asset_lib_path()
        tokens = [t.lower().strip() for t in query.split() if t.strip()]
        results = []

        for slug, info in assets.items():
            t = info.get("type", -1)
            if asset_type is not None and t != asset_type:
                continue

            name = info.get("name", slug).lower()
            slug_lower = slug.lower()
            cats = [c.lower() for c in info.get("categories", [])]
            tags = [t2.lower() for t2 in info.get("tags", [])]

            if not tokens:
                score = 1
            else:
                score = 0
                full_q = " ".join(tokens)
                if full_q in name or full_q in slug_lower:
                    score += 100
                elif any(full_q in c for c in cats) or any(full_q in tag for tag in tags):
                    score += 80

                token_matches = 0
                for token in tokens:
                    if token in slug_lower or token in name:
                        score += 30
                        token_matches += 1
                    elif any(token in c for c in cats):
                        score += 20
                        token_matches += 1
                    elif any(token in tag for tag in tags):
                        score += 10
                        token_matches += 1

                if token_matches == 0:
                    continue
                if token_matches == len(tokens):
                    score += 50

            downloaded = lib_path is not None and (lib_path / slug / f"{slug}.blend").exists()

            results.append({
                "slug": slug,
                "name": info.get("name", slug),
                "type": t,
                "type_name": PH.TYPE_NAMES.get(t, "unknown"),
                "score": score,
                "categories": info.get("categories", []),
                "tags": info.get("tags", [])[:8],
                "downloaded": downloaded,
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        top_results = results[:max_results]

        return {
            "query": query,
            "asset_type": asset_type,
            "count": len(top_results),
            "total_matches": len(results),
            "results": top_results,
        }

    # ── Model Import ──────────────────────────────────────────────────
    @staticmethod
    def import_model(slug, location=(0, 0, 0), rotation=(0, 0, 0), scale=1.0, resolution="1k"):
        """
        Import a Poly Haven model into the current scene from its local .blend file.
        Automatically grounds at location Z, sets rotation/scale, registers metadata.
        """
        lib_path = PH.get_asset_lib_path()
        if not lib_path:
            return {"status": "error", "message": "Poly Haven asset library not configured", "slug": slug}

        blend_file = lib_path / slug / f"{slug}.blend"
        if not blend_file.exists():
            return {"status": "error", "message": f"Blend file not found: {blend_file}", "slug": slug}

        # Inspect blend file contents
        try:
            with bpy.data.libraries.load(str(blend_file), link=False) as (data_from, data_to):
                avail_collections = list(data_from.collections)
                avail_objects = list(data_from.objects)
        except Exception as e:
            return {"status": "error", "message": f"Failed to read blend file: {e}", "slug": slug}

        # Determine target collection
        target_collection = None
        for candidate in [f"{slug}_LOD0", f"{slug}_static", slug]:
            if candidate in avail_collections:
                target_collection = candidate
                break
        if not target_collection and avail_collections:
            target_collection = avail_collections[0]

        pre_objects = set(bpy.data.objects.keys())
        pre_collections = set(bpy.data.collections.keys())

        if target_collection:
            try:
                bpy.ops.wm.append(
                    filepath=str(blend_file / "Collection" / target_collection),
                    directory=str(blend_file) + "/Collection/",
                    filename=target_collection,
                    link=False,
                    autoselect=True,
                )
            except Exception as e:
                return {"status": "error", "message": f"bpy.ops.wm.append collection failed: {e}", "slug": slug}
        else:
            # Append objects directly if no collection
            for obj_name in avail_objects:
                try:
                    bpy.ops.wm.append(
                        filepath=str(blend_file / "Object" / obj_name),
                        directory=str(blend_file) + "/Object/",
                        filename=obj_name,
                        link=False,
                    )
                except Exception as e:
                    return {"status": "error", "message": f"bpy.ops.wm.append object failed: {e}", "slug": slug}

        new_objects = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in pre_objects]
        new_collections = [bpy.data.collections[k] for k in bpy.data.collections.keys() if k not in pre_collections]

        imported_col = new_collections[0] if new_collections else None
        if not imported_col and target_collection:
            imported_col = bpy.data.collections.get(target_collection)

        # Link imported collection to active scene if not linked
        if imported_col and imported_col.name not in bpy.context.scene.collection.children:
            try:
                bpy.context.scene.collection.children.link(imported_col)
            except Exception:
                pass

        # Apply transforms to root objects
        root_objects = [o for o in new_objects if o.parent is None]
        for obj in root_objects:
            obj.location = (obj.location[0] + location[0],
                            obj.location[1] + location[1],
                            obj.location[2] + location[2])
            obj.rotation_euler = tuple(rotation)
            if scale != 1.0:
                obj.scale = (obj.scale[0] * scale, obj.scale[1] * scale, obj.scale[2] * scale)

        # Auto-ground to target location Z
        if imported_col:
            PH.auto_ground(imported_col, target_z=location[2])
        elif new_objects:
            for obj in new_objects:
                if obj.type == 'MESH':
                    PH.auto_ground(obj, target_z=location[2])

        # Register metadata
        PH.register_asset(slug, PH.TYPE_MODEL, imported_col, new_objects)

        # Auto-scale check
        scale_check = PH.auto_scale(imported_col if imported_col else (new_objects[0] if new_objects else None))

        return {
            "status": "imported",
            "slug": slug,
            "collection": imported_col.name if imported_col else None,
            "objects_imported": [o.name for o in new_objects],
            "object_count": len(new_objects),
            "location": list(location),
            "scale_check": scale_check,
        }

    # ── Texture / Material Import ─────────────────────────────────────
    @staticmethod
    def import_texture(slug, target_object_names=None, resolution="2k"):
        """
        Append a Poly Haven material from its local blend file and assign to target objects.
        Validates UVs and auto-generates smart UVs if needed.
        """
        lib_path = PH.get_asset_lib_path()
        if not lib_path:
            return {"status": "error", "message": "Poly Haven asset library not configured", "slug": slug}

        blend_file = lib_path / slug / f"{slug}.blend"
        if not blend_file.exists():
            return {"status": "error", "message": f"Blend file not found: {blend_file}", "slug": slug}

        try:
            with bpy.data.libraries.load(str(blend_file), link=False) as (data_from, data_to):
                avail_mats = list(data_from.materials)
        except Exception as e:
            return {"status": "error", "message": f"Failed to read blend file: {e}", "slug": slug}

        if not avail_mats:
            return {"status": "error", "message": f"No materials found in {blend_file}", "slug": slug}

        mat_name = slug if slug in avail_mats else avail_mats[0]
        mat = bpy.data.materials.get(mat_name)

        if not mat:
            try:
                bpy.ops.wm.append(
                    filepath=str(blend_file / "Material" / mat_name),
                    directory=str(blend_file) + "/Material/",
                    filename=mat_name,
                    link=False,
                )
                mat = bpy.data.materials.get(mat_name)
            except Exception as e:
                return {"status": "error", "message": f"Failed to append material: {e}", "slug": slug}

        if not mat:
            return {"status": "error", "message": f"Material {mat_name} not found after append", "slug": slug}

        # Tag material with PH metadata
        mat["ph_slug"] = slug
        mat["ph_source"] = "polyhaven.com"

        # Validate material
        mat_validation = PH.validate_material(mat)

        # Assign to target objects
        assigned_to = []
        if target_object_names:
            for name in target_object_names:
                obj = bpy.data.objects.get(name)
                if obj and obj.type == 'MESH':
                    # Validate UV
                    uv_info = P.validate_uv(obj)
                    if not uv_info.get("valid"):
                        P.smart_uv(obj)
                    if len(obj.data.materials) == 0:
                        obj.data.materials.append(mat)
                    else:
                        obj.data.materials[0] = mat
                    assigned_to.append(name)

        return {
            "status": "applied",
            "slug": slug,
            "material": mat.name,
            "assigned_to": assigned_to,
            "material_validation": mat_validation,
        }

    # ── HDRI Import ───────────────────────────────────────────────────
    @staticmethod
    def load_hdri(slug, rotation_z=0.0, strength=1.0, resolution="1k"):
        """
        Load a Poly Haven HDRI from its local blend file and set as the scene World.
        """
        lib_path = PH.get_asset_lib_path()
        if not lib_path:
            return {"status": "error", "message": "Poly Haven asset library not configured", "slug": slug}

        blend_file = lib_path / slug / f"{slug}.blend"
        if not blend_file.exists():
            return {"status": "error", "message": f"Blend file not found: {blend_file}", "slug": slug}

        try:
            with bpy.data.libraries.load(str(blend_file), link=False) as (data_from, data_to):
                avail_worlds = list(data_from.worlds)
                avail_node_groups = list(data_from.node_groups)
        except Exception as e:
            return {"status": "error", "message": f"Failed to read blend file: {e}", "slug": slug}

        world_name = slug if slug in avail_worlds else (avail_worlds[0] if avail_worlds else None)
        if not world_name:
            return {"status": "error", "message": f"No worlds found in {blend_file}", "slug": slug}

        world = bpy.data.worlds.get(world_name)
        if not world:
            # Also append node groups first if present
            for ng in avail_node_groups:
                if not bpy.data.node_groups.get(ng):
                    try:
                        bpy.ops.wm.append(
                            filepath=str(blend_file / "NodeTree" / ng),
                            directory=str(blend_file) + "/NodeTree/",
                            filename=ng,
                            link=False,
                        )
                    except Exception:
                        pass

            try:
                bpy.ops.wm.append(
                    filepath=str(blend_file / "World" / world_name),
                    directory=str(blend_file) + "/World/",
                    filename=world_name,
                    link=False,
                )
                world = bpy.data.worlds.get(world_name)
            except Exception as e:
                return {"status": "error", "message": f"Failed to append world: {e}", "slug": slug}

        if not world:
            return {"status": "error", "message": f"World {world_name} not found after append", "slug": slug}

        # Tag world
        world["ph_slug"] = slug
        world["ph_source"] = "polyhaven.com"

        # Set as active scene world
        bpy.context.scene.world = world

        # Configure strength and rotation
        if world.node_tree:
            for node in world.node_tree.nodes:
                if node.type == 'BACKGROUND':
                    node.inputs['Strength'].default_value = strength
                elif node.type == 'MAPPING':
                    node.inputs['Rotation'].default_value = (0.0, 0.0, math.radians(rotation_z))

        return {
            "status": "loaded",
            "slug": slug,
            "world": world.name,
            "strength": strength,
            "rotation_z": rotation_z,
        }

    # ── Scene Management & Asset Tracking ─────────────────────────────
    @staticmethod
    def find_existing(slug):
        """Find a collection or object in the current scene with this PH slug."""
        for col in bpy.data.collections:
            if col.get("ph_slug") == slug:
                return col
        for candidate in [f"{slug}_LOD0", f"{slug}_static", slug]:
            col = bpy.data.collections.get(candidate)
            if col:
                return col
        return None

    @staticmethod
    def register_asset(slug, asset_type, collection=None, objects=None):
        """Store Poly Haven metadata as custom properties on collection and objects."""
        if collection:
            collection["ph_slug"] = slug
            collection["ph_type"] = PH.TYPE_NAMES.get(asset_type, "unknown")
            collection["ph_source"] = "polyhaven.com"
        if objects:
            for obj in objects:
                try:
                    obj["ph_slug"] = slug
                    obj["ph_source"] = "polyhaven.com"
                except Exception:
                    pass
        return {"registered": True, "slug": slug}

    @staticmethod
    def duplicate_existing(slug, location=(0, 0, 0)):
        """Duplicate an already-imported PH asset in scene instead of re-importing."""
        col = PH.find_existing(slug)
        if not col:
            return {"status": "not_in_scene", "slug": slug}

        bpy.ops.object.select_all(action='DESELECT')
        root_objs = [o for o in col.all_objects if o.parent is None]
        for obj in root_objs:
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj

        bpy.ops.object.duplicate()
        new_roots = list(bpy.context.selected_objects)

        offset = (location[0] - root_objs[0].location[0] if root_objs else 0,
                  location[1] - root_objs[0].location[1] if root_objs else 0,
                  location[2] - root_objs[0].location[2] if root_objs else 0)

        for obj in new_roots:
            obj.location = (obj.location[0] + offset[0],
                            obj.location[1] + offset[1],
                            obj.location[2] + offset[2])

        return {
            "status": "duplicated",
            "slug": slug,
            "new_objects": [o.name for o in new_roots],
            "location": list(location),
        }

    @staticmethod
    def replace_asset(old_slug_or_name, new_slug, resolution="1k"):
        """Replace an existing PH asset with a new one, preserving transform."""
        old_col = PH.find_existing(old_slug_or_name)
        old_obj = bpy.data.objects.get(old_slug_or_name)

        old_loc = (0, 0, 0)
        old_rot = (0, 0, 0)
        old_scale = 1.0

        if old_col and old_col.all_objects:
            root = next((o for o in old_col.all_objects if o.parent is None), list(old_col.all_objects)[0])
            old_loc = tuple(root.location)
            old_rot = tuple(root.rotation_euler)
            old_scale = root.scale[0]
        elif old_obj:
            old_loc = tuple(old_obj.location)
            old_rot = tuple(old_obj.rotation_euler)
            old_scale = old_obj.scale[0]

        # Import new model at old location
        res = PH.import_model(new_slug, location=old_loc, rotation=old_rot, scale=old_scale, resolution=resolution)
        if res.get("status") == "error":
            return res

        # Remove old asset
        if old_col:
            for obj in list(old_col.all_objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(old_col)
        elif old_obj:
            bpy.data.objects.remove(old_obj, do_unlink=True)

        return {
            "status": "replaced",
            "old_asset": old_slug_or_name,
            "new_asset": new_slug,
            "location_preserved": list(old_loc),
            "import_result": res,
        }

    # ── Scale & Placement ─────────────────────────────────────────────
    @staticmethod
    def auto_scale(collection_or_obj):
        """Inspect bounding box and dimensions to verify physical scale."""
        import mathutils
        if isinstance(collection_or_obj, str):
            collection_or_obj = bpy.data.collections.get(collection_or_obj) or bpy.data.objects.get(collection_or_obj)
        if not collection_or_obj:
            return {"status": "not_found"}

        objects = list(collection_or_obj.all_objects) if hasattr(collection_or_obj, 'all_objects') else [collection_or_obj]
        mesh_objs = [o for o in objects if o.type == 'MESH']
        if not mesh_objs:
            return {"status": "no_mesh"}

        min_co = mathutils.Vector((float('inf'),) * 3)
        max_co = mathutils.Vector((float('-inf'),) * 3)
        for obj in mesh_objs:
            for corner in obj.bound_box:
                world_co = obj.matrix_world @ mathutils.Vector(corner)
                min_co = mathutils.Vector(min(a, b) for a, b in zip(min_co, world_co))
                max_co = mathutils.Vector(max(a, b) for a, b in zip(max_co, world_co))

        dims = max_co - min_co
        max_dim = max(abs(d) for d in dims)

        status = "ok"
        warning = None
        if max_dim < 0.01:
            status = "suspicious"
            warning = "Asset is very small (<1cm) — check scale"
        elif max_dim > 50.0:
            status = "suspicious"
            warning = f"Asset is very large ({max_dim:.2f}m) — check scale"

        return {
            "dimensions": [round(float(d), 4) for d in dims],
            "max_dimension": round(float(max_dim), 4),
            "status": status,
            "warning": warning,
        }

    @staticmethod
    def auto_ground(collection_or_obj, target_z=0.0):
        """Move an asset so its lowest vertex or bound box point touches target_z."""
        import mathutils
        if isinstance(collection_or_obj, str):
            collection_or_obj = bpy.data.collections.get(collection_or_obj) or bpy.data.objects.get(collection_or_obj)
        if not collection_or_obj:
            return {"status": "not_found"}

        objects = list(collection_or_obj.all_objects) if hasattr(collection_or_obj, 'all_objects') else [collection_or_obj]
        mesh_objs = [o for o in objects if o.type == 'MESH']
        if not mesh_objs:
            return {"status": "no_mesh"}

        min_z = float('inf')
        for obj in mesh_objs:
            for corner in obj.bound_box:
                wz = (obj.matrix_world @ mathutils.Vector(corner)).z
                if wz < min_z:
                    min_z = wz

        if min_z == float('inf'):
            return {"status": "no_bounds"}

        z_offset = target_z - min_z
        root_objs = [o for o in objects if o.parent is None]
        for obj in root_objs:
            obj.location.z += z_offset

        return {"status": "grounded", "z_offset": round(float(z_offset), 5), "target_z": target_z}

    # ── Material Validation ───────────────────────────────────────────
    @staticmethod
    def validate_material(material):
        """Inspect a PH material's shader tree for PBR inputs."""
        if not material:
            return {"valid": False, "error": "Material is None"}

        report = {
            "name": material.name,
            "has_base_color": False,
            "has_roughness": False,
            "has_normal": False,
            "has_metallic": False,
            "image_textures": [],
        }

        if material.node_tree:
            for node in material.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    if node.inputs.get('Base Color') and (node.inputs['Base Color'].is_linked or node.inputs['Base Color'].default_value[0] > 0):
                        report["has_base_color"] = True
                    if node.inputs.get('Roughness') and node.inputs['Roughness'].is_linked:
                        report["has_roughness"] = True
                    if node.inputs.get('Normal') and node.inputs['Normal'].is_linked:
                        report["has_normal"] = True
                    if node.inputs.get('Metallic') and node.inputs['Metallic'].is_linked:
                        report["has_metallic"] = True
                elif node.type == 'TEX_IMAGE' and node.image:
                    report["image_textures"].append(node.image.name)

        score = sum([report["has_base_color"], report["has_roughness"], report["has_normal"]])
        report["pbr_score"] = f"{score}/3"
        report["valid"] = score >= 1
        return report

    # ── Inspection ────────────────────────────────────────────────────
    @staticmethod
    def inspect_imported(slug_or_name):
        """Inspect a Poly Haven imported asset in the current scene."""
        col = PH.find_existing(slug_or_name)
        obj = bpy.data.objects.get(slug_or_name)

        target = col if col else obj
        if not target:
            return {"error": f"Asset '{slug_or_name}' not found in scene"}

        objects = list(col.all_objects) if col else [obj]
        obj_reports = []
        for o in objects:
            mats = []
            if o.type == 'MESH':
                for slot in o.material_slots:
                    if slot.material:
                        mats.append(PH.validate_material(slot.material))
            obj_reports.append({
                "name": o.name,
                "type": o.type,
                "location": [round(float(v), 4) for v in o.location],
                "dimensions": [round(float(d), 4) for d in o.dimensions] if hasattr(o, 'dimensions') else [],
                "materials": mats,
            })

        scale_info = PH.auto_scale(target)

        return {
            "slug_or_name": slug_or_name,
            "collection": col.name if col else None,
            "object_count": len(objects),
            "objects": obj_reports,
            "scale": scale_info,
            "ph_metadata": {
                "ph_slug": target.get("ph_slug", ""),
                "ph_type": target.get("ph_type", ""),
                "ph_source": target.get("ph_source", ""),
            }
        }

    @staticmethod
    def status():
        """Quick status check of Poly Haven integration."""
        lib_path = PH.get_asset_lib_path()
        addon_check = PH.check_addon()
        error, assets = PH.get_asset_list_cache()

        downloaded_count = 0
        if lib_path and not error and assets:
            downloaded_count = len(assets)

        return {
            "addon_available": addon_check.get("available", False),
            "lib_path": str(lib_path) if lib_path else None,
            "lib_found": lib_path is not None,
            "cache_loaded": error is None,
            "total_assets_in_catalog": len(assets) if assets else 0,
            "downloaded_count": downloaded_count,
            "cache_error": error,
        }


# ─────────────────────────────────────────────────────────────────────
# Inject into builtins
# ─────────────────────────────────────────────────────────────────────
builtins.P = P
builtins.PH = PH


# ─────────────────────────────────────────────────────────────────────
# WebSocket MCP Bridge Server
# ─────────────────────────────────────────────────────────────────────
try:
    import websockets
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False

_server_thread = None
_server_loop = None
_server_instance = None
_PORT = 9882


def _run_script_handler(script_code):
    """Execute Python code in Blender's main thread via bpy.app.timers."""
    import bmesh
    import mathutils
    result_container = [None]
    error_container = [None]
    done_event = threading.Event()

    def _execute():
        try:
            namespace = {
                'bpy': bpy,
                'bmesh': bmesh,
                'mathutils': mathutils,
                'math': math,
                'random': random,
                'os': os,
                'P': P,
                'PH': PH,
                'result': None,
            }
            exec(script_code, namespace)
            result_container[0] = namespace.get('result')
        except Exception as ex:
            error_container[0] = str(ex) + "\n" + traceback.format_exc()
        finally:
            done_event.set()
        return None

    bpy.app.timers.register(_execute, first_interval=0.0)
    done_event.wait(timeout=120.0)

    if error_container[0]:
        return {"error": error_container[0]}
    return {"out": result_container[0]}


async def _ws_handler(websocket):
    """Handle incoming WebSocket MCP messages."""
    try:
        async for message in websocket:
            try:
                req = json.loads(message)
            except json.JSONDecodeError as e:
                await websocket.send(json.dumps({"id": "?", "ok": 0, "e": {"c": "PARSE_ERROR", "m": str(e)}}))
                continue

            req_id = req.get("id", "?")
            req_type = req.get("type", "")
            params = req.get("params", {})

            try:
                if req_type == "ping":
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": {"pong": True}}))

                elif req_type == "get_version":
                    resp_data = {
                        "bl": bpy.app.version_string,
                        "addon": "2.1.0",
                        "sc": bpy.context.scene.name,
                    }
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": resp_data}))

                elif req_type == "run_script":
                    script = params.get("script", "")
                    result = _run_script_handler(script)
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": result}))

                elif req_type == "get_scene_info":
                    limit = params.get("limit", 20)
                    offset = params.get("offset", 0)
                    filter_type = params.get("filter_type", "ALL")

                    objects = []
                    for obj in bpy.context.scene.objects:
                        if filter_type != "ALL" and obj.type != filter_type:
                            continue
                        objects.append({
                            "name": obj.name,
                            "type": obj.type,
                            "location": [round(float(v), 4) for v in obj.location],
                            "visible": obj.visible_get(),
                            "ph_slug": obj.get("ph_slug", ""),
                        })

                    paged = objects[offset:offset + limit]
                    await websocket.send(json.dumps({
                        "id": req_id, "ok": 1,
                        "d": {"total": len(objects), "offset": offset, "objects": paged}
                    }))

                elif req_type in ("ph_search", "ph_import", "ph_texture", "ph_hdri",
                                  "ph_replace", "ph_inspect", "ph_status"):
                    def _ph_dispatch():
                        try:
                            if req_type == "ph_search":
                                return PH.search(
                                    query=params.get("query", ""),
                                    asset_type=params.get("asset_type"),
                                    max_results=params.get("max_results", 20),
                                )
                            elif req_type == "ph_import":
                                return PH.import_model(
                                    slug=params.get("slug", ""),
                                    location=tuple(params.get("location", [0, 0, 0])),
                                    rotation=tuple(params.get("rotation", [0, 0, 0])),
                                    scale=params.get("scale", 1.0),
                                    resolution=params.get("resolution", "1k"),
                                )
                            elif req_type == "ph_texture":
                                return PH.import_texture(
                                    slug=params.get("slug", ""),
                                    target_object_names=params.get("objects"),
                                    resolution=params.get("resolution", "2k"),
                                )
                            elif req_type == "ph_hdri":
                                return PH.load_hdri(
                                    slug=params.get("slug", ""),
                                    rotation_z=params.get("rotation_z", 0.0),
                                    strength=params.get("strength", 1.0),
                                    resolution=params.get("resolution", "1k"),
                                )
                            elif req_type == "ph_replace":
                                return PH.replace_asset(
                                    old_slug_or_name=params.get("old_slug", ""),
                                    new_slug=params.get("new_slug", ""),
                                    resolution=params.get("resolution", "1k"),
                                )
                            elif req_type == "ph_inspect":
                                return PH.inspect_imported(params.get("slug", ""))
                            elif req_type == "ph_status":
                                return PH.status()
                        except Exception as e:
                            return {"error": str(e), "traceback": traceback.format_exc()}

                    result_container = [None]
                    done_event = threading.Event()

                    def _main_thread_ph():
                        result_container[0] = _ph_dispatch()
                        done_event.set()
                        return None

                    bpy.app.timers.register(_main_thread_ph, first_interval=0.0)
                    done_event.wait(timeout=120.0)
                    result = result_container[0] or {"error": "timeout or no result"}
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": result}))

                elif req_type == "inspect_scene":
                    def _inspect():
                        scene = bpy.context.scene
                        collections = []
                        for col in bpy.data.collections:
                            collections.append({
                                "name": col.name,
                                "objects": len(list(col.objects)),
                                "ph_slug": col.get("ph_slug", ""),
                                "ph_type": col.get("ph_type", ""),
                            })
                        return {
                            "scene": scene.name,
                            "object_count": len(list(scene.objects)),
                            "collections": collections,
                            "bl_version": bpy.app.version_string,
                            "ph_status": PH.status(),
                        }

                    result_c = [None]
                    ev = threading.Event()
                    def _mt(): result_c[0] = _inspect(); ev.set(); return None
                    bpy.app.timers.register(_mt, first_interval=0.0)
                    ev.wait(timeout=30.0)
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": result_c[0]}))

                elif req_type == "inspect_object":
                    obj_name = params.get("name", "")
                    def _inspect_obj():
                        obj = bpy.data.objects.get(obj_name)
                        if not obj:
                            return {"error": f"Object '{obj_name}' not found"}
                        geo = P.validate_geometry(obj) if obj.type == 'MESH' else {}
                        uv = P.validate_uv(obj) if obj.type == 'MESH' else {}
                        qa = P.quality_check(obj)
                        return {"object": obj_name, "geometry": geo, "uv": uv, "qa": qa}

                    result_c = [None]
                    ev = threading.Event()
                    def _mt2(): result_c[0] = _inspect_obj(); ev.set(); return None
                    bpy.app.timers.register(_mt2, first_interval=0.0)
                    ev.wait(timeout=30.0)
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": result_c[0]}))

                elif req_type in ("render_preview", "render_inspection"):
                    cam_name = params.get("camera", params.get("cam", "Cam_Inspect_Hero_3D"))
                    def _render():
                        return P.render_inspection(cam_name)
                    result_c = [None]
                    ev = threading.Event()
                    def _mt3(): result_c[0] = _render(); ev.set(); return None
                    bpy.app.timers.register(_mt3, first_interval=0.0)
                    ev.wait(timeout=120.0)
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": result_c[0]}))

                elif req_type == "quality_check":
                    def _qc():
                        obj = bpy.data.objects.get(params.get("name", ""))
                        return P.quality_check(obj) if obj else {"error": "Object not found"}
                    result_c = [None]
                    ev = threading.Event()
                    def _mt4(): result_c[0] = _qc(); ev.set(); return None
                    bpy.app.timers.register(_mt4, first_interval=0.0)
                    ev.wait(timeout=30.0)
                    await websocket.send(json.dumps({"id": req_id, "ok": 1, "d": result_c[0]}))

                else:
                    await websocket.send(json.dumps({
                        "id": req_id, "ok": 0,
                        "e": {"c": "UNKNOWN_TYPE", "m": f"Unknown request type: {req_type}"}
                    }))

            except Exception as handler_ex:
                await websocket.send(json.dumps({
                    "id": req_id, "ok": 0,
                    "e": {"c": "HANDLER_ERROR", "m": str(handler_ex)}
                }))
    except Exception:
        pass


async def _ws_server_main():
    global _server_instance
    try:
        async with websockets.serve(_ws_handler, "0.0.0.0", _PORT) as server:
            _server_instance = server
            print(f"[MCP Connector v2] WebSocket server running on ws://0.0.0.0:{_PORT}")
            await server.wait_closed()
    except Exception as e:
        print(f"[MCP Connector v2] Server error: {e}")


def _start_server_thread():
    global _server_thread, _server_loop
    if _server_thread and _server_thread.is_alive():
        return False

    def _run():
        global _server_loop
        _server_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_server_loop)
        _server_loop.run_until_complete(_ws_server_main())

    _server_thread = threading.Thread(target=_run, daemon=True, name="MCP_WS_Server")
    _server_thread.start()
    return True


def _stop_server():
    global _server_instance, _server_loop
    if _server_instance:
        try:
            _server_loop.call_soon_threadsafe(_server_instance.close)
        except Exception:
            pass
        _server_instance = None


# ─────────────────────────────────────────────────────────────────────
# Blender Addon Operators & UI Panel
# ─────────────────────────────────────────────────────────────────────
class MCP_OT_StartServer(bpy.types.Operator):
    bl_idname = "mcp.start_server"
    bl_label = "Start MCP Server"
    bl_description = "Start the WebSocket MCP bridge server on port 9882"

    def execute(self, context):
        if not HAS_WEBSOCKETS:
            self.report({'ERROR'}, "websockets package not installed in Blender Python")
            return {'CANCELLED'}
        started = _start_server_thread()
        if started:
            self.report({'INFO'}, f"MCP Server started on ws://0.0.0.0:{_PORT}")
        else:
            self.report({'WARNING'}, "MCP Server already running")
        return {'FINISHED'}


class MCP_OT_StopServer(bpy.types.Operator):
    bl_idname = "mcp.stop_server"
    bl_label = "Stop MCP Server"

    def execute(self, context):
        _stop_server()
        self.report({'INFO'}, "MCP Server stopped")
        return {'FINISHED'}


class MCP_PT_Panel(bpy.types.Panel):
    bl_label = "MCP"
    bl_idname = "MCP_PT_Panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "MCP"

    def draw(self, context):
        layout = self.layout
        is_running = _server_thread is not None and _server_thread.is_alive()
        if is_running:
            layout.label(text=f"Running on ws://0.0.0.0:{_PORT}", icon='RADIOBUT_ON')
            layout.operator("mcp.stop_server", icon='CANCEL')
        else:
            layout.label(text="Server stopped", icon='RADIOBUT_OFF')
            layout.operator("mcp.start_server", icon='PLAY')

        layout.separator()
        layout.label(text="Poly Haven Status:", icon='WORLD_DATA')
        ph_stat = PH.status()
        layout.label(text=f"  Addon: {'✓' if ph_stat['addon_available'] else '✗'}")
        layout.label(text=f"  Library: {'✓' if ph_stat['lib_found'] else '✗'}")
        layout.label(text=f"  Catalog: {ph_stat['total_assets_in_catalog']} assets")
        layout.label(text=f"  Available: {ph_stat['downloaded_count']}")


_CLASSES = [MCP_OT_StartServer, MCP_OT_StopServer, MCP_PT_Panel]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            pass
    def _auto():
        _start_server_thread()
        return None
    bpy.app.timers.register(_auto, first_interval=1.0)
    print("[MCP Connector v2] Registered — P + PH engines active")


def unregister():
    _stop_server()
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
