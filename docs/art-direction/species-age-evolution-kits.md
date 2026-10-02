# Companion species, age, and evolution kits

Implemented scope: all 11 outlined SVG companions, locomotion rigs, species-native
growth contours, optional saved outfit/headwear/hair, and age presentation.
No raster replacement, shop, new XP rules, or database migration.

## Three separate layers

1. **Age:** read the server lifecycle stage. It controls body size, gait cadence,
   and elder details. Never infer age from XP. An elder can still be low level.
2. **Evolution:** consume `growth.render.parts` and its appearance level. Retain
   previous mature parts. A preview is not an awarded unlock. Lv11–30 is not opened.
3. **Cosmetics:** outfit, headwear, and hair are optional appearance settings.
   They do not grant XP, float/sense/grasp capabilities, or alter age/anatomy.

## Authored direction for every species

| Species | Locomotion | Lv2–3 identity | Lv4–6 hands | Lv7–10 major form | Elder signature |
| --- | --- | --- | --- | --- | --- |
| Cat | Soft alternating stroll | Curled tail | Velvet paws | Feather fans / moon horns | Silver cheek flecks |
| Dog | Bouncy trot | Upright wagging tail | Sturdy paws | Feather wings / guardian horns | Cream muzzle-side flecks |
| Frog | Two-foot hop | Pond crest | Webbed hands | Lily wings / sensing horns / water frills | Pond freckles |
| Dragon | Weighty march | Spade tail | Clawed paws | Membrane wings / horns | Ivory cheek scales |
| Duck | Side-to-side waddle | Feather crest | Feather wing tips | Flight feathers / horns / water frills | Cream feather edges |
| Forest spirit | Drifting float | Vine trail | Leaf hands | Leaf fans / horns | Golden leaf veins |
| Bunny | Light hop | Cotton-tail tufts | Soft mitts | Petal wings / bud horns | Pale cheek tufts |
| Fox | Quick trot | Brush-tail tufts | Nimble paws | Flame fans / horns | Cream cheek edging |
| Robot | Stepped mechanical march | Signal cable | Segmented grippers | Booster fins / sensor arrays | Chassis polish and service badge |
| Storybook child | Alternating walk | Scarf streamer (not an animal tail) | Dexterous mitts | Glider cape / star headband | Silver hair streak |
| Custom cloud base | Cloud drift | Curled cloud trail | Cloud mitts | Cloud sails / horns | Pearlescent cheek marks |

The server still chooses family and final variant. This table is an art vocabulary,
not a guarantee that a companion will receive every listed form. New gameplay
identities currently use cat, dog, frog, dragon, and duck; legacy species remain
supported. Custom descriptions are retained, but custom geometry is still the
authored cloud base, not an AI-generated arbitrary creature.

## Age system: preserve both existing modes

| Stage | New pet gameplay chronological boundary | Legacy boundary |
| --- | --- | --- |
| Hatchling | Birth to 24 hours | Until age/care child gate |
| Child | 24 hours | 48 hours + 6 stage care actions |
| Juvenile | 168 hours / 7 days | 168 hours + 18 stage care actions |
| Grown | 720 hours / 30 days | 336 hours + 36 stage care actions |
| Elder | 1440 hours / 60 days | 1440 hours |

These remain server rules (`petSimulation.ts`, `companionRules.ts`), not new client
timers. New gameplay keeps age separate from evolution eligibility and XP. Older
lifecycle terminal/retirement rules are not changed by this art work.

Visual proportions use 82%, 90%, 96%, 100%, 100% of the authored body, maintaining
the foot baseline. Elders retain their earned anatomy and get slower cadence plus
a species signature. Robots mature through chassis presentation, never biological
hair or fur. Cosmetic hair controls are hidden for robots.

## Animation and wardrobe

- SVG uses named leg, forelimb, tail, wing, and root layers. Travel has alternating
  feet/arms and species-specific root motion; no per-frame React updates.
- Walking only runs while travelling, not during sleep, busy actions, care
  reactions, disabled animation, or reduced motion. Facing mirrors the art only.
- T-shirt/panel cover, vest, cap, bow, natural/swept/tuft styles persist through
  the existing appearance command and server enum validation.
- Clothing does not replace earned wings or horns. More equipment and extra
  evolution segments need authored content before being advertised as unlocks.

Development review: `/companion-review.html?art=1` shows all species with independent
age, Lv1–10, locomotion, and outfit controls. It is not a production entry point.
