"""
FINALIZE OFFICE PERFECTION
1. Clear corridor doorway (move shelf & drawers).
2. Position Fire Extinguisher and Cursed Gallery Art on corridor wall.
3. Fix Meeting Room North partition wall artwork (large group moving-eyes portrait & normal skyline).
4. Perfect recursive visibility toggling so EVERY child mesh toggles flawlessly.
5. Render clean proofs for both NORMAL and HORROR states.
"""

import bpy
import mathutils
import math
import os

BLEND_DIR = r"c:\Users\avina\Desktop\blender mcp\Blend"
RENDERS_DIR = r"c:\Users\avina\Desktop\blender mcp\Renders\Office_QA"

def apply_perfection():
    scene = bpy.context.scene

    # ─────────────────────────────────────────────────────────────────
    # 1. CLEAR CORRIDOR DOORWAY
    # ─────────────────────────────────────────────────────────────────
    # Move all parts of the shelf at Y=5.0 to Y=1.2 (against solid wall)
    for o in list(bpy.data.objects):
        if "drawer_cabinet" in o.name and ".001" in o.name:
            o.location.y = 1.2

    # Move Fire Extinguisher to visible wall right next to door
    fe_sw = bpy.data.objects.get("Fire_Extinguisher_Switcher")
    if fe_sw:
        fe_sw.location = (11.38, 3.8, 1.4)
        fe_sw.rotation_euler = (0, 0, math.radians(-90))

    # Gallery Art on dividing wall (Normal landscape vs Horror cursed portrait)
    work_art_sw = bpy.data.objects.get("Wall_Art_Switcher_Work")
    if work_art_sw:
        work_art_sw.location = (11.41, 2.8, 1.85)
        work_art_sw.rotation_euler = (0, 0, math.radians(-90))

    # ─────────────────────────────────────────────────────────────────
    # 2. MEETING ROOM FEATURE WALL ARTWORK (Y = 8.40m)
    # ─────────────────────────────────────────────────────────────────
    meet_sw = bpy.data.objects.get("Wall_Art_Switcher_Meeting")
    if not meet_sw:
        meet_sw = bpy.data.objects.new("Wall_Art_Switcher_Meeting", None)
        meet_sw.empty_display_type = 'PLAIN_AXES'
        meet_sw.empty_display_size = 0.5
        bpy.data.collections["OFFICE_SWITCHERS"].objects.link(meet_sw)
    
    meet_sw.location = (13.8, 8.40, 2.0)
    meet_sw.rotation_euler = (0, 0, 0)

    # Skyline artwork (Normal)
    skyline = bpy.data.objects.get("Meeting_Skyline_Panorama_Normal")
    if skyline:
        skyline.parent = meet_sw
        skyline.matrix_parent_inverse = mathutils.Matrix.Identity(4)
        skyline.location = (0, 0, 0)
        skyline.rotation_euler = (0, 0, 0)
        skyline.scale = (2.2, 0.04, 1.1)

    # Group portrait with moving eyes (Horror)
    group_eyes = bpy.data.objects.get("horror_group_moving_eyes")
    if group_eyes:
        group_eyes.parent = meet_sw
        group_eyes.matrix_parent_inverse = mathutils.Matrix.Identity(4)
        group_eyes.location = (0, 0, 0)
        group_eyes.rotation_euler = (0, 0, 0)
        group_eyes.scale = (1.5, 1.5, 1.5)

    # ─────────────────────────────────────────────────────────────────
    # 3. RECURSIVE VISIBILITY SWITCHER
    # ─────────────────────────────────────────────────────────────────
    def set_recursive_hide(obj, hide_val):
        if not obj:
            return
        obj.hide_viewport = hide_val
        obj.hide_render = hide_val
        for child in obj.children:
            set_recursive_hide(child, hide_val)

    def set_office_mode(mode="NORMAL"):
        is_horror = (mode.upper() == "HORROR")
        norm_col = bpy.data.collections.get("OFFICE_NORMAL_ASSETS")
        horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")

        if norm_col:
            norm_col.hide_viewport = is_horror
            norm_col.hide_render = is_horror
            for o in norm_col.all_objects:
                if o:
                    set_recursive_hide(o, is_horror)

        if horr_col:
            horr_col.hide_viewport = not is_horror
            horr_col.hide_render = not is_horror
            for o in horr_col.all_objects:
                if o:
                    set_recursive_hide(o, not is_horror)

        bpy.context.view_layer.update()
        print(f"[Office State] Active: {mode.upper()}")

    # ─────────────────────────────────────────────────────────────────
    # 4. REGISTER LIVE OPERATOR & UI PANEL IN BLENDER
    # ─────────────────────────────────────────────────────────────────
    switcher_code = '''
import bpy

def set_recursive_hide(obj, hide_val):
    if not obj:
        return
    obj.hide_viewport = hide_val
    obj.hide_render = hide_val
    for child in obj.children:
        set_recursive_hide(child, hide_val)

def set_office_mode(mode="NORMAL"):
    is_horror = (mode.upper() == "HORROR")
    norm_col = bpy.data.collections.get("OFFICE_NORMAL_ASSETS")
    horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")

    if norm_col:
        norm_col.hide_viewport = is_horror
        norm_col.hide_render = is_horror
        for o in norm_col.all_objects:
            if o:
                set_recursive_hide(o, is_horror)

    if horr_col:
        horr_col.hide_viewport = not is_horror
        horr_col.hide_render = not is_horror
        for o in horr_col.all_objects:
            if o:
                set_recursive_hide(o, not is_horror)

    bpy.context.scene["office_mode"] = "HORROR" if is_horror else "NORMAL"
    bpy.context.view_layer.update()

class OFFICE_OT_ToggleMode(bpy.types.Operator):
    bl_idname = "office.toggle_mode"
    bl_label = "Toggle Normal / Horror"
    bl_description = "Toggle between pristine Normal office and terrifying Horror office"

    def execute(self, context):
        cur = context.scene.get("office_mode", "NORMAL")
        new_mode = "HORROR" if cur == "NORMAL" else "NORMAL"
        set_office_mode(new_mode)
        self.report({'INFO'}, f"Office Mode: {new_mode}")
        return {'FINISHED'}

class OFFICE_PT_SwitcherPanel(bpy.types.Panel):
    bl_label = "Office State Switcher"
    bl_idname = "OFFICE_PT_switcher_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Office MCP'

    def draw(self, context):
        layout = self.layout
        mode = context.scene.get("office_mode", "NORMAL")

        box = layout.box()
        if mode == "HORROR":
            box.label(text="ACTIVE: HORROR (Haunted)", icon='GHOST_ENABLED')
            box.operator("office.toggle_mode", text="Switch to NORMAL Office", icon='RESTRICT_VIEW_OFF')
        else:
            box.label(text="ACTIVE: NORMAL (Pristine)", icon='HOME')
            box.operator("office.toggle_mode", text="Switch to HORROR Office", icon='GHOST_ENABLED')

try:
    bpy.utils.unregister_class(bpy.types.OFFICE_PT_SwitcherPanel)
    bpy.utils.unregister_class(bpy.types.OFFICE_OT_ToggleMode)
except Exception:
    pass

try:
    bpy.utils.register_class(OFFICE_OT_ToggleMode)
    bpy.utils.register_class(OFFICE_PT_SwitcherPanel)
except Exception:
    pass
'''
    exec(switcher_code, {"bpy": bpy})

    txt = bpy.data.texts.get("office_state_switcher.py")
    if not txt:
        txt = bpy.data.texts.new("office_state_switcher.py")
    txt.from_string(switcher_code)

    return {"status": "perfected"}

def render_and_save():
    apply_perfection()
    scene = bpy.context.scene

    import finalize_office_perfection

    def set_mode(is_horror):
        norm_col = bpy.data.collections.get("OFFICE_NORMAL_ASSETS")
        horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")
        
        def rec_hide(o, h):
            if not o: return
            o.hide_viewport = h
            o.hide_render = h
            for c in o.children:
                rec_hide(c, h)

        if norm_col:
            norm_col.hide_viewport = is_horror
            norm_col.hide_render = is_horror
            for o in norm_col.all_objects:
                rec_hide(o, is_horror)

        if horr_col:
            horr_col.hide_viewport = not is_horror
            horr_col.hide_render = not is_horror
            for o in horr_col.all_objects:
                rec_hide(o, not is_horror)

        scene["office_mode"] = "HORROR" if is_horror else "NORMAL"
        bpy.context.view_layer.update()

    cams = ["CAM_CAFE", "CAM_MANAGER", "CAM_WORK", "CAM_MEETING", "CAM_CORRIDOR"]
    out = {"normal": {}, "horror": {}}

    # Render Normal
    set_mode(False)
    for cname in cams:
        cam_obj = bpy.data.objects.get(cname)
        if cam_obj:
            scene.camera = cam_obj
            fpath = os.path.join(RENDERS_DIR, "normal", f"{cname}_NORMAL.png")
            scene.render.filepath = fpath
            bpy.ops.render.render(write_still=True)
            out["normal"][cname] = fpath

    # Render Horror
    set_mode(True)
    for cname in cams:
        cam_obj = bpy.data.objects.get(cname)
        if cam_obj:
            scene.camera = cam_obj
            fpath = os.path.join(RENDERS_DIR, "horror", f"{cname}_HORROR.png")
            scene.render.filepath = fpath
            bpy.ops.render.render(write_still=True)
            out["horror"][cname] = fpath

    # Reset to Normal by default
    set_mode(False)
    return out

if __name__ == "__main__":
    apply_perfection()
