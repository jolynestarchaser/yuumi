"""Silhouette study for the companion's four XP forms and three care paths.

Run from the repository root: python pixel-art/companion-forms/build.py
The live SVG retains per-player colours and species; this sheet is an art reference.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".agents" / "skills" / "pixel-art-studio" / "scripts"))
from pixelstudio import Sprite  # noqa: E402

OUT = Path(__file__).resolve().parent
sprite = Sprite(128, 96)
INK = "#423452"
BODY = "#d4c2f0"
SHADE = "#ab93c8"
LIGHT = "#eee1ff"
ACCENT = "#b7d9b8"


def draw_form(tier: int, path: str, ox: int, oy: int) -> None:
    # Rounded slabs define the mass. Guardian widens, explorer grows taller,
    # trickster becomes asymmetrical; age marks are deliberately absent.
    if path == "guardian":
        left, right, top, bottom = 7 - tier, 24 + tier, 10 - tier // 2, 26 + tier
    elif path == "explorer":
        left, right, top, bottom = 8 - tier // 2, 23 + tier // 2, 10 - tier * 2, 26 + tier
    else:
        left, right, top, bottom = 7 - tier, 24 + tier, 10 - tier, 26 + tier
    # Two short leaf ears keep a common species read through every XP form.
    sprite.rect(ox + 7, oy + max(1, top - 6), ox + 11, oy + top + 1, INK)
    sprite.rect(ox + 8, oy + max(2, top - 5), ox + 10, oy + top + 1, ACCENT)
    sprite.rect(ox + 21, oy + max(1, top - 6), ox + 25, oy + top + 1, INK)
    sprite.rect(ox + 22, oy + max(2, top - 5), ox + 24, oy + top + 1, ACCENT)
    sprite.rect(ox + left + 2, oy + top - 3, ox + right - 2, oy + bottom, INK)
    sprite.rect(ox + left, oy + top + 2, ox + right, oy + bottom - 3, INK)
    sprite.rect(ox + left + 2, oy + top - 2, ox + right - 2, oy + bottom - 1, BODY)
    sprite.rect(ox + left + 1, oy + top + 2, ox + right - 1, oy + bottom - 3, BODY)
    sprite.rect(ox + left + 3, oy + top, ox + right - 5, oy + top + 1, LIGHT)
    sprite.rect(ox + right - 3, oy + top + 4, ox + right - 2, oy + bottom - 3, SHADE)
    if path == "trickster" and tier:
        sprite.rect(ox + right - 1, oy + top + 4, ox + right + tier, oy + top + 7, ACCENT)
    if path == "explorer" and tier:
        sprite.rect(ox + left - tier, oy + top + 8, ox + left, oy + top + 12, ACCENT)
    if path == "guardian" and tier:
        sprite.rect(ox + left - tier, oy + top + 9, ox + left, oy + top + 14, ACCENT)
        sprite.rect(ox + right, oy + top + 9, ox + right + tier, oy + top + 14, ACCENT)
    sprite.rect(ox + 9, oy + 18, ox + 10, oy + 20, INK)
    sprite.rect(ox + 21, oy + 18, ox + 22, oy + 20, INK)
    sprite.rect(ox + 15, oy + 22, ox + 17, oy + 22, INK)
    sprite.rect(ox + 11, oy + 22, ox + 12, oy + 22, ACCENT)
    sprite.rect(ox + 19, oy + 22, ox + 20, oy + 22, ACCENT)
    sprite.rect(ox + 8, oy + 27, ox + 12, oy + 28, BODY)
    sprite.rect(ox + 20, oy + 27, ox + 24, oy + 28, BODY)


for row, path in enumerate(("guardian", "explorer", "trickster")):
    for tier in range(4):
        draw_form(tier, path, tier * 32, row * 32)

sprite.save_png(str(OUT / "form-study-1x.png"))
sprite.save_png(str(OUT / "form-study-8x.png"), scale=8, bg="#1c2039")
