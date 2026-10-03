"""Fit intact candidate layers to the mood board; never crop hidden anatomy.

Writes placements only. Immutable before-pass snapshots permit visual comparison.
Pixel loss guides placement, but the resulting overlays still require art review.
"""
import json
import shutil
from pathlib import Path
import numpy as np
from PIL import Image
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'outputs/companion-rigs/v2'
loader = importlib.util.spec_from_file_location('assembler', ROOT / 'scripts/assemble-companion-rigs-v2.py')
assembler = importlib.util.module_from_spec(loader)
loader.loader.exec_module(assembler)

def snapshot(folder):
  before = folder / 'before-fidelity'
  if before.exists(): return
  before.mkdir()
  for name in ('assembly.json', 'neutral.png', 'original.png', 'overlay.png', 'comparison.jpg', 'validation.json'):
    shutil.copy2(folder / name, before / name)
  shutil.copytree(ROOT / f'client/public/assets/companions/rig-v2/{folder.name}/base', before / 'runtime')

def fit(folder):
  snapshot(folder)
  if folder.name == 'fox': return # Its original-derived neutral already matches.
  spec = json.loads((folder / 'assembly.json').read_text())
  if spec.get('authoritativeSurfaces'):
    print(folder.name, 'final surface pass retained; placement search skipped', flush=True)
    return
  baseline = json.loads((folder / 'before-fidelity/assembly.json').read_text())
  old = {p['id']: p for p in baseline['parts']}
  parts = spec['parts']
  textures = {}
  for p in parts:
    master = Image.open(folder / p.get('master', 'master.png')).convert('RGBA')
    crop = assembler.isolate(master.crop(p['crop']))
    crop = crop.crop(crop.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox())
    textures[p['id']] = crop
    p.setdefault('height', p['placement'][2] * crop.height / crop.width)

  # Art-directed starting poses: tuck complete upper limbs behind foreground
  # plates, expand torso overlap, and remove exposed neck/shoulder separation.
  seeds = {
    'robot': {'body': [195,274,122,94], 'neck': [240,257,32,13],
      'arm_r': [115,279,89,123], 'arm_l': [310,279,89,123],
      'leg_r': [160,347,86,101], 'leg_l': [263,347,86,101]},
    'spirit': {'body': [176,265,151,167], 'leg_r': [178,387,59,61], 'leg_l': [261,387,59,61],
      'arm_r': [142,290,64,72], 'arm_l': [292,290,64,72],
      'ear_r': [40,135,186,173], 'ear_l': [286,135,186,181],
      'head': [171,120,174,140], 'sprout': [214,61,115,67]},
    'child': {'head': [163,56,174,214], 'ear_r': [91,160,119,105], 'ear_l': [306,160,115,105],
      'body': [176,272,164,156], 'arm_r': [164,295,56,99], 'arm_l': [303,295,56,99],
      'collar_front': [185,265,143,63], 'leg_r': [184,379,75,69], 'leg_l': [265,379,72,69]},
    'custom': {'head': [167,112,187,217], 'body': [170,312,175,136],
      'leg_r': [184,394,66,54], 'leg_l': [270,394,66,54],
      'arm_r': [161,327,46,68], 'arm_l': [309,327,46,68],
      'collar_front': [194,315,120,50], 'tail': [327,358,60,74]},
  }
  # Seeds apply once; subsequent runs refine the current config.
  if not spec.get('neutralFidelityPass'):
    for p in parts:
      seed = seeds.get(folder.name, {}).get(p['id'])
      if seed: p['placement'], p['height'] = seed[:3], seed[3]
    if folder.name in ('spirit','child','custom'):
      # The complete arms remain articulated, beneath the body's silhouette.
      # Existing hierarchy is retained; sibling foreground cover draws later.
      for p in parts:
        if p['id'] in ('arm_r','arm_l'): p['order'] = -2
    if folder.name == 'custom':
      for p in parts:
        if p['id'] == 'collar_front': p['order'] = 10

  def draw_order(parent=None):
    result = []
    for p in sorted((p for p in parts if p.get('parent') == parent), key=lambda p: (p['order'], p['id'])):
      result.append(p)
      result.extend(draw_order(p['id']))
    return result
  ordered = draw_order()
  # A child always renders after its parent's image. Foreground collar/head
  # cover the upper arm; keeping parentage preserves the accepted motion graph.
  reference = Image.open(folder / 'original.png').convert('RGBA')
  for resolution, steps in ((128, (12,6,3)), (256, (3,1))):
    ratio = resolution / 512
    ref = np.asarray(reference.resize((resolution,resolution),Image.Resampling.LANCZOS),dtype=np.float32)/255
    ref_alpha = ref[:,:,3:4]
    ref_rgb = ref[:,:,:3]*ref_alpha
    def render(p):
      x,y,w = p['placement']; h = p['height']
      tex = textures[p['id']].resize((max(1,round(w*ratio)),max(1,round(h*ratio))),Image.Resampling.BILINEAR)
      stage = Image.new('RGBA',(resolution,resolution))
      stage.alpha_composite(tex,(round(x*ratio),round(y*ratio)))
      angle = p.get('neutralRotation',0)
      if angle: stage = stage.rotate(-angle,Image.Resampling.BICUBIC,center=tuple(v*ratio for v in p['pivot']))
      array = np.asarray(stage,dtype=np.float32)/255
      array[:,:,:3] *= array[:,:,3:4]
      return array
    cache = {p['id']: render(p) for p in parts}
    def loss():
      result = np.zeros_like(ref)
      for p in ordered:
        a = cache[p['id']]
        result = a + result*(1-a[:,:,3:4])
      # Alpha silhouette and premultiplied palette/markings jointly guide fit.
      return float(np.mean(np.abs(result[:,:,3:4]-ref_alpha))*3 + np.mean(np.abs(result[:,:,:3]-ref_rgb)))
    for step in steps:
      for repeat in range(4):
        improved = False
        for p in ordered:
          start = [*p['placement'],p['height']]
          previous = old[p['id']]
          min_w = previous['placement'][2]*.5
          max_w = previous['placement'][2]*1.5
          original_h = previous.get('height', previous['placement'][2]*textures[p['id']].height/textures[p['id']].width)
          ground = p['id'].startswith(('leg_','foot_','front_leg_','hind_leg_'))
          best_loss = loss(); best = start
          for axis in range(4):
            for delta in (-step,step):
              trial = start.copy(); trial[axis] += delta
              if ground and axis == 3: trial[1] = 448-trial[3]
              if ground and axis == 1: continue
              if not (min_w <= trial[2] <= max_w and original_h*.5 <= trial[3] <= original_h*1.65): continue
              p['placement'],p['height'] = trial[:3],trial[3]
              cache[p['id']] = render(p)
              current = loss()
              if current < best_loss-1e-7: best_loss,best = current,trial
          p['placement'],p['height'] = best[:3],best[3]
          cache[p['id']] = render(p)
          if best != start: improved = True
        if not improved: break
    print(folder.name,resolution,round(loss(),5),flush=True)
  for p in parts:
    b = old[p['id']]; bx,by,bw = b['placement']
    bh = b.get('height',bw*textures[p['id']].height/textures[p['id']].width)
    x,y,w = p['placement']; h = p['height']
    p['pivot'] = [round(x+(b['pivot'][0]-bx)*w/bw,2),round(y+(b['pivot'][1]-by)*h/bh,2)]
  spec['neutralFidelityPass'] = 'intact-layer-placement-v1'
  (folder/'assembly.json').write_text(json.dumps(spec,indent=2)+'\n')

if __name__ == '__main__':
  import sys
  names = sys.argv[1:] or ['fox','bunny','robot','frog','cat','dog','dragon','duck','spirit','child','custom']
  for name in names: fit(WORK/name)
