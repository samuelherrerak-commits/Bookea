# Bookee: aligera la malla, le pone esqueleto con pesos por zonas y anima clips de prueba.
# Uso: blender -b --python rig.py -- <modelo original .glb> <salida .glb>  (RATIO=0.15 por defecto)
import bpy, sys, math
from mathutils import Vector
glb, salida = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = 30
bpy.ops.import_scene.gltf(filepath=glb)
m = [o for o in sc.objects if o.type == 'MESH'][0]; m.name = 'bookee'
bpy.ops.object.select_all(action='DESELECT'); m.select_set(True); bpy.context.view_layer.objects.active = m
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
d = m.modifiers.new('dec', 'DECIMATE'); d.ratio = float(__import__('os').environ.get('RATIO', '0.15'))
bpy.ops.object.modifier_apply(modifier='dec')
print('TRIS', sum(len(p.vertices) - 2 for p in m.data.polygons))

# ── esqueleto (Z arriba; el frente mira a -Y) ──
arm = bpy.data.armatures.new('esqueleto'); rig = bpy.data.objects.new('rig', arm); sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
def hueso(n, a, b, padre=None, conectar=False):
    e = arm.edit_bones.new(n); e.head = a; e.tail = b
    if padre: e.parent = arm.edit_bones[padre]; e.use_connect = conectar
    return e
hueso('raiz', (0, 0, 0), (0, 0.2, 0))
hueso('cadera', (0, 0, 0.30), (0, 0, 0.62), 'raiz')
hueso('cuerpo', (0, 0, 0.62), (0, 0, 1.45), 'cadera', True)
for s, L in ((-1, 'L'), (1, 'R')):
    hueso(f'brazo.{L}', (s*0.50, 0, 1.0), (s*0.74, 0, 1.03), 'cuerpo')
    hueso(f'mano.{L}', (s*0.74, 0, 1.03), (s*0.96, 0, 1.0), f'brazo.{L}', True)
    hueso(f'pierna.{L}', (s*0.24, 0, 0.32), (s*0.24, 0, 0.12), 'cadera')
    hueso(f'pie.{L}', (s*0.24, 0, 0.12), (s*0.24, -0.12, 0.04), f'pierna.{L}', True)
bpy.ops.object.mode_set(mode='OBJECT')

# ── pesos por zonas, con mezcla suave en las uniones ──
G = {n: m.vertex_groups.new(name=n) for n in [b.name for b in arm.bones]}
def liso(a, b, x):  # 0 en a, 1 en b
    t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
for v in m.data.vertices:
    p = v.co; L = 'L' if p.x < 0 else 'R'; ax = abs(p.x); w = {}
    if p.z < 0.31 and ax > 0.08:
        tp = liso(0.10, 0.15, p.z)          # pie → pierna
        tc = liso(0.26, 0.34, p.z)          # pierna → cadera
        w[f'pie.{L}'] = 1 - tp; w[f'pierna.{L}'] = tp * (1 - tc); w['cadera'] = tp * tc
    elif ax > 0.565 and 0.78 < p.z < 1.25:
        tb = liso(0.565, 0.62, ax)           # cuerpo → brazo
        tm = liso(0.70, 0.78, ax)           # brazo → mano
        w['cuerpo'] = 1 - tb; w[f'brazo.{L}'] = tb * (1 - tm); w[f'mano.{L}'] = tb * tm
    else:
        tc = liso(0.50, 0.75, p.z)
        w['cadera'] = 1 - tc; w['cuerpo'] = tc
    for n, x in w.items():
        if x > 0.001: G[n].add([v.index], x, 'REPLACE')
m.parent = rig; mod = m.modifiers.new('esqueleto', 'ARMATURE'); mod.object = rig

# ── clips ──
pb = rig.pose.bones
for b in pb: b.rotation_mode = 'XYZ'
def clip(nombre, cuadros, claves):
    rig.animation_data_create()
    a = bpy.data.actions.new(nombre); rig.animation_data.action = a
    for b in pb: b.location = (0, 0, 0); b.rotation_euler = (0, 0, 0); b.scale = (1, 1, 1)
    for f, ajustes in claves:
        for b in pb: b.location = (0, 0, 0); b.rotation_euler = (0, 0, 0); b.scale = (1, 1, 1)
        for (n, prop), val in ajustes.items():
            setattr(pb[n], prop, val)
        for b in pb:
            for prop in ('location', 'rotation_euler', 'scale'): b.keyframe_insert(prop, frame=f)
    a.use_fake_user = True
    trk = rig.animation_data.nla_tracks.new(); trk.name = nombre; trk.strips.new(nombre, 1, a); trk.mute = True
    rig.animation_data.action = None
    return a
R = math.radians
# huesos de brazo: el eje Y apunta hacia afuera, así que girar en X sube/baja (Blender local)
def brazos(izq, der, mi=0, md=0):
    # eje X local de cada brazo = frente/atrás del cuerpo: positivo sube el brazo, en los dos lados
    return {('brazo.L', 'rotation_euler'): (R(izq), 0, 0), ('brazo.R', 'rotation_euler'): (R(der), 0, 0),
            ('mano.L', 'rotation_euler'): (R(mi), 0, 0), ('mano.R', 'rotation_euler'): (R(md), 0, 0)}
quieto = {}
# saludo: mano derecha arriba, se mece
clip('saludo', 60, [(f, {**brazos(0, 70 + (20 if (f // 8) % 2 else -10), 0, 30), ('cuerpo', 'rotation_euler'): (0, R(4 * math.sin(f / 8)), 0)}) for f in range(1, 62, 8)])
# salto: se agacha, sube, cae
def salto(f):
    t = (f - 1) / 30
    if t < 0.25: s = 1 - 0.18 * math.sin(t / 0.25 * math.pi / 2); h = 0; b = -20
    elif t < 0.75: u = (t - 0.25) / 0.5; s = 1.08; h = 0.45 * math.sin(u * math.pi); b = 60
    else: u = (t - 0.75) / 0.25; s = 1 - 0.15 * math.sin(u * math.pi); h = 0; b = 0
    return {('raiz', 'location'): (0, 0, h), ('cadera', 'scale'): (1 / s ** 0.5, s, 1 / s ** 0.5), **brazos(b, b)}
clip('salto', 31, [(f, salto(f)) for f in range(1, 32, 3)])
# correr: ciclo de 16 cuadros
def correr(f):
    a = math.sin((f - 1) / 16 * 2 * math.pi)
    return {('pierna.L', 'rotation_euler'): (R(40 * a), 0, 0), ('pierna.R', 'rotation_euler'): (R(-40 * a), 0, 0),
            ('pie.L', 'rotation_euler'): (R(max(0, -30 * a)), 0, 0), ('pie.R', 'rotation_euler'): (R(max(0, 30 * a)), 0, 0),
            ('brazo.L', 'rotation_euler'): (R(-45), 0, R(35 * a)), ('brazo.R', 'rotation_euler'): (R(-45), 0, R(35 * a)),
            ('raiz', 'location'): (0, 0, 0.04 * abs(math.cos((f - 1) / 16 * 2 * math.pi))), ('cuerpo', 'rotation_euler'): (R(-8), 0, R(6 * a))}
clip('correr', 17, [(f, correr(f)) for f in range(1, 18, 2)])

for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', export_image_format='WEBP', export_image_quality=80,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True, export_yup=True, export_apply=False)
bpy.ops.wm.save_as_mainfile(filepath=salida.replace('.glb', '.blend'))
print('LISTO')
