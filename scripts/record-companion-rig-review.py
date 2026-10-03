"""Record a completed visual review; regeneration never approves candidates.

Run with --reviewed only after inspecting neutral overlays and configured
motion in the browser. Approval covers base forms, not evolved forms.
"""
import argparse
import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--reviewed', action='store_true', required=True)
parser.parse_args()

def digest(path):
  data = path.read_bytes()
  if path.suffix in ('.css','.tsx'): data = data.replace(b'\r\n',b'\n')
  return hashlib.sha256(data).hexdigest()

for folder in (ROOT/'outputs/companion-rigs/v2').iterdir():
  review_path = folder/'neutral-review.json'
  if not review_path.exists(): continue
  species = folder.name
  asset_folder = ROOT/f'client/public/assets/companions/rig-v2/{species}/base'
  rig = json.loads((asset_folder/'rig.json').read_text())
  review = json.loads(review_path.read_text())
  files = list(asset_folder.glob('*.png')) + [ROOT/f'client/src/components/companion/{name}' for name in ('illustrated-pet.css','RigSleepFace.tsx','CompanionRigParts.tsx')]
  review.update({
    'reviewDate': str(date.today()), 'neutralSha256': digest(folder/'neutral.png'),
    'originalSha256': digest(folder/'original.png'), 'productionReady': True,
    'reviewScope': 'base form; configured four-degree gait, six-degree frog limb swing',
    'statesReviewed': ['idle','locomotion','happy','sleep'],
    'verdict': 'Base enabled. Saved evolved forms and earned anatomy retain the original renderer.',
    'notes': 'Joint overlap closes cut gaps at configured motion. Wider swings need further plate cleanup. Sleep eyelids preserve the source head; generated sleep variants are archived.',
    'rigDefinitionSha256': hashlib.sha256(json.dumps(rig,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'reviewedAssetHashes': {str(path.relative_to(ROOT)).replace('\\','/'): digest(path) for path in files},
  })
  review_path.write_text(json.dumps(review,indent=2)+'\n')
  print(species, 'base review recorded')
