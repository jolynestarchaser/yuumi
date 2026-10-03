"""Render a shareable PNG mood board from the non-destructive base-art crops."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'outputs/companion-moodboard.png'
CARDS = [
  ('cat', 'VELVET STARGAZER', 'Quiet, watchful, warm-lit', 'Measured tail sweep', '#d9c7f2'),
  ('dog', 'SUNLIT SCOUT', 'Open-hearted, sturdy, bright', 'Easy four-paw trot', '#f4c98c'),
  ('frog', 'POND GUARDIAN', 'Mossy, buoyant, curious', 'Squat, launch, soft landing', '#b8ddb1'),
  ('dragon', 'CLOUD EMBER', 'Small wonder with ancient spark', 'Weighty wingless step', '#c8b7ea'),
  ('duck', 'POCKET SAILOR', 'Cheery, practical, water-ready', 'Compact side-to-side waddle', '#f5db83'),
  ('spirit', 'LANTERN WISP', 'Gentle glow, drifting calm', 'Slow suspended float', '#b9d9ef'),
  ('bunny', 'MEADOW COURIER', 'Quick, soft, alert', 'Two-beat hop with ear follow-through', '#f3d3df'),
  ('fox', 'AMBER TRAILFINDER', 'Bright-eyed, quick, brush-tailed', 'Four-leg fox trot', '#f0b072'),
  ('robot', 'TIN-CAN KEEPER', 'Kindly, dependable, little cosmic', 'Deliberate mechanical step', '#a8d7e8'),
  ('child', 'GARDEN SPRITE', 'Storybook, leafy, tender', 'Light walk with foliage sway', '#edc594'),
  ('custom', 'DREAM COMPANION', 'Softly surreal, user-shaped', 'Pillow-soft bob and follow-through', '#d5c5ef'),
]

def font(size, bold=False):
  candidates = [
    'C:/Windows/Fonts/georgiab.ttf' if bold else 'C:/Windows/Fonts/georgia.ttf',
    'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
  ]
  for candidate in candidates:
    try: return ImageFont.truetype(candidate, size)
    except OSError: pass
  return ImageFont.load_default()

def color(hex_color):
  return tuple(int(hex_color[index:index + 2], 16) for index in (1, 3, 5))

canvas = Image.new('RGB', (2048, 1820), '#15121a')
draw = ImageDraw.Draw(canvas)
for y in range(canvas.height):
  t = y / canvas.height
  draw.line((0, y, canvas.width, y), fill=(23 + int(9 * (1 - t)), 18 + int(8 * (1 - t)), 28 + int(10 * (1 - t))))

draw.text((82, 70), 'YUU & MI / COMPANION WORLD', fill='#f5c886', font=font(22, True))
draw.text((76, 106), 'Species mood board', fill='#fff8f2', font=font(88, True))
draw.text((82, 216), 'Base-art reference for silhouette, palette, personality, and motion direction.', fill='#d9cedb', font=font(25))
draw.text((82, 250), 'Original painted artwork shown without replacement or regeneration.', fill='#d9cedb', font=font(25))

card_width, card_height = 440, 420
gap, start_x, start_y = 34, 82, 320
for index, (species, title, note, motion, accent) in enumerate(CARDS):
  column, row = index % 4, index // 4
  x = start_x + column * (card_width + gap)
  y = start_y + row * (card_height + gap)
  accent_rgb = color(accent)
  card = Image.new('RGBA', (card_width, card_height), (36, 30, 43, 255))
  card_draw = ImageDraw.Draw(card)
  card_draw.rectangle((0, 0, card_width - 1, card_height - 1), outline=accent_rgb + (185,), width=2)
  card_draw.rectangle((0, 0, card_width, 250), fill=tuple((channel + 38) // 2 for channel in accent_rgb) + (255,))
  art = Image.open(ROOT / 'client/public/assets/companions/moodboard-v1' / f'{species}.png').convert('RGBA')
  art.thumbnail((380, 224), Image.Resampling.LANCZOS)
  card.alpha_composite(art, ((card_width - art.width) // 2, 18 + (224 - art.height) // 2))
  card_draw.text((24, 267), species.upper(), fill=accent_rgb, font=font(15, True))
  card_draw.text((24, 292), title, fill='#fff8f2', font=font(25, True))
  card_draw.text((24, 330), note, fill='#e5dce7', font=font(16))
  card_draw.line((24, 364, card_width - 24, 364), fill=(255, 255, 255, 55), width=1)
  card_draw.text((24, 378), motion, fill='#fff1d7', font=font(14, True))
  canvas.paste(card, (x, y), card)

draw.text((82, 1755), 'GROUND ANCHOR: 256 × 448  ·  PAINTED BASE ART IS AUTHORITATIVE FOR NEUTRAL SILHOUETTE REVIEW.', fill='#afa3b5', font=font(16, True))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, optimize=True)
print(OUTPUT)
