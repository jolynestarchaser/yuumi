"""Crop reviewed generated parts and render neutral/joint review composites.

No painting or invented pixels: extraction, uniform resize, and compositing only.
All input masters remain untouched. Run from the repository root.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

def extract(source, box, destination):
  image = Image.open(source).convert('RGBA').crop(box)
  visible = image.getchannel('A').point(lambda alpha: 255 if alpha > 24 else 0).getbbox()
  if not visible:
    raise ValueError(f'Empty part {destination}')
  # Preserve source alpha, with a small crop margin around visible art.
  x0, y0, x1, y1 = visible
  image = image.crop((max(0,x0-4), max(0,y0-4), min(image.width,x1+4), min(image.height,y1+4)))
  image.save(destination)
  return image

def main():
  specification = json.loads((ROOT/'outputs/companion-rigs/fox/placement.json').read_text())
  output = ROOT/'client/public/assets/companions/rig-v1/fox/base'
  output.mkdir(parents=True, exist_ok=True)
  parts = []
  composite = Image.new('RGBA',(512,512))
  for entry in sorted(specification['parts'], key=lambda part: part['order']):
    # The reference-head crop retains its authored canvas. That keeps its
    # silhouette at the same stage coordinate as the original frame.
    if entry.get('preserveCanvas'):
      part = Image.open(ROOT/entry['master']).convert('RGBA').crop(entry['crop'])
      if not part.getchannel('A').getbbox():
        raise ValueError(f"Empty part {entry['id']}")
      part.save(output/(entry['id']+'.png'))
    else:
      part = extract(ROOT/entry['master'], entry['crop'], output/(entry['id']+'.png'))
    x,y,width = entry['placement']
    height = width * part.height / part.width
    stage = part.resize((round(width),round(height)),Image.Resampling.LANCZOS)
    # Neutral is rendered from the approved reference plate. The remaining
    # layers are retained in the rig and are only selected for locomotion.
    if entry['id'] == 'head':
      composite.alpha_composite(stage,(round(x),round(y)))
    parts.append({
      'id':entry['id'], 'parent':entry.get('parent'),
      'source':f"/assets/companions/rig-v1/fox/base/{entry['id']}.png",
      'bounds':[x,y,width,round(height,3)], 'pivot':entry['pivot'],
      'order':entry['order'], 'rest':{'translate':[0,0],'rotate':0,'scale':[1,1]},
      'motion':entry.get('motion'), 'multiplier':entry.get('multiplier',1),
      'phase':entry.get('phase',0),
      'provenance': {'kind':entry.get('kind','reconstructed'), 'master':entry['master']},
    })
    if 'stateSource' in entry:
      state = entry['stateSource']
      sleep = extract(ROOT/state['master'], state['crop'], output/(state['id']+'.png'))
      parts[-1]['stateSources'] = {'sleep': f"/assets/companions/rig-v1/fox/base/{state['id']}.png"}
  # The approved neutral reference plate disappears only for locomotion, where
  # the complete, independently drawn limb layers are intentionally exposed.
  Image.new('RGBA', (1, 1), (0, 0, 0, 0)).save(output/'blank.png')
  rig={'version':1,'species':'fox','formId':'base','archetype':'quadruped','canvas':[512,512],
    'anchor':[256,448],'safeBounds':[24,24,464,456],'shadow':'runtime','parts':parts}
  (output/'rig.json').write_text(json.dumps(rig,indent=2)+'\n')
  composite.save(ROOT/'outputs/companion-rigs/fox/neutral.png')
  original=Image.open(ROOT/'client/public/assets/companions/illustrated-v1/fox.png').convert('RGBA').crop((154,26,506,359))
  scale=min(432/original.width,392/original.height)
  original=original.resize((round(original.width*scale),round(original.height*scale)),Image.Resampling.LANCZOS)
  comparison=Image.new('RGBA',(1024,550),(246,240,249,255))
  comparison.alpha_composite(original,(round((512-original.width)/2),448-original.height))
  comparison.alpha_composite(composite,(512,0))
  draw=ImageDraw.Draw(comparison)
  draw.text((20,510),'Original base',fill='black')
  draw.text((532,510),'Reconstructed neutral candidate',fill='black')
  comparison.convert('RGB').save(ROOT/'outputs/companion-rigs/fox/comparison.jpg')
  print(json.dumps({'parts':len(parts),'output':str(output),'bounds':composite.getbbox()}))

if __name__=='__main__':
  main()
