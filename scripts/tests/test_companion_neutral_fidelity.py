"""Asset acceptance checks: neutral fidelity and preservation of hidden anatomy."""
import json
import unittest
import hashlib
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'outputs/companion-rigs/v2'
SPECIES = ('fox','bunny','robot','frog','cat','dog','dragon','duck','spirit','child','custom')

class NeutralFidelity(unittest.TestCase):
  def test_review_records_match_the_enabled_assets(self):
    for name in SPECIES:
      review = json.loads((WORK/name/'neutral-review.json').read_text())
      self.assertTrue(review['neutralOverlayVisuallyReviewed'])
      self.assertTrue(review['productionReady'])
      self.assertIn('base form',review['reviewScope'])
      self.assertEqual(review['statesReviewed'],['idle','locomotion','happy','sleep'])
      for relative, expected in review['reviewedAssetHashes'].items():
        path = ROOT/relative
        data = path.read_bytes()
        if path.suffix in ('.css','.tsx'): data = data.replace(b'\r\n',b'\n')
        self.assertEqual(hashlib.sha256(data).hexdigest(),expected,relative)
      rig = json.loads((ROOT/f'client/public/assets/companions/rig-v2/{name}/base/rig.json').read_text())
      self.assertEqual(hashlib.sha256(json.dumps(rig,sort_keys=True,separators=(',',':')).encode()).hexdigest(),review['rigDefinitionSha256'],name)

  def test_all_neutrals_match_reference_bounds_and_ground(self):
    for name in SPECIES:
      with self.subTest(species=name):
        metrics = json.loads((WORK/name/'validation.json').read_text())
        self.assertGreaterEqual(metrics['silhouetteIoU'],.99)
        self.assertEqual(metrics['neutralAlphaBounds'],metrics['referenceAlphaBounds'])
        self.assertEqual(metrics['groundErrorPx'],0)

  def test_original_reference_exports_are_unchanged(self):
    for name in SPECIES:
      before = Image.open(WORK/name/'before-fidelity/original.png').convert('RGBA')
      after = Image.open(WORK/name/'original.png').convert('RGBA')
      self.assertEqual(before.tobytes(),after.tobytes(),name)

  def test_all_anatomical_parts_and_state_variants_are_preserved(self):
    for name in SPECIES:
      before = json.loads((WORK/name/'before-fidelity/runtime/rig.json').read_text())
      after = json.loads((ROOT/f'client/public/assets/companions/rig-v2/{name}/base/rig.json').read_text())
      parts = {p['id']:p for p in after['parts']}
      for p in before['parts']:
        with self.subTest(species=name,part=p['id']):
          self.assertIn(p['id'],parts)
          self.assertEqual(p.get('parent'),parts[p['id']].get('parent'))
          self.assertEqual(p.get('motion'),parts[p['id']].get('motion'))
          self.assertEqual(p.get('stateSources'),parts[p['id']].get('stateSources'))
          self.assertTrue((WORK/name/'generated-anatomy'/f'{p["id"]}.png').exists())

  def test_generated_anatomy_has_not_been_trimmed_to_the_neutral_pose(self):
    # Before this pass, every non-Fox texture was an intact generated crop.
    # Those exact pixels remain available independently of the visible skin.
    for name in SPECIES:
      if name == 'fox': continue # Earlier Fox already combined source surfaces.
      before = WORK/name/'before-fidelity/runtime'
      for source in before.glob('*.png'):
        with self.subTest(species=name,part=source.stem):
          current = Image.open(WORK/name/'generated-anatomy'/source.name).convert('RGBA')
          previous = Image.open(source).convert('RGBA')
          self.assertEqual(previous.size,current.size)
          self.assertEqual(previous.tobytes(),current.tobytes())

  def test_no_runtime_layer_is_a_flattened_character(self):
    for name in SPECIES:
      reference = Image.open(WORK/name/'original.png').getchannel('A')
      reference_area = sum(a>32 for a in reference.tobytes())
      rig = json.loads((ROOT/f'client/public/assets/companions/rig-v2/{name}/base/rig.json').read_text())
      for p in rig['parts']:
        alpha = Image.open(ROOT/('client/public'+p['source'])).getchannel('A')
        area = sum(a>32 for a in alpha.tobytes())
        self.assertLess(area/reference_area,.9,f'{name}/{p["id"]}: whole-character cover')

if __name__ == '__main__': unittest.main()
