"""
FINAL POLISH: PERFECT ARTWORK OFFSETS, WORKSTATION DUAL-STATE ACCESSORIES,
AND EAST-FACING CORRIDOR QA CAMERA.
"""

import bpy
import mathutils
import math
import os

BLEND_DIR = r"c:\Users\avina\Desktop\blender mcp\Blend"
RENDERS_DIR = r"c:\Users\avina\Desktop\blender mcp\Renders\Office_QA"

def apply_polish():
    scene = bpy.context.scene

    # 1. Meeting Room Feature Wall Art offset so it sits cleanly on the concrete wall face
    meet_sw = bpy.data.objects.get("Wall_Art_Switcher_Meeting")
    if meet_sw:
        meet_sw.location = (13.8, 12.72, 2.0)
        meet_sw.rotation_euler = (0, 0, 0)
    
    group_eyes = bpy.data.objects.get("horror_group_moving_eyes")
    if group_eyes:
        group_eyes.location = (0, 0, 0)
        group_eyes.rotation_euler = (0, 0, math.radians(180))
        group_eyes.scale = (1.1, 1.1, 1.1)

    skyline = bpy.data.objects.get("Meeting_Skyline_Panorama_Normal")
    if skyline:
        skyline.location = (0, 0, 0)
        skyline.rotation_euler = (0, 0, math.radians(180))

    # 2. Manager Wall Art offset so it sits cleanly on manager north wall face
    mgr_art_sw = bpy.data.objects.get("Wall_Art_Switcher_Manager")
    if mgr_art_sw:
        mgr_art_sw.location = (9.8, 12.72, 1.9)
        mgr_art_sw.rotation_euler = (0, 0, 0)

    # 3. Workstation Dual-State Lamp and Fan (on the front workstation desk Pod 1)
    col_work_norm = bpy.data.collections.get("WORK_NORMAL")
    col_work_horr = bpy.data.collections.get("WORK_HORROR")
    col_sw = bpy.data.collections.get("OFFICE_SWITCHERS")

    # Load an extra table lamp for workstation pod 1
    with bpy.data.libraries.load(os.path.join(BLEND_DIR, "table_lamp_all.blend"), link=False) as (df, dt):
        dt.collections = ["Lamp_Normal", "Lamp_Haunted"]
    
    col_ln = bpy.data.collections.get("Lamp_Normal.001")
    col_lh = bpy.data.collections.get("Lamp_Haunted.001")
    if col_ln and col_lh:
        for o in list(col_ln.objects):
            col_work_norm.objects.link(o)
            col_ln.objects.unlink(o)
        for o in list(col_lh.objects):
            col_work_horr.objects.link(o)
            col_lh.objects.unlink(o)

        lamp_w_sw = bpy.data.objects.new("Lamp_Switcher_Work_1", None)
        lamp_w_sw.location = (4.3, 2.52, 0.79)  # Right on front workstation desk!
        col_sw.objects.link(lamp_w_sw)

        ln_w_root = bpy.data.objects.get("Lamp_Normal_Root.001")
        lh_w_root = bpy.data.objects.get("Lamp_Haunted_Root.001")
        if ln_w_root:
            ln_w_root.parent = lamp_w_sw
            ln_w_root.matrix_parent_inverse = mathutils.Matrix.Identity(4)
            ln_w_root.location = (0, 0, 0)
        if lh_w_root:
            lh_w_root.parent = lamp_w_sw
            lh_w_root.matrix_parent_inverse = mathutils.Matrix.Identity(4)
            lh_w_root.location = (0, 0, 0)

    # 4. Corridor Camera: Looking East directly at the dividing wall, door, and fire extinguisher
    c_corr = bpy.data.objects.get("CAM_CORRIDOR")
    if c_corr:
        c_corr.location = (8.2, 5.2, 1.65)
        c_corr.rotation_euler = (math.radians(82), 0, math.radians(-90))
        c_corr.data.lens = 22.0

    return {"status": "polished"}

def render_final_proofs():
    apply_polish()
    scene = bpy.context.scene

    def set_mode(is_horror):
        norm_col = bpy.data.collections.get("OFFICE_NORMAL_ASSETS")
        horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")
        if norm_col:
            norm_col.hide_viewport = is_horror
            norm_col.hide_render = is_horror
            for o in list(norm_col.all_objects):
                if o:
                    o.hide_viewport = is_horror
                    o.hide_render = is_horror
        if horr_col:
            horr_col.hide_viewport = not is_horror
            horr_col.hide_render = not is_horror
            for o in list(horr_col.all_objects):
                if o:
                    o.hide_viewport = not is_horror
                    o.hide_render = not is_horror
        bpy.context.view_layer.update()

    cams = ["CAM_CAFE", "CAM_MANAGER", "CAM_WORK", "CAM_MEETING", "CAM_CORRIDOR"]
    res = {"normal": {}, "horror": {}}

    # Render Normal
    set_mode(False)
    for cname in cams:
        cam_obj = bpy.data.objects.get(cname)
        if cam_obj:
            scene.camera = cam_obj
            fpath = os.path.join(RENDERS_DIR, "normal", f"{cname}_NORMAL.png")
            scene.render.filepath = fpath
            bpy.ops.render.render(write_still=True)
            res["normal"][cname] = fpath

    # Render Horror
    set_mode(True)
    for cname in cams:
        cam_obj = bpy.data.objects.get(cname)
        if cam_obj:
            scene.camera = cam_obj
            fpath = os.path.join(RENDERS_DIR, "horror", f"{cname}_HORROR.png")
            scene.render.filepath = fpath
            bpy.ops.render.render(write_still=True)
            res["horror"][cname] = fpath

    # Reset back to Normal
    set_mode(False)
    return res

if __name__ == "__main__":
    apply_polish()
