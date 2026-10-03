"""Export non-destructive, base-form crops for the local companion mood board."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FRAMES = {
  'bunny': (133, 47, 345, 287), 'cat': (98, 41, 401, 325),
  'child': (180, 17, 271, 322), 'custom': (95, 72, 371, 289),
  'dog': (131, 38, 343, 305), 'dragon': (111, 17, 396, 329),
  'duck': (192, 43, 237, 310), 'fox': (154, 26, 352, 333),
  'frog': (112, 75, 361, 262), 'robot': (194, 12, 226, 319),
  'spirit': (119, 23, 368, 330),
}

for species, (x, y, width, height) in FRAMES.items():
  source = ROOT / 'client/public/assets/companions/illustrated-v1' / f'{species}.png'
  destination = ROOT / 'client/public/assets/companions/moodboard-v1' / f'{species}.png'
  destination.parent.mkdir(parents=True, exist_ok=True)
  Image.open(source).convert('RGBA').crop((x, y, x + width, y + height)).save(destination)
print(f'Exported {len(FRAMES)} base-form crops.')
