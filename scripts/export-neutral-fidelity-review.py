"""Export Original / Composite / 50% Overlay / Difference for all candidates."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPECIES = ['fox','bunny','robot','frog','cat','dog','dragon','duck','spirit','child','custom']
MODES = [('Original','original'),('Composite','neutral'),('50% Overlay','overlay'),('Difference','difference')]
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',34)
board = Image.new('RGB',(1536,11*430+140),'#f4eef8')
draw = ImageDraw.Draw(board)
draw.text((24,18),'Neutral fidelity review — all 11 species',font=title,fill='#403348')
draw.text((24,68),'Separate articulated layers • Ground (256,448) • Candidate; motion approval pending',font=font,fill='#655a70')
for i,species in enumerate(SPECIES):
  y = 120+i*430
  draw.text((24,y),species.upper(),font=font,fill='#403348')
  for j,(label,name) in enumerate(MODES):
    x = j*384
    art = Image.open(ROOT/f'outputs/companion-rigs/v2/{species}/{name}.png').convert('RGBA')
    tile = Image.new('RGBA',(360,360),'#eeeaf1' if name!='difference' else '#000000')
    tile.alpha_composite(art.resize((360,360),Image.Resampling.LANCZOS))
    board.paste(tile.convert('RGB'),(x+12,y+30))
    draw.text((x+12,y+394),label,font=font,fill='#655a70')
destination = ROOT/'outputs/companion-neutral-fidelity.png'
board.save(destination,optimize=True)
print(destination)
