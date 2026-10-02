# Endless, species-preserving companion evolution

Date: 2026-10-02 (Asia/Bangkok)
Status: proposed design for user review; not an implemented feature.

## Intent and confirmed decision

The user wants companions to keep evolving beyond Lv10, transform into visibly
different forms, and have evolution image sets with seeded variation. The user
confirmed that companions retain their original species rather than changing
into another species. Existing walking animation and the independent age system
must remain. Pixel art is not part of this direction.

The following pacing, catalog size, and technical rules are proposed defaults,
not decisions already approved by the user.

## Approach and alternatives

Recommended: authored, species-specific form kits selected by server-seeded RNG.
This supports consistent images, animated rigs, reliable previews, and safe saves.
Finite reusable artwork supports endless progression; it does not promise a
never-repeated drawing for every level.

Alternatives considered:

- Generate an entirely new image at every evolution: potentially broader variety,
  but introduces provider cost, latency, inconsistent identity, and animation work
  on every outcome. Do not make paid runtime generation a requirement.
- Only change colors and accessory size: inexpensive, but does not meet the request
  for another form. Do not use this as the primary transformation mechanism.

## Progression and pacing

- Preserve existing committed Lv1–10 growth and early milestones at Lv3/6/10.
- After Lv10, run repeating ten-level chapters: Lv11–20, Lv21–30, and onward.
- Major body-form transformations occur at Lv20/30/40/etc. Minor levels add
  authored details and progress toward the next transformation.
- No configured final level or final chapter. Compute chapters from level rather
  than a finite segment array. Use a direct/inverse threshold calculation instead
  of iterating from Lv1 on every snapshot.
- Retain the existing XP curve and daily reward rules initially. Removing the
  level ceiling does not remove reward caps or add new grinding incentives.
- Age never grants XP or gates a form transformation. An elder can evolve.
- Use safe integer checks for stored XP and levels. Numeric overflow is an explicit
  integrity error, never an invisible wraparound or a fake gameplay level cap.

## Form catalog and visual identity

Each species gets nature, celestial, and adventurer styles. Robots use botanical
engineering, orbital engineering, and expedition engineering equivalents.
The initial catalog has two evolved body silhouettes per style per species:
66 evolved forms across the existing 11 species, plus the existing base art.
The silhouettes differ in body/head contour and species-native feature placement,
not only clothing, color, scale, or an added symbol.
Within each table direction, one body is compact/rooted and the other is
elongated/agile. Both require separately authored contours and socket layouts;
scaling the same body twice does not qualify as two forms.

| Species | Nature direction | Celestial direction | Adventurer direction |
| --- | --- | --- | --- |
| Cat | Rounded woodland feline, leaf-like cheek tufts | Sleek moon feline, crescent tail | Sturdy scout feline, broad paws |
| Dog | Fluffy meadow hound, curled coat tufts | Long-eared star hound, flowing tail | Stocky trail hound, strong muzzle |
| Frog | Broad pond frog, lily-shaped frills | Smooth moon frog, luminous eye crest | Compact stream frog, pronounced webbing |
| Dragon | Leaf-backed forest dragon | Swept-horn sky dragon | Plated trail dragon with a heavier stance |
| Duck | Round marsh duck with layered feathers | Sleek moon duck with long flight feathers | Broad-chested explorer duck with sturdy feet |
| Forest spirit | Sprout-bodied grove spirit | Wispy lantern spirit | Root-footed wandering spirit |
| Bunny | Fluffy garden rabbit, petal ear edges | Slender moon rabbit, long swept ears | Sturdy burrow rabbit, prominent hind paws |
| Fox | Brush-tailed woodland fox | Narrow-faced comet fox | Broad-cheeked scout fox with strong limbs |
| Robot | Rounded greenhouse chassis, leaf-shaped panels | Tall orbital chassis, thruster fins | Boxy expedition chassis, articulated arms |
| Storybook child | Rounded garden friend, leaf-inspired hair | Slender stargazer friend, swept hair | Sturdy story explorer, expressive hands |
| Custom cloud base | Rounded rain-cloud creature | Wispy comet-cloud creature | Compact storm-cloud creature |

Custom descriptions remain saved, but the authored cloud base does not claim to
generate arbitrary custom anatomy. A form never changes the original species ID.
For companions enrolled in this system, the original species is read-only in
the appearance editor; species selection stays available when adopting a new pet.
Colors, wardrobe, face, and voice remain editable. Unmigrated legacy companions
retain their existing editor behavior until enrollment. Enrollment binds species
to the canonical saved render, never silently replaces it with a different
appearance-editor species, and reports an existing mismatch for repair.

## Image sets and animation assets

- Generate concept sheets for the evolved bodies using the built-in image tool,
  in the established cozy outlined, non-pixel style. Sheets show base, precursor,
  and final form with stable identity, palette, scale, and viewing angle.
- Keep concept/reference images separate from production assets. A concept image
  is not a ready-to-animate rig and is never substituted for missing game content.
- Build production forms as named, layered SVG rigs with compatible foot baselines,
  limb pivots, face layers, and attachment sockets. Export actual rig portraits for
  the evolution gallery so cards match the in-game companion.
- Produce transparent portraits, full-body previews, and walking/idle/reveal views.
  Save project-bound generated artwork, prompts, and asset manifests in the repo.
- Catalog entries identify form ID, species, style, body recipe, compatible parts,
  image references, animation profile, and renderer version. Validate assets before
  making an entry eligible for selection.

## Seeded selection and permanent outcomes

Extend the existing private HMAC RNG, rather than adding client-side Math.random
to anatomy. Use the saved pet seed with independently labelled chapter, style,
body, and detail draws. Persist candidate weights, care snapshot, catalog version,
selected recipe, and before/after renders inside the existing atomic writer flow.

Care history influences style weights; seed provides variation within compatible
choices. The gentle/adventurous preference affects transformation intensity, not
rarity purchases or XP. Exclude the current body form when another eligible form
exists, and reduce the weight of the two most recent forms. Do not guarantee that
forms can never repeat across an endless lifetime.

Once committed, retries, reloads, reveal acknowledgments, time passing, or catalog
updates cannot reroll an outcome. A chapter starts with a saved precursor plan;
minor levels follow its compatible detail steps. The major result uses the saved
decision context, while later care only affects future eligible decisions.

## Age, anatomy, and cosmetics

Three independent layers remain:

1. Server age stage controls proportions, cadence, and elder signatures.
2. Saved evolution controls the current body form and committed anatomy.
3. Appearance settings control optional clothes, headwear, hair, and colors.

Keep earned capabilities across body transformations. Never turn a robot into
an animal, replace its sensors with biological horns, or silently erase a wing
capability when changing silhouette. New forms map existing anatomy families to
species-native sockets. Cosmetic selections do not grant capabilities or reset age.
Fallback retains the last valid render if a compatible form is unavailable.

## Data, history, and compatibility

Extend render snapshots with versioned body form/style/chapter IDs and selected
detail IDs. Historical snapshots remain self-contained and readable using their
original catalog version. Do not silently update old events to the newest artwork.
Represent the absence of a gameplay level ceiling as a nullable level-cap field,
and always return the next XP threshold for a valid active level.

Do not keep an unlimited lifetime of full render events inside one MongoDB pet
document. Store append-only form events in an indexed collection with unique
pet/event and pet/presentation-sequence keys. Keep the current render, active plan,
and a bounded recent-event window in the companion document. Expose paginated
history and acknowledgment commands that validate event ownership against storage.
Keep the 100 most recent events in the public snapshot; lifetime history lives in
the event collection. History and pending reveals use cursor pages of 25 events,
with a maximum requested page size of 100. No TTL or deletion of unacknowledged
outcomes. Pending reveals are ordered by presentation sequence, so a large backlog
does not create an unbounded API response. Current appearance remains the newest
committed form even while older reveals are waiting for acknowledgment.

Introduce an explicit versioned compatibility path for existing progression:
preserve the seed, XP, old render, capabilities, outcomes, memories, and age.
Never reconstruct fictional historical evolutions for a legacy high-level pet.
Future chapters begin after its preserved baseline and award only new outcomes.
Version mismatches require a documented migration, not changing version strings
until old blocked saves happen to pass a check.

## UI and game feel

- Growth view separates Level, Age, Current Form, and Next Transformation.
- Show a species-specific form gallery with discovered portraits and concealed
  future possibilities. Explain that possible styles are not guaranteed rewards.
- Show chapter progress without a final-level label or an Lv10-only slider.
  The development review accepts any valid positive level and a preview seed;
  preview controls never change live saved RNG or anatomy.
- Use a short anticipation, silhouette transition, settling motion, and optional
  chirp for major reveals. Do not shake the screen or block care/chat input.
- Reduced-motion and animation-off use a static before/after presentation.
  A reveal acknowledges an existing server result; it does not roll the result.
- Both caregivers see the same committed form. Keyboard focus, mobile scrolling,
  touch targets, and English/Thai text remain supported.

## Failures, rollout, and evidence

Missing content retains XP and the last valid image, records the blocked context,
and permits a deterministic repair retry without a new draw. Provider failure
during concept-art production cannot affect live progression. Do not enable the
existing gameplay feature flag or deploy a database migration automatically.

Implementation acceptance requires evidence for levels above 10 and above 1000,
stable outcomes on retry/reload, both-caregiver concurrency, repeated catalog
chapters, preserved old snapshots, independent age, retained capabilities, and
bounded/paginated history. Review all 11 species at small and full sizes with
walking and reduced motion. The user's earlier no-automated-tests preference is
retained unless changed: report type/build/manual checks and state any automated
coverage that was skipped rather than claiming tests passed.

## Scope boundaries

No cross-species transformations, runtime paid image generation, equipment shop,
new currencies, trade, breeding, new species, or age-rule redesign. Unlimited
progression means continuing chapters with authored combinations, not infinitely
many unique images. This design supersedes the finite-level proposal only after
review and implementation; the currently shipped engine still has its Lv10 ceiling.
