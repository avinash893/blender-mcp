"""
SETUP OFFICE QA CAMERAS AND RENDER DUAL-STATE INSPECTION PROOFS
Sets up dedicated cameras for all 4 office rooms and renders both NORMAL and HORROR states.
"""

import bpy
import math
import os

RENDERS_DIR = r"c:\Users\avina\Desktop\blender mcp\Renders\Office_QA"

def setup_cameras():
    scene = bpy.context.scene
    os.makedirs(RENDERS_DIR, exist_ok=True)

    col_cam = bpy.data.collections.get("QA_CAMERAS")
    if not col_cam:
        col_cam = bpy.data.collections.new("QA_CAMERAS")
        scene.collection.children.link(col_cam)

    def create_cam(name, loc, rot_deg, focal=24.0):
        cam_obj = bpy.data.objects.get(name)
        if not cam_obj:
            cam_data = bpy.data.cameras.new(name)
            cam_obj = bpy.data.objects.new(name, cam_data)
            col_cam.objects.link(cam_obj)
        cam_obj.location = loc
        cam_obj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
        cam_obj.data.lens = focal
        cam_obj.data.clip_start = 0.1
        cam_obj.data.clip_end = 100.0
        return cam_obj

    # Camera placements for each room
    c_cafe = create_cam("CAM_CAFE", (2.8, 8.8, 1.65), (78, 0, 0), focal=20.0)      # Looks north at counter, fridge, coffee machine, cafe tables
    c_mgr  = create_cam("CAM_MANAGER", (6.2, 9.5, 1.65), (78, 0, -35), focal=22.0)  # Looks northeast at manager desk, lamp, fan, clock, bookshelf
    c_work = create_cam("CAM_WORK", (1.8, 1.5, 1.65), (76, 0, -45), focal=22.0)     # Looks across workstations, fire extinguisher, gallery art
    c_meet = create_cam("CAM_MEETING", (13.8, 3.2, 1.65), (80, 0, 0), focal=22.0)   # Looks north down conference table at feature wall portrait

    # Adjust render resolution
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_x = 800
    scene.render.resolution_y = 450
    scene.render.resolution_percentage = 100
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 8

    cams = ["CAM_CAFE", "CAM_MANAGER", "CAM_WORK", "CAM_MEETING"]
    return cams

def render_state(mode="NORMAL"):
    import populate_office_rooms
    scene = bpy.context.scene
    
    # Switch office state
    is_horror = (mode.upper() == "HORROR")
    norm_col = bpy.data.collections.get("OFFICE_NORMAL_ASSETS")
    horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")

    if norm_col:
        norm_col.hide_viewport = is_horror
        norm_col.hide_render = is_horror
    if horr_col:
        horr_col.hide_viewport = not is_horror
        horr_col.hide_render = not is_horror

    for c in bpy.data.collections:
        if "NORMAL" in c.name and c.name != "OFFICE_NORMAL_ASSETS":
            c.hide_viewport = is_horror
            c.hide_render = is_horror
        elif "HORROR" in c.name and c.name != "OFFICE_HORROR_ASSETS":
            c.hide_viewport = not is_horror
            c.hide_render = not is_horror

    state_dir = os.path.join(RENDERS_DIR, mode.lower())
    os.makedirs(state_dir, exist_ok=True)

    rendered_files = {}
    for cname in ["CAM_CAFE", "CAM_MANAGER", "CAM_WORK", "CAM_MEETING"]:
        cam_obj = bpy.data.objects.get(cname)
        if cam_obj:
            scene.camera = cam_obj
            fpath = os.path.join(state_dir, f"{cname}_{mode}.png")
            scene.render.filepath = fpath
            bpy.ops.render.render(write_still=True)
            rendered_files[cname] = fpath

    return rendered_files

if __name__ == "__main__":
    setup_cameras()
    r_norm = render_state("NORMAL")
    r_horr = render_state("HORROR")
    # Reset back to Normal by default
    render_state("NORMAL")
    print({"normal_renders": r_norm, "horror_renders": r_horr})
