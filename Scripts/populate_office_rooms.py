"""
POPULATE CORPORATE OFFICE ROOMS — DUAL-STATE (NORMAL & HORROR)
Loads production assets from project libraries, places them into all 4 rooms,
parents them to Switcher empties (for Unity SceneSwitchers), organizes them into
synchronized collections, and installs a 1-click Blender N-Panel UI and operator.
"""

import bpy
import mathutils
import math
import os

BLEND_DIR = r"c:\Users\avina\Desktop\blender mcp\Blend"

def populate_office_rooms():
    scene = bpy.context.scene

    # ─────────────────────────────────────────────────────────────────
    # 0. MASTER SWITCHER COLLECTIONS
    # ─────────────────────────────────────────────────────────────────
    def get_or_create_col(name, parent_col=None):
        target_parent = parent_col if parent_col else scene.collection
        col = bpy.data.collections.get(name)
        if not col:
            col = bpy.data.collections.new(name)
        if col.name not in target_parent.children:
            target_parent.children.link(col)
        return col

    col_master_norm = get_or_create_col("OFFICE_NORMAL_ASSETS")
    col_master_horr = get_or_create_col("OFFICE_HORROR_ASSETS")
    col_switchers   = get_or_create_col("OFFICE_SWITCHERS")

    col_cafe_norm   = get_or_create_col("CAFE_NORMAL", col_master_norm)
    col_cafe_horr   = get_or_create_col("CAFE_HORROR", col_master_horr)
    col_mgr_norm    = get_or_create_col("MANAGER_NORMAL", col_master_norm)
    col_mgr_horr    = get_or_create_col("MANAGER_HORROR", col_master_horr)
    col_work_norm   = get_or_create_col("WORK_NORMAL", col_master_norm)
    col_work_horr   = get_or_create_col("WORK_HORROR", col_master_horr)
    col_meet_norm   = get_or_create_col("MEETING_NORMAL", col_master_norm)
    col_meet_horr   = get_or_create_col("MEETING_HORROR", col_master_horr)

    # Helper to append an entire collection from a blend file
    def append_collection(blend_name, col_name, target_col):
        blend_path = os.path.join(BLEND_DIR, blend_name)
        if not os.path.exists(blend_path):
            print(f"Warning: {blend_path} not found")
            return None
        with bpy.data.libraries.load(blend_path, link=False) as (df, dt):
            if col_name in df.collections:
                dt.collections = [col_name]
        
        # Find the newly loaded collection in bpy.data.collections
        loaded_col = bpy.data.collections.get(col_name)
        if loaded_col:
            # Move loaded objects to target_col
            for obj in list(loaded_col.objects):
                if obj.name not in target_col.objects:
                    target_col.objects.link(obj)
                if obj.name in loaded_col.objects:
                    loaded_col.objects.unlink(obj)
            # Unlink temporary loaded collection if empty
            if len(loaded_col.objects) == 0 and loaded_col.name in scene.collection.children:
                scene.collection.children.unlink(loaded_col)
            return target_col
        return None

    # Helper to append specific objects from a blend file
    def append_objects(blend_name, obj_names, target_col):
        blend_path = os.path.join(BLEND_DIR, blend_name)
        if not os.path.exists(blend_path):
            print(f"Warning: {blend_path} not found")
            return []
        with bpy.data.libraries.load(blend_path, link=False) as (df, dt):
            dt.objects = [o for o in df.objects if o in obj_names]
        
        imported = []
        for obj in dt.objects:
            if obj:
                imported.append(obj)
                if obj.name not in target_col.objects:
                    target_col.objects.link(obj)
        return imported

    def create_switcher_empty(name, location, rotation=(0, 0, 0)):
        empty = bpy.data.objects.new(name, None)
        empty.empty_display_type = 'PLAIN_AXES'
        empty.empty_display_size = 0.5
        empty.location = location
        empty.rotation_euler = tuple(math.radians(a) for a in rotation)
        col_switchers.objects.link(empty)
        return empty

    # ─────────────────────────────────────────────────────────────────
    # 1. ROOM_3_CAFE: COFFEE MACHINE & REFRIGERATOR & TABLES & ART
    # ─────────────────────────────────────────────────────────────────
    print("Populating ROOM_3_CAFE...")

    # Remove previous placeholder objects in cafe
    placeholders_cafe = [
        "Cafe_Drink_Refrigerator", "Cafe_Espresso_Machine",
        "Cafe_Round_Table_1.8", "Cylinder", "Cylinder.001",
        "Cafe_Round_Table_3.8", "Cylinder.002", "Cylinder.003"
    ]
    for pname in placeholders_cafe:
        pobj = bpy.data.objects.get(pname)
        if pobj:
            bpy.data.objects.remove(pobj, do_unlink=True)

    # 1A. COFFEE MACHINE (Normal & Haunted)
    append_collection("coffee_machine_all.blend", "Coffee_Machine_Normal", col_cafe_norm)
    append_collection("coffee_machine_all.blend", "Coffee_Machine_Haunted", col_cafe_horr)

    cm_norm_root = bpy.data.objects.get("Coffee_Machine_Normal_Prefab")
    cm_haunt_root = bpy.data.objects.get("Coffee_Machine_Haunted_Prefab")

    cm_loc = (1.2, 12.55, 0.90)  # On top of lower counter
    cm_switcher = create_switcher_empty("Coffee_Machine_Switcher", cm_loc, (0, 0, 180))

    if cm_norm_root:
        cm_norm_root.parent = cm_switcher
        cm_norm_root.location = (0, 0, 0)
        cm_norm_root.rotation_euler = (0, 0, 0)
    if cm_haunt_root:
        cm_haunt_root.parent = cm_switcher
        cm_haunt_root.location = (0, 0, 0)
        cm_haunt_root.rotation_euler = (0, 0, 0)

    # 1B. REFRIGERATOR (Normal & Haunted)
    append_collection("fridge_all.blend", "Fridge_Normal", col_cafe_norm)
    append_collection("fridge_all.blend", "Fridge_Haunted", col_cafe_horr)

    fridge_norm_root = bpy.data.objects.get("Fridge_Normal_Root")
    fridge_haunt_root = bpy.data.objects.get("Fridge_Haunted_Root")

    fridge_loc = (4.8, 12.35, 0.0)  # In corner of kitchenette
    fridge_switcher = create_switcher_empty("Fridge_Switcher", fridge_loc, (0, 0, 180))

    if fridge_norm_root:
        fridge_norm_root.parent = fridge_switcher
        fridge_norm_root.location = (0, 0, 0)
        fridge_norm_root.rotation_euler = (0, 0, 0)
    if fridge_haunt_root:
        fridge_haunt_root.parent = fridge_switcher
        fridge_haunt_root.location = (0, 0, 0)
        fridge_haunt_root.rotation_euler = (0, 0, 0)

    # 1C. CAFE DINING TABLE SETS (Normal & Horror)
    # Append table set 1 for cafe
    blend_table = os.path.join(BLEND_DIR, "table_set_keep_both.blend")
    with bpy.data.libraries.load(blend_table, link=False) as (df, dt):
        dt.objects = [o for o in df.objects if o in ["Table_Set_Switcher", "Table_Set_Normal_Prefab", "Table_Set_Horror_Prefab"]]
    
    table_cafe_1 = bpy.data.objects.get("Table_Set_Switcher")
    if table_cafe_1:
        table_cafe_1.name = "Table_Set_Switcher_Cafe_1"
        table_cafe_1.location = (1.8, 10.0, 0.0)
        if table_cafe_1.name in scene.collection.objects:
            scene.collection.objects.unlink(table_cafe_1)
        col_switchers.objects.link(table_cafe_1)
        
        for ch in table_cafe_1.children:
            if "Normal" in ch.name:
                if ch.name in scene.collection.objects: scene.collection.objects.unlink(ch)
                col_cafe_norm.objects.link(ch)
            elif "Horror" in ch.name:
                if ch.name in scene.collection.objects: scene.collection.objects.unlink(ch)
                col_cafe_horr.objects.link(ch)

    # Append table set 2 for cafe
    with bpy.data.libraries.load(blend_table, link=False) as (df, dt):
        dt.objects = [o for o in df.objects if o in ["Table_Set_Switcher", "Table_Set_Normal_Prefab", "Table_Set_Horror_Prefab"]]
    
    table_cafe_2 = [o for o in bpy.data.objects if o.name.startswith("Table_Set_Switcher") and o != table_cafe_1]
    if table_cafe_2:
        tc2 = table_cafe_2[0]
        tc2.name = "Table_Set_Switcher_Cafe_2"
        tc2.location = (3.8, 10.0, 0.0)
        if tc2.name in scene.collection.objects: scene.collection.objects.unlink(tc2)
        col_switchers.objects.link(tc2)
        for ch in tc2.children:
            if "Normal" in ch.name:
                if ch.name in scene.collection.objects: scene.collection.objects.unlink(ch)
                col_cafe_norm.objects.link(ch)
            elif "Horror" in ch.name:
                if ch.name in scene.collection.objects: scene.collection.objects.unlink(ch)
                col_cafe_horr.objects.link(ch)

    # 1D. CAFE WALL ART (Normal Chalkboard vs Horror Cursed Portrait)
    append_objects("horror_portrait_03_mother_baby_swaddle.blend", ["horror_portrait_03_mother_baby_swaddle"], col_cafe_horr)
    port_cafe_h = bpy.data.objects.get("horror_portrait_03_mother_baby_swaddle")
    art_cafe_n = bpy.data.objects.get("Cafe_Wall_Art")
    
    art_cafe_switcher = create_switcher_empty("Wall_Art_Switcher_Cafe", (0.14, 10.8, 1.9), (0, 0, 90))
    if art_cafe_n:
        art_cafe_n.parent = art_cafe_switcher
        art_cafe_n.location = (0, 0, 0)
        if art_cafe_n.name in scene.collection.objects: scene.collection.objects.unlink(art_cafe_n)
        col_cafe_norm.objects.link(art_cafe_n)
    if port_cafe_h:
        port_cafe_h.parent = art_cafe_switcher
        port_cafe_h.location = (0, 0, 0)
        port_cafe_h.rotation_euler = (math.radians(90), 0, math.radians(90))
        port_cafe_h.scale = (0.8, 0.8, 0.8)

    # ─────────────────────────────────────────────────────────────────
    # 2. ROOM_2_MANAGER: LAMP, FAN, CLOCK, BOOKSHELF DOLL & PORTRAIT
    # ─────────────────────────────────────────────────────────────────
    print("Populating ROOM_2_MANAGER...")

    # 2A. TABLE LAMP (Normal Banker Lamp vs Haunted Organic Lamp)
    append_collection("table_lamp_all.blend", "Lamp_Normal", col_mgr_norm)
    append_collection("table_lamp_all.blend", "Lamp_Haunted", col_mgr_horr)

    lamp_norm_mgr = bpy.data.objects.get("Lamp_Normal_Root")
    lamp_haunt_mgr = bpy.data.objects.get("Lamp_Haunted_Root")

    lamp_mgr_switcher = create_switcher_empty("Lamp_Switcher_Manager", (9.0, 10.75, 0.76), (0, 0, -45))
    if lamp_norm_mgr:
        lamp_norm_mgr.parent = lamp_mgr_switcher
        lamp_norm_mgr.location = (0, 0, 0)
        lamp_norm_mgr.rotation_euler = (0, 0, 0)
    if lamp_haunt_mgr:
        lamp_haunt_mgr.parent = lamp_mgr_switcher
        lamp_haunt_mgr.location = (0, 0, 0)
        lamp_haunt_mgr.rotation_euler = (0, 0, 0)

    # 2B. DESK FAN (Normal Retro Fan vs Haunted Flesh Fan)
    append_collection("fan_all.blend", "Fan_Normal", col_mgr_norm)
    append_collection("fan_all.blend", "Fan_Haunted", col_mgr_horr)

    fan_norm_mgr = bpy.data.objects.get("Fan_Normal_Root")
    fan_haunt_mgr = bpy.data.objects.get("Fan_Haunted_Root")

    fan_mgr_switcher = create_switcher_empty("Fan_Switcher_Manager", (7.0, 10.75, 0.76), (0, 0, 35))
    if fan_norm_mgr:
        fan_norm_mgr.parent = fan_mgr_switcher
        fan_norm_mgr.location = (0, 0, 0)
        fan_norm_mgr.rotation_euler = (0, 0, 0)
    if fan_haunt_mgr:
        fan_haunt_mgr.parent = fan_mgr_switcher
        fan_haunt_mgr.location = (0, 0, 0)
        fan_haunt_mgr.rotation_euler = (0, 0, 0)

    # 2C. ALARM CLOCK (Normal Vintage Clock vs Haunted Cursed Clock)
    append_collection("alarm_clock_all.blend", "Clock_Normal", col_mgr_norm)
    append_collection("alarm_clock_all.blend", "Clock_Haunted", col_mgr_horr)

    clock_norm_mgr = bpy.data.objects.get("Clock_Normal_Root")
    clock_haunt_mgr = bpy.data.objects.get("Clock_Haunted_Root")

    clock_mgr_switcher = create_switcher_empty("Clock_Switcher_Manager", (7.4, 11.0, 0.76), (0, 0, 20))
    if clock_norm_mgr:
        clock_norm_mgr.parent = clock_mgr_switcher
        clock_norm_mgr.location = (0, 0, 0)
        clock_norm_mgr.rotation_euler = (0, 0, 0)
    if clock_haunt_mgr:
        clock_haunt_mgr.parent = clock_mgr_switcher
        clock_haunt_mgr.location = (0, 0, 0)
        clock_haunt_mgr.rotation_euler = (0, 0, 0)

    # 2D. BOOKSHELF DISPLAY: Normal Executive Trophy vs Horror Animated Doll
    append_objects("horror_doll_moving_eyes.blend", ["horror_doll_moving_eyes", "Doll_Eye_Right", "Doll_Eye_Left"], col_mgr_horr)
    doll_root = bpy.data.objects.get("horror_doll_moving_eyes")
    
    # Create an executive brass award trophy for Normal mode
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.25, location=(0, 0, 0.125))
    trophy_n = bpy.context.active_object
    trophy_n.name = "Manager_Trophy_Award_Normal"
    if trophy_n.name in scene.collection.objects: scene.collection.objects.unlink(trophy_n)
    col_mgr_norm.objects.link(trophy_n)

    doll_switcher = create_switcher_empty("Bookshelf_Feature_Switcher", (8.6, 12.5, 1.25), (0, 0, 180))
    trophy_n.parent = doll_switcher
    trophy_n.location = (0, 0, 0)

    if doll_root:
        doll_root.parent = doll_switcher
        doll_root.location = (0, 0, 0)
        doll_root.rotation_euler = (0, 0, 0)
        doll_root.scale = (0.6, 0.6, 0.6)

    # 2E. MANAGER FEATURE WALL ART: Normal Leadership Print vs Horror Apparition
    append_objects("horror_portrait_01_mom_and_baby.blend", ["horror_portrait_01_mom_and_baby"], col_mgr_horr)
    port_mgr_h = bpy.data.objects.get("horror_portrait_01_mom_and_baby")
    art_mgr_n = bpy.data.objects.get("Manager_Wall_Framed_Art")

    art_mgr_switcher = create_switcher_empty("Wall_Art_Switcher_Manager", (9.8, 12.86, 1.9), (0, 0, 180))
    if art_mgr_n:
        art_mgr_n.parent = art_mgr_switcher
        art_mgr_n.location = (0, 0, 0)
        if art_mgr_n.name in scene.collection.objects: scene.collection.objects.unlink(art_mgr_n)
        col_mgr_norm.objects.link(art_mgr_n)
    if port_mgr_h:
        port_mgr_h.parent = art_mgr_switcher
        port_mgr_h.location = (0, 0, 0)
        port_mgr_h.rotation_euler = (math.radians(90), 0, 0)
        port_mgr_h.scale = (0.9, 0.9, 0.9)

    # ─────────────────────────────────────────────────────────────────
    # 3. ROOM_1_WORK: WORKSTATION TABLES, ACCESSORIES & FIRE EXTINGUISHER
    # ─────────────────────────────────────────────────────────────────
    print("Populating ROOM_1_WORK...")

    # 3A. FIRE EXTINGUISHER ON CORRIDOR WALL
    append_collection("fire_extinguisher.blend", "Fire_Extinguisher_Normal", col_work_norm)
    fe_root = bpy.data.objects.get("Wall_Mount_Bracket")
    if fe_root:
        fe_loc = (11.38, 5.5, 1.4)
        fe_switcher = create_switcher_empty("Fire_Extinguisher_Switcher", fe_loc, (0, 0, -90))
        fe_root.parent = fe_switcher
        fe_root.location = (0, 0, 0)

    # 3B. WORKSTATION DUAL-STATE TABLE SET
    with bpy.data.libraries.load(blend_table, link=False) as (df, dt):
        dt.objects = [o for o in df.objects if o in ["Table_Set_Switcher", "Table_Set_Normal_Prefab", "Table_Set_Horror_Prefab"]]
    
    table_work_1 = [o for o in bpy.data.objects if o.name.startswith("Table_Set_Switcher") and o not in [table_cafe_1, tc2]]
    if table_work_1:
        tw1 = table_work_1[0]
        tw1.name = "Table_Set_Switcher_Work_1"
        tw1.location = (2.2, 2.5, 0.0)
        if tw1.name in scene.collection.objects: scene.collection.objects.unlink(tw1)
        col_switchers.objects.link(tw1)
        for ch in tw1.children:
            if "Normal" in ch.name:
                if ch.name in scene.collection.objects: scene.collection.objects.unlink(ch)
                col_work_norm.objects.link(ch)
            elif "Horror" in ch.name:
                if ch.name in scene.collection.objects: scene.collection.objects.unlink(ch)
                col_work_horr.objects.link(ch)

    # 3C. WALL GALLERY HORROR PORTRAITS
    append_objects("horror_portrait_02_family_three.blend", ["horror_portrait_02_family_three"], col_work_horr)
    port_work_h = bpy.data.objects.get("horror_portrait_02_family_three")
    art_work_n = bpy.data.objects.get("WorkRoom_Gallery_Art_1")

    art_work_switcher = create_switcher_empty("Wall_Art_Switcher_Work", (11.41, 3.4, 1.85), (0, 0, -90))
    if art_work_n:
        art_work_n.parent = art_work_switcher
        art_work_n.location = (0, 0, 0)
        if art_work_n.name in scene.collection.objects: scene.collection.objects.unlink(art_work_n)
        col_work_norm.objects.link(art_work_n)
    if port_work_h:
        port_work_h.parent = art_work_switcher
        port_work_h.location = (0, 0, 0)
        port_work_h.rotation_euler = (math.radians(90), 0, math.radians(-90))
        port_work_h.scale = (0.85, 0.85, 0.85)

    # ─────────────────────────────────────────────────────────────────
    # 4. ROOM_4_MEETING: BOARDROOM PORTRAIT WITH MOVING EYES, LIGHTS, SWITCHES
    # ─────────────────────────────────────────────────────────────────
    print("Populating ROOM_4_MEETING...")

    # 4A. MASTER BOARDROOM ARTWORK: Normal Skyline Panorama vs Horror Group With Moving Eyes
    append_objects("horror_group_moving_eyes.blend", [
        "horror_group_moving_eyes", "Eye_WomanRight_Right", "Eye_WomanRight_Left",
        "Eye_WomanLeft_Right", "Eye_WomanLeft_Left", "Eye_Man_Right", "Eye_Man_Left"
    ], col_meet_horr)
    
    group_eyes_root = bpy.data.objects.get("horror_group_moving_eyes")

    # Create large boardroom corporate panoramic art for Normal mode
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    skyline_n = bpy.context.active_object
    skyline_n.name = "Meeting_Skyline_Panorama_Normal"
    skyline_n.scale = (2.4, 0.04, 1.2)
    with bpy.context.temp_override(object=skyline_n, active_object=skyline_n, selected_objects=[skyline_n]):
        bpy.ops.object.transform_apply(scale=True)
    if skyline_n.name in scene.collection.objects: scene.collection.objects.unlink(skyline_n)
    col_meet_norm.objects.link(skyline_n)

    art_meet_switcher = create_switcher_empty("Wall_Art_Switcher_Meeting", (13.8, 12.86, 2.0), (0, 0, 180))
    skyline_n.parent = art_meet_switcher
    skyline_n.location = (0, 0, 0)

    if group_eyes_root:
        group_eyes_root.parent = art_meet_switcher
        group_eyes_root.location = (0, 0, 0)
        group_eyes_root.rotation_euler = (0, 0, 0)
        group_eyes_root.scale = (0.9, 0.9, 0.9)

    # 4B. CEILING LIGHT FIXTURES & WALL SWITCHES
    append_collection("ceiling_light.blend", "Ceiling_Light_Normal", col_meet_norm)
    append_collection("light_switches.blend", "Light_Switches_Normal", col_meet_norm)

    switch_meet = bpy.data.objects.get("Switch_Meeting")
    if switch_meet:
        switch_meet.location = (11.6, 1.8, 1.2)

    # ─────────────────────────────────────────────────────────────────
    # 5. CONFIGURE DEFAULT VISIBILITY (NORMAL ACTIVE, HORROR READY)
    # ─────────────────────────────────────────────────────────────────
    print("Setting initial visibility (Normal = ON, Horror = OFF)...")
    
    col_master_norm.hide_viewport = False
    col_master_norm.hide_render = False

    col_master_horr.hide_viewport = True
    col_master_horr.hide_render = True

    # ─────────────────────────────────────────────────────────────────
    # 6. REGISTER 1-CLICK PYTHON SWITCHER OPERATOR & UI PANEL IN BLENDER
    # ─────────────────────────────────────────────────────────────────
    switcher_code = '''
import bpy

def set_office_mode(mode="NORMAL"):
    is_horror = (mode.upper() == "HORROR")
    norm_col = bpy.data.collections.get("OFFICE_NORMAL_ASSETS")
    horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")

    if norm_col:
        norm_col.hide_viewport = is_horror
        norm_col.hide_render = is_horror
    if horr_col:
        horr_col.hide_viewport = not is_horror
        horr_col.hide_render = not is_horror

    # Also recursively update all child collections
    for c in bpy.data.collections:
        if "NORMAL" in c.name and c.name != "OFFICE_NORMAL_ASSETS":
            c.hide_viewport = is_horror
            c.hide_render = is_horror
        elif "HORROR" in c.name and c.name != "OFFICE_HORROR_ASSETS":
            c.hide_viewport = not is_horror
            c.hide_render = not is_horror

    print(f"[Office State] Active Mode: {'HORROR (Haunted)' if is_horror else 'NORMAL (Pristine)'}")

class OFFICE_OT_ToggleMode(bpy.types.Operator):
    bl_idname = "office.toggle_mode"
    bl_label = "Toggle Normal / Horror"
    bl_description = "Toggle between pristine Normal office and terrifying Horror office"

    def execute(self, context):
        horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")
        current_horror = not horr_col.hide_viewport if horr_col else False
        new_mode = "NORMAL" if current_horror else "HORROR"
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
        horr_col = bpy.data.collections.get("OFFICE_HORROR_ASSETS")
        is_horror = not horr_col.hide_viewport if horr_col else False

        if is_horror:
            layout.label(text="Current State: HORROR", icon='GHOST_ENABLED')
            layout.operator("office.toggle_mode", text="Switch to NORMAL Office", icon='RESTRICT_VIEW_OFF')
        else:
            layout.label(text="Current State: NORMAL", icon='HOME')
            layout.operator("office.toggle_mode", text="Switch to HORROR Office", icon='GHOST_ENABLED')

try:
    bpy.utils.register_class(OFFICE_OT_ToggleMode)
    bpy.utils.register_class(OFFICE_PT_SwitcherPanel)
except Exception:
    pass
'''
    # Execute the switcher code into Blender's runtime
    exec(switcher_code, {"bpy": bpy})

    # Save to Blender internal text block for user convenience
    txt = bpy.data.texts.get("office_state_switcher.py")
    if not txt:
        txt = bpy.data.texts.new("office_state_switcher.py")
    txt.from_string(switcher_code)

    total_objs = len(list(scene.objects))
    return {
        "status": "success",
        "message": "✓ Office rooms filled properly with Normal & Horror dual-state assets!",
        "total_objects": total_objs,
        "switchers": [o.name for o in col_switchers.objects],
        "normal_collections": [c.name for c in col_master_norm.children],
        "horror_collections": [c.name for c in col_master_horr.children],
        "active_mode": "NORMAL (Ready for 1-click toggle to HORROR)"
    }

if __name__ == "__main__":
    res = populate_office_rooms()
    print(res)
