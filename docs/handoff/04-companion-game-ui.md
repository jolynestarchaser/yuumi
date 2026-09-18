# D — An animated companion game with real visual evolution

Status: planned. Depends on B's roster, care, stage and form contracts; coordinate
gesture enums with C. Read `19-shared-companion.md` and current companion components.

## Product flows

1. Dock opens a nursery with each companion's name, current form, stage, progress,
   and one small needs cue. Select one without changing the other user's selection.
2. Add companion opens the existing wide creator: name, race/custom description,
   shape, face, identity, palette, starting temperament, voice, soft/pixel choice.
   Show what the built-in preview can express; no promise of generated custom art.
3. Review -> hatch -> successful saved egg opens -> new pet appears in the nursery.
   Failure keeps the setup draft and does not imply adoption succeeded. Cancellation
   before submission creates nothing; after server commit, the pet remains even
   if the animation is skipped or the tab closes.
4. Selected pet lives in a small habitat with a food spot, toy, rest spot, care
   buttons, speech bubble, and optional chat/memory panel. Needs cue links directly
   to an action. User sees state changes after acknowledged care.
5. Level up celebrates progress; stage evolution presents the old creature,
   transformation, then the **new form**, and adds a dated entry to its growth album.
6. Go out brings the selected pet onto the desktop; choose up to two roamers.
   Roaming is local preference, bound to companion IDs. Return home doesn't archive.
7. Archive/restore is available in nursery management with confirmation and
   preserved memories. No delete-all/reset button in this release.

## Evolution is a transformation, not decoration

This is an explicit owner requirement. Pokemon, Digimon, and Persona are references
for the appeal of meaningful transformations, not assets/designs to copy.

For every supported species (spirit, bunny, cat, fox, dragon, robot, child, custom),
deliver a hatchling form and care-influenced child/juvenile/grown branches. Use a
shared procedural form grammar to manage scope, but each evolved branch needs a
distinct silhouette and at least two changed anatomical features. Document all
supported transitions in a versioned form manifest. No unavailable form ID may
be returned by the backend.

Examples of original directions:

| Race | Playful line | Curious line | Affectionate line |
| --- | --- | --- | --- |
| Dragon | Squat biped -> spring-legged horned dragon | Long glider -> broad-winged sky dragon | Round sturdy quadruped -> broad protective dragon |
| Spirit | Floating seedling -> branching sprout creature | Wispy stalk form -> trailing leaf-wing spirit | Bud body -> broad soft flower-bodied spirit |
| Fox | Short bounce body -> long nimble body with expressive tail | Taller ears/muzzle -> long-legged exploring fox | Fluffy compact body -> rounded multi-layer ruff form |
| Robot | Rolling pod -> articulated spring-limbed body | Hover scout -> taller sensor-wing form | Rounded crawler -> broad gentle helper body |

These are art-direction proposals, not fixed form names. Bunny/cat get distinct
ear/leg/head/tail progressions. Storybook child stays a clothed fictional character
with age-appropriate body/face/proportions; no sexualized stages. Custom race uses
an explicit editable base template + body/ear/limb/wing/tail choices and a matching
growth grammar. A free-text description informs persona but cannot produce
arbitrary exact anatomy without generation; make that limitation clear in the UI.

Store immutable `fromFormId`/`toFormId` and form version from B. Preserve race,
name, chosen palette anchors, and recognizable motifs while anatomy changes.
Personality/care determine the branch. No automatic full rainbow recoloring, no
badge-only evolution, and no reset to a generic starter on the next refresh.

The growth album can show silhouettes, dates, and a friendly treatment summary
("All those games helped these springy legs grow"). A before/after screenshot
without badges must make the transformation obvious. This is a release gate.

## Rendering and animation architecture

Refactor `CompanionAvatar`, `PixelCompanion`, `CompanionRoamer`, `CompanionEgg`,
`CompanionWidget`, and `companion.css` into an avatar renderer, habitat scene,
animation state controller, growth scene, roster, and individual care/chat panels.
Both soft and pixel renderers consume the same resolved form/pose descriptor.
Pixel mode draws crisp shapes on a 256 x 256 logical canvas; soft uses SVG/CSS parts.
Do not stretch an old static portrait to represent a new evolved body.

Required states: idle breathe/blink, turn, walk/run/hop, hungry/requesting-food,
curious look/sniff, play/toy reaction, accept hug, eating, yawn, sleeping, waking,
speaking, happy response, hatching, level-up, and stage transformation.

Use a deterministic state priority: transformation/hatch > acknowledged care
reaction > sleeping/waking > short speech gesture > walking > idle. Each has
entry/exit/interrupt rules; transient states time out and fall back to the correct
needs state. Stable server event IDs prevent duplicate celebrations from polling.
Subsequent same-kind actions can animate again because IDs differ. Store local
seen-event acknowledgments per companion/profile; skip stale historical events
after a migration and allow replay from the growth album.

Movement has facing direction, stride/body-part motion, short pauses, and obstacle
bounds around dock/modal controls. Move with transforms; separate the locomotion
wrapper from avatar pose transforms. Up to two roamers must not overlap all controls
or block note typing. Bubbles attach to a pet, stay in the viewport, and may be
dismissed. No surprise fullscreen interruption while the user types a letter.

One scheduler manages active pets. Stop animation loops/polling when hidden; detach
timers/listeners on switch/unmount. No per-frame network requests or React global
state writes. Keep shared simulation on the server and visual movement local.
Need state comes from snapshots, not browser-only divergent hunger timers.

Respect animation-off and reduced-motion in every renderer/scene. Use static
before/after frames and status text for evolution when movement is disabled.
Audio remains opt-in and only one voice plays at a time. Existing fantasy speech
presets are device pitch/rate effects; do not advertise generated character voices.

## Remove new image generation safely

- Remove Generate portrait/regenerate controls, usage allowance text, loading
  branches, and image-generation-specific instructions from creator/personality.
- Keep `capabilities.portraits = false` during old-client compatibility; reject
  `portrait` actions explicitly before reserving quota or contacting Gemini.
  Remove the active generation implementation once compatibility is tested.
- Keep Gemini **chat** and Cloudinary for existing uploads/letters/media. Do not
  delete the Cloudinary package or account because portrait generation is removed.
- Preserve legacy portrait URL/public ID metadata and assets; show optional legacy
  artwork in a gallery rather than as the active evolving game body. No background
  cleanup/destructive migration. Existing art is not silently replaced in storage.
- Retire `GEMINI_IMAGE_MODEL` from active instructions and remove new portrait
  budgets/actions from v2 contracts. Update preview fixtures and EN/TH catalogs.
- Test no portrait request/provider call can be triggered via current or stale UI.

## Libraries and UI constraints

Reuse installed `motion`, React, CSS/SVG, Zustand, existing dialog primitives and
Lucide. Use an explicit TypeScript animation reducer first. No canvas/game engine
or state-machine package is necessary for the proposed two-pet scope. If profiling
proves a need for another library, document its license, maintained API/version,
bundle cost, and concrete benefit before introducing it; verify official docs then.

Creator stays wide and panel-based. At 1440x900 and 1920x1080, keep preview,
essential form controls, and footer visible together; lower heights/large text
may use bounded scrolling. At 360x800 use compact steps, reachable primary action,
and no horizontal overflow. Never enforce no-scroll by hiding required fields.
Keep global EN/TH setting, Joe neon green, Focus royal blue, and per-pet chat color.

## Acceptance evidence

- Record a hatch -> care request -> successful care -> level-up -> full evolution
  journey in both art modes with forced test clocks/XP in local fixtures only.
- Before/after images for each race/major stage; at least two divergent care
  branches visibly differ with the same base race and palette.
- Multiple pets retain distinct forms, voice/preferences, chat, and needs after
  refresh; switching while a request is pending shows no wrong-pet reaction.
- Test keyboard-only care, 360px layout, reduced motion, animation-off, muted
  voice, failed care, offline state, and CPU behavior with two active roamers.
- Inspect accessibility labels/status announcements for needs and growth; never
  announce per-frame movement or flood the screen reader with repeated bubbles.
