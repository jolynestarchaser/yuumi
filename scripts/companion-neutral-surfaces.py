"""Authoritative visible-surface ownership, in the shared 512px stage.

Regions partition the source into anatomical surfaces, not a whole-character
cover. Complete generated underpaint remains below each surface. These bind-pose
cuts are reviewed separately from motion, where overlap may need further work.
"""
from PIL import Image, ImageDraw, ImageChops, ImageFilter

def rect(x1,y1,x2,y2):
  return [(x1,y1),(x2,y1),(x2,y2),(x1,y2)]

REGIONS = {
  'robot': {
    'head': rect(100,126,412,275), 'antenna': rect(215,24,305,127),
    'body': rect(194,275,319,369), 'neck': rect(233,271,282,282),
    'arm_r': rect(95,276,209,408), 'arm_l': rect(310,276,418,408),
    'leg_r': rect(145,344,254,460), 'leg_l': rect(255,344,368,460),
  },
  'spirit': {
    'head': [(170,111),(339,111),(345,258),(161,258)],
    'sprout': rect(194,24,339,128),
    'collar_front': [(172,253),(345,253),(329,294),(256,320),(181,294)],
    'arm_r': [(141,287),(194,282),(210,319),(197,361),(137,365)],
    'arm_l': [(307,282),(351,287),(370,365),(310,363),(298,321)],
    'ear_r': rect(24,121,183,313), 'ear_l': rect(333,121,489,322),
    'tail': rect(319,346,391,419),
    'leg_r': rect(162,410,243,460), 'leg_l': rect(266,410,337,460),
  },
  'child': {
    'head': [(150,24),(360,24),(352,271),(161,275),(150,181)],
    'collar_front': [(184,263),(333,263),(327,298),(256,328),(185,301)],
    'ear_r': rect(65,145,174,272), 'ear_l': rect(336,145,444,272),
    'arm_r': [(173,304),(201,292),(218,346),(206,386),(154,390)],
    'arm_l': [(316,292),(341,304),(366,390),(312,386),(297,346)],
    'side_leaf_r': rect(125,299,179,366), 'side_leaf_l': rect(340,299,396,367),
    'leg_r': rect(178,392,256,460), 'leg_l': rect(258,392,340,460),
    'tail': rect(175,267,202,296),
  },
  'custom': {
    'head': [(155,80),(375,80),(375,244),(350,326),(178,326),(155,246)],
    'collar_front': [(211,321),(305,321),(304,350),(257,363),(213,352)],
    'ear_r': rect(24,151,197,359), 'ear_l': rect(339,151,489,363),
    'arm_r': rect(145,326,190,387), 'arm_l': rect(328,327,362,387),
    'tail': rect(330,355,400,443),
    'leg_r': rect(178,417,259,460), 'leg_l': rect(261,417,341,460),
  },
  'bunny': {
    'head': [(134,24),(390,24),(391,174),(348,272),(332,285),(178,285),(143,261)],
    'chest_fluff': [(164,273),(349,273),(340,324),(258,354),(178,330)],
    'arm_r': [(187,310),(225,316),(248,378),(229,393),(197,379),(176,344)],
    'arm_l': [(281,310),(314,312),(339,344),(312,384),(284,393),(268,375)],
    'ear_r': rect(24,147,184,422), 'ear_l': rect(332,147,489,422),
    'tail': rect(111,373,179,438),
    'foot_r': rect(159,422,244,460), 'foot_l': rect(269,422,354,460),
  },
  'frog': {
    'head': [(78,88),(435,88),(435,256),(366,283),(146,283),(78,258)],
    'arm_r': [(106,274),(171,285),(209,382),(202,460),(87,460),(80,350)],
    'arm_l': [(341,285),(406,274),(432,350),(425,460),(310,460),(303,382)],
    'foot_r': rect(24,397,113,445), 'foot_l': rect(401,397,489,445),
    'thigh_r': rect(24,234,112,399), 'thigh_l': rect(401,234,489,399),
  },
  'duck': {
    'head': [(124,24),(399,24),(399,217),(355,267),(161,278),(124,242)],
    'wing_r': [(90,239),(180,239),(203,310),(159,367),(89,386)],
    'wing_l': [(344,239),(424,239),(424,386),(365,367),(317,310)],
    'chest_fluff': [(179,274),(344,272),(360,353),(325,393),(197,393),(165,354)],
    'tail': rect(350,336,420,389),
    'leg_r': rect(125,393,242,460), 'leg_l': rect(276,393,385,460),
  },
}

for species in ('cat','dog','dragon','fox'):
  REGIONS[species] = {
    'head': ([(24,24),(340,24),(340,248),(302,273),(235,278),(125,278),(24,253)] if species == 'fox'
      else rect(24,24,363 if species == 'dog' else 310,261 if species == 'dog' else 289 if species == 'cat' else 275)),
    'chest_fluff': ([(80,277),(220,277),(234,324),(210,375),(164,383),(89,347)] if species == 'fox'
      else [(92,262),(254,262),(235,353),(192,387),(106,367)] if species == 'dog'
      else [(83,284),(239,284),(231,342),(169,378),(91,348)] if species == 'cat'
      else [(89,268),(214,268),(214,340),(172,362),(91,339)]),
    'front_leg_r': rect(97 if species == 'fox' else 108 if species == 'cat' else 114 if species == 'dog' else 76,317,164 if species == 'fox' else 183 if species == 'cat' else 189 if species == 'dog' else 151,460),
    'front_leg_l': rect(163 if species == 'fox' else 184 if species == 'cat' else 190 if species == 'dog' else 152,317,221 if species == 'fox' else 255 if species == 'cat' else 270 if species == 'dog' else 230,460),
    'hind_leg_r': rect(219 if species == 'fox' else 247 if species == 'cat' else 270 if species == 'dog' else 230,366,263 if species == 'fox' else 271 if species == 'cat' else 301 if species == 'dog' else 263,460),
    'hind_leg_l': rect(263 if species == 'fox' else 272 if species == 'cat' else 302 if species == 'dog' else 264,325,315 if species == 'fox' else 348 if species == 'cat' else 410 if species == 'dog' else 344,460),
    'tail': [(306,191),(488,170),(488,435),(304,435),(284,364),(281,291)] if species == 'fox' else rect(303 if species == 'cat' else 310 if species == 'dog' else 329,139,489,426),
  }

def surfaces(species, reference, layers):
  remaining = Image.new('L',reference.size,255)
  masks = {}
  for name, points in REGIONS[species].items():
    region = Image.new('L',reference.size)
    ImageDraw.Draw(region).polygon(points,fill=255)
    masks[name] = ImageChops.multiply(region,remaining)
    remaining = ImageChops.subtract(remaining,masks[name])
  # The compact creatures' foreground torso naturally occludes upper limbs.
  torso = 'body_front' if any(p['id'] == 'body_front' for p in layers) else 'body'
  masks[torso] = ImageChops.lighter(masks.get(torso,Image.new('L',reference.size)),remaining)
  result = {}
  for part in layers:
    # Source-colour bleed behind adjacent plates closes joints throughout the
    # gait. Restrict it to fully opaque source pixels: duplicating translucent
    # perimeter pixels would change the neutral silhouette and antialiasing.
    owned = masks.get(part['id'],Image.new('L',reference.size))
    opaque = reference.getchannel('A').point(lambda a: 255 if a >= 240 else 0)
    bleed = ImageChops.multiply(owned.filter(ImageFilter.MaxFilter(41)),opaque)
    if part.get('motion') == 'leg':
      # Extend a moving limb at its socket, never into the neighbouring foot.
      socket = Image.new('L',reference.size)
      px,py = part['pivot']
      ImageDraw.Draw(socket).rectangle((px-70,py-55,px+70,py+30),fill=255)
      bleed = ImageChops.multiply(bleed,socket)
    surface = reference.copy()
    surface.putalpha(ImageChops.multiply(reference.getchannel('A'),ImageChops.lighter(owned,bleed)))
    result[part['id']] = surface
  return result
