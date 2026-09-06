"""Rebuild the owned Quattro asset through Blender MCP without touching Scene.

Blender X = width, +Y = front, Z = up. glTF export maps these to
Three X = width, -Z = front, Y = up. Root origin is wheel contact.
Run: python3 scripts/blender-bridge.py execute_code --code-file scripts/blender/build-quattro-car.py
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

REPO = Path(r'\\wsl.localhost\Ubuntu\home\emoporemilio\projects\omarchy-homepage')
SCENE_NAME = 'Omarchy_Quattro_Car'
previous_scene = bpy.context.window.scene
# Only this script's dedicated scene is rebuilt. The original scene is untouched.
old = bpy.data.scenes.get(SCENE_NAME)
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(old)
scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene
collection = bpy.data.collections.new('Omarchy_Quattro_Car_Asset')
scene.collection.children.link(collection)
studio = bpy.data.collections.new('Omarchy_Quattro_Car_Studio')
scene.collection.children.link(studio)
root = bpy.data.objects.new('QuattroCar', None)
collection.objects.link(root)


def material(name, rgb, metallic=0.0, roughness=0.4, emission=None):
    m = bpy.data.materials.new('Quattro_' + name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = 2.4
    return m

body = material('Violet_Paint', (0.105, 0.025, 0.22), 0.5, 0.29)
edge = material('Violet_Edge', (0.17, 0.055, 0.29), 0.45, 0.33)
trim = material('Graphite', (0.012, 0.014, 0.025), 0.22, 0.43)
glass = material('Midnight_Glass', (0.012, 0.023, 0.059), 0.46, 0.19)
rubber = material('Rubber', (0.013, 0.012, 0.021), 0.02, 0.85)
alloy = material('Wheel_Alloy', (0.32, 0.25, 0.43), 0.72, 0.28)
red = material('Tail_Lamp', (0.7, 0.006, 0.022), 0.1, 0.24, (1.0, 0.005, 0.018))
amber = material('Indicator', (0.8, 0.115, 0.012), 0.1, 0.3, (1.0, 0.065, 0.004))
white = material('Head_Lamp', (0.67, 0.75, 0.86), 0.18, 0.22, (0.72, 0.8, 1.0))


def own(obj, mat, parent=root):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = parent
    if mat:
        obj.data.materials.append(mat)
    return obj


def bevel(obj, width=0.035, segments=2):
    mod = obj.modifiers.new('Small manufactured edge', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.affect = 'EDGES'
    normal = obj.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
    normal.keep_sharp = True
    return obj


def box(name, loc, size, mat, radius=0.025, parent=root):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    own(obj, mat, parent)
    if radius:
        bevel(obj, radius)
    return obj


def loft(name, sections, mat):
    # Sections: y, bottom_z, top_z, bottom_half_width, top_half_width.
    verts = []
    for y, low, high, wb, wt in sections:
        verts.extend([(-wb,y,low),(wb,y,low),(wt,y,high),(-wt,y,high)])
    faces = [(3,2,1,0)]
    for i in range(len(sections)-1):
        for j in range(4):
            a=i*4+j; b=i*4+(j+1)%4
            faces.append((a,b,b+4,a+4))
    n=(len(sections)-1)*4
    faces.append((n,n+1,n+2,n+3))
    mesh=bpy.data.meshes.new(name+'Mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj);obj.parent=root;obj.data.materials.append(mat)
    return obj

chassis = loft('Broad_shouldered_body', [
    (-2.68,.4,.95,1.22,1.25),(-2.38,.4,1.02,1.36,1.35),
    (-1.15,.4,1.03,1.37,1.3),(1.12,.4,1.0,1.36,1.3),
    (2.45,.43,.93,1.3,1.24),(2.73,.44,.85,1.19,1.16)], body)
# Actual wheel openings, so dark wheels do not merely stick onto a solid slab.
for sx in [-1,1]:
    for y in [-1.78,1.77]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.49, depth=.8, location=(sx*1.35,y,.43), rotation=(0,math.pi/2,0))
        cutter=bpy.context.object
        bpy.context.view_layer.objects.active=chassis
        boolean=chassis.modifiers.new('Wheel arch','BOOLEAN');boolean.operation='DIFFERENCE';boolean.object=cutter
        bpy.ops.object.modifier_apply(modifier=boolean.name)
        bpy.data.objects.remove(cutter,do_unlink=True)
bevel(chassis,.035)
box('Rear_bumper',(0,-2.76,.47),(2.61,.2,.21),trim)
box('Front_bumper',(0,2.77,.48),(2.46,.19,.19),trim)
box('Rear_valance',(0,-2.675,.69),(2.52,.065,.34),trim,.012)
box('Rear_plate_recess',(0,-2.719,.72),(.57,.035,.17),glass,.009)
box('Front_grille',(0,2.749,.7),(1.21,.035,.21),trim,.008)
# Dark glazed cabin, with sloped front and rear glazing and a thin solid roof.
cabin=loft('Continuous_glass_cabin',[(-1.12,.99,1.04,1.15,1.1),(-.68,1.0,1.64,1.15,.97),(.64,1.0,1.64,1.15,.97),(1.14,.99,1.03,1.15,1.1)],glass)
bevel(cabin,.014)
box('Low_roof',(0,-.02,1.65),(1.99,1.4,.09),body,.025)
# Pillars cross glazing; the broad cabin surfaces remain legible at hero scale.
for x in [-1.16,1.16]:
    box('B_pillar',(x,.0,1.31),(.065,.1,.59),body,.012)
    box('Side_beltline',(x,0,1.02),(.11,2.27,.075),edge,.014)
    box('Door_handle',(x*1.125,-.25,.91),(.04,.29,.055),alloy,.006)
    box('Rocker_trim',(x*1.155,0,.44),(.11,2.62,.12),trim,.012)
    box('Mirror',(x*1.2,.85,1.13),(.27,.32,.16),body,.018)
# Low squared spoiler and trunk edge, key to the rear three-quarter silhouette.
for x in [-.94,.94]:
    box('Spoiler_mount',(x,-2.35,1.07),(.13,.19,.16),trim,.012)
box('Rear_spoiler',(0,-2.38,1.16),(2.56,.28,.1),edge,.016)
box('Trunk_lip',(0,-2.57,1.0),(2.47,.12,.055),edge,.012)
# Modest roof seams: three connected plates, never a checkerboard of cubes.
for x in [-.5,.5]:
    box('Roof_seam',(x,-.02,1.697),(.013,1.29,.007),trim,.002)
box('Hood_center_ridge',(0,1.95,.938),(.022,1.31,.01),edge,.003)
for x in [-.96,.96]:
    box('Rear_red_lamp',(x,-2.725,.83),(.48,.06,.21),red,.018)
    box('Rear_indicator',(x,-2.728,.952),(.48,.063,.065),amber,.01)
    box('Front_headlight',(x,2.732,.75),(.42,.064,.17),white,.014)
# Wheels have their own pivots. Octagonal tires and radial alloy spokes retain
# the block vocabulary while keeping an immediately readable wheel silhouette.
for sx in [-1,1]:
    for label,y in [('F',1.77),('R',-1.78)]:
        pivot=bpy.data.objects.new('wheel_'+label+('L' if sx<0 else 'R'),None)
        collection.objects.link(pivot);pivot.parent=root;pivot.location=(sx*1.34,y,.43)
        for name,radius,depth,offset,mat,vertices in [('Tire',.43,.31,0,rubber,12),('Rim',.285,.035,sx*.167,alloy,8),('Hub',.105,.055,sx*.194,trim,8)]:
            bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,rotation=(0,math.pi/2,0))
            obj=bpy.context.object;obj.name=pivot.name+'_'+name;own(obj,mat,pivot);obj.location=(offset,0,0);bevel(obj,.012,1)
        for angle in [0,math.pi/2,math.pi,math.pi*1.5]:
            spoke=box(pivot.name+'_spoke',(0,0,0),(.045,.09,.42),alloy,.008,pivot)
            spoke.location=(sx*.19,0,0);spoke.rotation_euler.x=angle
# Studio lives outside exported root/collection.
def studio_obj(obj):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    studio.objects.link(obj)
    return obj
floor_mat=material('Studio_floor',(.035,.032,.06),.1,.38)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.018))
floor=studio_obj(bpy.context.object);floor.name='StudioFloor';floor.data.materials.append(floor_mat)
for name,loc,power,color,size in [('Key',(2,-3,7),1100,(.76,.82,1),6),('Warm_rim',(-4,4,4),1450,(1,.38,.15),5),('Magenta_fill',(5,1,2.8),750,(.76,.14,1),4),('Rear_soft',(-3,-6,2.8),750,(.57,.66,1),4)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,.7))-obj.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('QuattroBeauty');cam=bpy.data.objects.new('QuattroBeauty',camdata);studio.objects.link(cam)
cam.location=(7,-10,5);cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=7.9;scene.camera=cam
scene.world=bpy.data.worlds.new('QuattroStudioWorld');scene.world.color=(.09,.09,.12)
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
for folder in ['public/art','art','output/blender']:(REPO/folder).mkdir(parents=True,exist_ok=True)
# Select only asset objects. Studio lights, floor and camera never enter GLB.
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(REPO/'public/art/quattro-car.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(REPO/'output/blender/quattro-car-beauty.png')
bpy.data.libraries.write(str(REPO/'art/quattro-car.blend'),{scene},fake_user=True)
# Rendering is a separate bridge command so the exported GLB can be integrated now.
bpy.context.window.scene=previous_scene
result={'status':'exported','glb':str(REPO/'public/art/quattro-car.glb'),'blend':str(REPO/'art/quattro-car.blend'),'scene':scene.name,'asset_objects':len(collection.objects),'render_pending':True}
