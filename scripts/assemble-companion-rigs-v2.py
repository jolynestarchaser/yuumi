"""Extract generated anatomical layers without painting; compare true composites.

Each config contains crop boxes and stage placements. Authoritative visible
surfaces are divided among anatomical parts; no runtime layer is a whole
character. Candidates stay unregistered.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter
from collections import deque
import importlib.util

surface_loader = importlib.util.spec_from_file_location('neutral_surfaces', Path(__file__).with_name('companion-neutral-surfaces.py'))
surface_module = importlib.util.module_from_spec(surface_loader)
surface_loader.loader.exec_module(surface_module)

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'outputs/companion-rigs/v2'

def isolate(crop):
  """Keep the primary connected alpha island, excluding adjacent cell debris."""
  alpha = crop.getchannel('A')
  width, height = crop.size
  pixels = bytearray(alpha.point(lambda a: 1 if a > 16 else 0).tobytes())
  largest = []
  for start in range(len(pixels)):
    if not pixels[start]: continue
    pixels[start] = 0
    queue, component = deque([start]), []
    while queue:
      current = queue.popleft()
      component.append(current)
      x, y = current % width, current // width
      for other in ((current-1 if x else -1), (current+1 if x+1 < width else -1), (current-width if y else -1), (current+width if y+1 < height else -1)):
        if other >= 0 and pixels[other]:
          pixels[other] = 0
          queue.append(other)
    if len(component) > len(largest): largest = component
  if not largest: raise ValueError('Empty primary alpha island')
  mask_bytes = bytearray(width*height)
  for index in largest: mask_bytes[index] = 255
  mask = Image.frombytes('L', crop.size, bytes(mask_bytes)).filter(ImageFilter.MaxFilter(3))
  crop.putalpha(ImageChops.multiply(alpha, mask))
  return crop

def main():
  rigs = {}
  for config_path in WORK.glob('*/assembly.json'):
    spec = json.loads(config_path.read_text())
    species = spec['species']
    master = Image.open(config_path.parent / 'master.png').convert('RGBA')
    target = ROOT / f'client/public/assets/companions/rig-v2/{species}/base'
    target.mkdir(parents=True, exist_ok=True)
    base = Image.open(ROOT / f'client/public/assets/companions/moodboard-v1/{species}.png').convert('RGBA')
    base_scale = min(432/base.width,392/base.height)
    base = base.resize((round(base.width*base_scale),round(base.height*base_scale)),Image.Resampling.LANCZOS)
    reference = Image.new('RGBA',(512,512))
    reference.alpha_composite(base,(round((512-base.width)/2),448-base.height))
    layers = []
    textures = {}
    underpaint_fits = {}
    anatomy = config_path.parent / 'generated-anatomy'
    anatomy.mkdir(exist_ok=True)
    neutral = Image.new('RGBA', (512, 512))
    for entry in spec['parts']:
      part_master = Image.open(config_path.parent / entry['master']).convert('RGBA') if 'master' in entry else master
      crop = isolate(part_master.crop(entry['crop']))
      bounds = crop.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
      if not bounds: raise ValueError(f'Empty layer: {species}/{entry["id"]}')
      crop = crop.crop(bounds)
      crop.save(target / f'{entry["id"]}.png')
      crop.save(anatomy / f'{entry["id"]}.png')
      x, y, width = entry['placement']
      height = entry.get('height', width * crop.height / crop.width)
      resized = crop.resize((round(width), round(height)), Image.Resampling.LANCZOS)
      textures[entry['id']] = resized
      part = {'id': entry['id'], 'source': f'/assets/companions/rig-v2/{species}/base/{entry["id"]}.png',
        'bounds': [x, y, width, round(height, 3)], 'pivot': entry['pivot'],
        'order': entry['order'], 'rest': {'translate': [0, 0], 'rotate': 0, 'scale': [1, 1]},
        'multiplier': entry.get('multiplier', 1), 'phase': entry.get('phase', 0)}
      for key in ('parent', 'motion'):
        if key in entry: part[key] = entry[key]
      if 'sleepCrop' in entry:
        sleep = isolate(master.crop(entry['sleepCrop']))
        box = sleep.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
        sleep.crop(box).save(target / f'{entry["id"]}_sleep.png')
        sleep.crop(box).save(anatomy / f'{entry["id"]}_sleep.png')
        part['stateSources'] = {'sleep': f'/assets/companions/rig-v2/{species}/base/{entry["id"]}_sleep.png'}
      layers.append(part)
    if spec.get('neutralBodyCover'):
      # An addressable foreground plate reuses the intact torso texture. Arms
      # keep their full image and motion below it; only outer paws show at rest.
      body = next(p for p in layers if p['id'] == 'body')
      cover = {**body, 'id': 'body_front', 'parent': 'body', 'order': 8}
      cover.pop('motion', None)
      layers.append(cover)
      textures['body_front'] = textures['body']
    if spec.get('authoritativeSurfaces', False) or species == 'fox':
      # Extract authoritative visible surfaces, never a whole-character layer.
      # Generated pixels are used only beneath later-drawn opaque surfaces.
      if species == 'fox':
        for part in layers:
          if part['id'] == 'head': part['order'] = 6
          if part['id'] == 'chest_fluff': part['order'] = 7
      visible = surface_module.surfaces(species,reference,layers)
      def flatten(parent=None):
        names = []
        for part in sorted((p for p in layers if p.get('parent') == parent),key=lambda p:(p['order'],p['id'])):
          names.append(part['id'])
          names.extend(flatten(part['id']))
        return names
      paint_order = flatten()
      for index, name in enumerate(paint_order):
        part = next(p for p in layers if p['id'] == name)
        if name == 'body_front':
          # This is a foreground surface, not another anatomical torso. Its
          # full generated underpaint already belongs to the parent body.
          visible[name].save(target/f'{name}.png')
          textures[name] = visible[name]
          part['source'] = f'/assets/companions/rig-v2/{species}/base/{name}.png'
          part['bounds'] = [0,0,512,512]
          underpaint_fits[name] = {'source': 'generated-anatomy/body.png', 'anatomyOwner': 'body', 'foregroundOnly': True}
          continue
        x,y,width,height = part['bounds']
        occluders = Image.new('L',(512,512))
        for other in paint_order[index:]:
          occluders = ImageChops.lighter(occluders,visible[other].getchannel('A'))
        # Keep the complete generated underpainting. Fit its placement beneath
        # opaque original surfaces instead of cutting away hidden anatomy.
        import numpy as np
        allowed = np.asarray(occluders.resize((128,128),Image.Resampling.BILINEAR),dtype=np.float32)/255
        source = textures[name]
        def hidden_cost(placement):
          hx,hy,hw,hh = placement
          stage = Image.new('L',(128,128))
          alpha = source.getchannel('A').resize((max(1,round(hw/4)),max(1,round(hh/4))),Image.Resampling.BILINEAR)
          stage.paste(alpha,(round(hx/4),round(hy/4)))
          pixels = np.asarray(stage,dtype=np.float32)/255
          return float(np.sum(pixels*(1-allowed)))
        placement = [x,y,width,height]
        for step in (16,8,4,2):
          for repeat in range(10):
            start = placement.copy(); best_cost = hidden_cost(start)
            for axis in range(4):
              for delta in (-step,step):
                trial = start.copy(); trial[axis] += delta
                if trial[2] < width*.5 or trial[3] < height*.5: continue
                score = hidden_cost(trial)
                if score < best_cost-1e-6: best_cost,placement = score,trial
            if placement == start: break
        hx,hy,hw,hh = placement
        underpaint_fits[name] = {'source': f'generated-anatomy/{name}.png',
          'placement': placement, 'resampledCompleteSourceSize': list(source.size), 'outsideOpaqueCoverageAt128px': round(hidden_cost(placement),3)}
        hidden = Image.new('RGBA',(512,512))
        hidden.alpha_composite(source.resize((round(hw),round(hh)),Image.Resampling.LANCZOS),(round(hx),round(hy)))
        hidden.alpha_composite(visible[name])
        hidden.save(target/f'{name}.png')
        part['source'] = f'/assets/companions/rig-v2/{species}/base/{name}.png'
        textures[name] = hidden
        if 'stateSources' in part:
          sleep = Image.open(target/f'{name}_sleep.png').convert('RGBA').resize((round(width),round(height)),Image.Resampling.LANCZOS)
          sleep_stage = Image.new('RGBA',(512,512))
          sleep_stage.alpha_composite(sleep,(round(x),round(y)))
          sleep_stage.save(target/f'{name}_sleep.png')
        part['bounds'] = [0,0,512,512]
    (config_path.parent / 'underpaint-fit.json').write_text(json.dumps(underpaint_fits,indent=2)+'\n')
    def compose(parent=None, state='idle', swing=1):
      result = Image.new('RGBA', (512,512))
      for part in sorted((p for p in layers if p.get('parent') == parent), key=lambda p: (p['order'],p['id'])):
        stage = Image.new('RGBA', (512,512))
        x, y, width, height = part['bounds']
        texture = textures[part['id']]
        if state == 'sleep' and 'stateSources' in part:
          texture = Image.open(target / f'{part["id"]}_sleep.png').convert('RGBA').resize((round(width),round(height)),Image.Resampling.LANCZOS)
        stage.alpha_composite(texture, (round(x),round(y)))
        stage.alpha_composite(compose(part['id'], state, swing))
        angle = 0
        if state == 'locomotion':
          if part.get('motion') == 'leg':
            angle = (12 if spec['archetype'] == 'frog' else 8) * part['multiplier'] * swing * (-1 if part['phase'] < 0 else 1)
          elif part.get('motion') in ('ear','tail','leaf','antenna'):
            angle = 4 * part['multiplier'] * swing
        elif state == 'happy' and part.get('motion') in ('ear','tail','leaf','antenna'):
          angle = 4 * part['multiplier']
        if angle: stage = stage.rotate(-angle, resample=Image.Resampling.BICUBIC, center=tuple(part['pivot']))
        result.alpha_composite(stage)
      return result
    neutral = compose()
    rig = {'version': 1, 'species': species, 'formId': 'base', 'archetype': spec['archetype'],
      'canvas': [512,512], 'anchor': [256,448], 'safeBounds': [24,24,464,456], 'shadow': 'runtime', 'parts': layers}
    (target / 'rig.json').write_text(json.dumps(rig, indent=2) + '\n')
    rigs[species] = rig
    neutral.save(config_path.parent / 'neutral.png')
    poses = Image.new('RGBA', (2048,550), '#f4eef8')
    for index, state in enumerate(('idle','locomotion','happy','sleep')):
      poses.alpha_composite(compose(state=state), (index*512,0))
      ImageDraw.Draw(poses).text((index*512+20,516), state, fill='#403348')
    poses.convert('RGB').save(config_path.parent / 'states.jpg')
    compose(state='locomotion', swing=-1).save(config_path.parent / 'locomotion-opposite.png')
    original = Image.open(ROOT / f'client/public/assets/companions/moodboard-v1/{species}.png').convert('RGBA')
    scale = min(432 / original.width, 392 / original.height)
    original = original.resize((round(original.width*scale), round(original.height*scale)), Image.Resampling.LANCZOS)
    reference = Image.new('RGBA', (512,512))
    reference.alpha_composite(original, (round((512-original.width)/2), 448-original.height))
    reference.save(config_path.parent / 'original.png')
    overlay = Image.blend(reference, neutral, .5)
    overlay.save(config_path.parent / 'overlay.png')
    difference = ImageChops.difference(reference, neutral)
    # Difference uses premultiplied color on black, so transparent RGB cannot
    # create misleading residuals. Equal images are black on an opaque canvas.
    import numpy as np
    ref_pixels = np.asarray(reference,dtype=np.float32)/255
    rig_pixels = np.asarray(neutral,dtype=np.float32)/255
    color_delta = np.abs(ref_pixels[:,:,:3]*ref_pixels[:,:,3:4]-rig_pixels[:,:,:3]*rig_pixels[:,:,3:4])
    difference = Image.fromarray(np.uint8(np.clip(color_delta*255,0,255)))
    difference.save(config_path.parent / 'difference.png')
    comparison = Image.new('RGBA', (1536,550), '#f4eef8')
    for index, (label, art) in enumerate([('Original', reference),('Layered neutral',neutral),('50% overlay',overlay)]):
      comparison.alpha_composite(art, (index*512,0))
      ImageDraw.Draw(comparison).text((index*512+20,516), label, fill='#403348')
    comparison.convert('RGB').save(config_path.parent / 'comparison.jpg')
    alpha_original = reference.getchannel('A').point(lambda a: 255 if a > 32 else 0)
    alpha_neutral = neutral.getchannel('A').point(lambda a: 255 if a > 32 else 0)
    intersection = sum(1 for a in ImageChops.darker(alpha_original, alpha_neutral).tobytes() if a)
    union = sum(1 for a in ImageChops.lighter(alpha_original, alpha_neutral).tobytes() if a)
    metrics = {'status': 'candidate', 'silhouetteIoU': round(intersection/union,4),
      'neutralAlphaBounds': neutral.getbbox(), 'referenceAlphaBounds': reference.getbbox(),
      'groundErrorPx': neutral.getbbox()[3]-448, 'parts': [p['id'] for p in layers],
      'notes': 'Silhouette metric is diagnostic, never sufficient for art approval.'}
    (config_path.parent / 'validation.json').write_text(json.dumps(metrics,indent=2)+'\n')
    print(species, json.dumps(metrics))
  catalog = ROOT / 'client/src/components/companion/rigCandidates.generated.ts'
  catalog.write_text('// Generated by scripts/assemble-companion-rigs-v2.py. Review-only; never auto-register.\n'
    + "import type { CompanionRig } from './companionRig.js';\n"
    + "export const candidateRigs: Partial<Record<CompanionRig['species'], CompanionRig>> = "
    + json.dumps(rigs, indent=2) + ';\n')

if __name__ == '__main__': main()
