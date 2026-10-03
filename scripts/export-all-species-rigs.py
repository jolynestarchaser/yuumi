"""Export the actual neutral layer assemblies as a shareable review board."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPECIES = ['fox', 'bunny', 'robot', 'frog', 'cat', 'dog', 'dragon', 'duck', 'spirit', 'child', 'custom']

def font(size, bold=False):
  path = 'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf'
  try: return ImageFont.truetype(path, size)
  except OSError: return ImageFont.load_default()

board = Image.new('RGB', (2200, 2020), '#f4eef8')
draw = ImageDraw.Draw(board)
draw.text((64, 46), 'Companion rigs — all species', fill='#403348', font=font(58, True))
draw.text((67, 122), 'Actual neutral assemblies from separate layers • Candidate artwork / not production-ready', fill='#6e6278', font=font(25))

for index, species in enumerate(SPECIES):
  x = 64 + (index % 4) * 522
  y = 196 + (index // 4) * 576
  draw.rounded_rectangle((x, y, x + 504, y + 554), radius=12, fill='white', outline='#d7cede', width=2)
  draw.text((x + 22, y + 18), species.upper(), fill='#403348', font=font(25, True))
  draw.text((x + 22, y + 51), 'LAYERED CANDIDATE', fill='#8c6b3e', font=font(14, True))
  tile = Image.new('RGBA', (464, 464), '#f9f6fb')
  tile_draw = ImageDraw.Draw(tile)
  for row in range(0, 464, 24):
    for col in range(0, 464, 24):
      if (row // 24 + col // 24) % 2:
        tile_draw.rectangle((col, row, col + 23, row + 23), fill='#eee9f2')
  composite = Image.open(ROOT / f'outputs/companion-rigs/v2/{species}/neutral.png').convert('RGBA')
  composite = composite.resize((464, 464), Image.Resampling.LANCZOS)
  tile.alpha_composite(composite)
  tile_draw.line((20, 406, 444, 406), fill='#aea0b8', width=1)
  board.paste(tile.convert('RGB'), (x + 20, y + 80))

draw.text((67, 1951), 'Fox → Bunny → Robot → Frog → remaining species • Shared ground anchor: (256, 448)', fill='#6e6278', font=font(22))
destination = ROOT / 'outputs/all-species-rigs.png'
board.save(destination, optimize=True)
print(destination)
