# Endless evolution: system implementation handoff

System tasks 1, 2, 5, and 6 implemented on 2026-10-02. This does not mean the complete
endless-form feature is released. Production rigs and client gallery/reveal work
belong to the art/UI teams. Gameplay rollout remains off. No live migration ran.

## Contracts and art dependency

See [system/art contract](art-direction/evolution-forms/system-contract.md) for
exact saved fields, socket names, coordinate convention, and export manifest.
The server reads the explicitly configured `PET_FORM_ASSET_ROOT` bundle.
No concept image, unvalidated entry, missing SVG, or out-of-bundle path qualifies.
Catalog versions in old render snapshots remain unchanged. Body forms carry
their own versioned IDs; decision audits carry their form catalog version.
Restore the original version of a missing active-plan bundle to resume its saved
decision. Do not relabel a blocked plan to the current bundle.

## Engine behavior

- Level cap is `null`. The existing XP curve is inverted with bounded boundary
  correction. Invalid/overflowing safe integers raise integrity errors.
- Lv1–10 retains its finite anatomy path. Later ten-level chapters use separate
  form plans; each command advances at most 25 levels and persists catch-up state.
  A fresh `visit` command can continue catch-up; a receipt replay never advances it.
- Labelled HMAC style/body/detail draws freeze care, preference, candidate weights,
  selected form, and detail order at planning time. The current form is excluded
  when alternatives exist; the last two forms have reduced repeat weights.
- Late transformations preserve all existing parts/capabilities. Age and reward
  rules are independent. Missing content preserves XP/current image and records
  frozen repair context. No client RNG is involved in live body selection.
- Explicit `formEngineVersion: 1` enrollment runs within authorized commands,
  preserving seed, XP, age, anatomy, outcomes and memories. Previously earned
  high levels become a preserved baseline rather than fabricated history.
  Original config/catalog/RNG versions must match their supported compatibility
  path. Species conflicts and unsupported versions block progression for repair.

## History API and persistence

Authenticated family-scoped routes:

- `GET /api/companions/history?id=<pet>&limit=25&cursor=<opaque>`
- `GET /api/companions/pending?id=<pet>&limit=25&cursor=<opaque>`
- Matching `/api/companions/v3/history` and `/v3/pending` aliases.

Responses use `{ success: true, data: { events, nextCursor } }`. History is newest
first; pending reveals are oldest first. Limits are 1–100, default 25. Cursors are
bound to pet and page kind. A legacy embedded-only response explicitly reports
`migrationPending: true`; its next command migrates records transactionally.
Reads never enroll or move records. The public snapshot contains 100 recent events,
25 oldest pending IDs, and separate history/pending continuation cursors. The UI
must fetch pending pages when pending IDs fall outside recent snapshot history.

`growthAck` keeps its existing eventIds payload (maximum 40), queries stored
ownership, and updates acknowledgments in the pet/receipt transaction. Archiving
or retiring does not delete events or prevent acknowledgment. Replays retain the
original decision. Immutable event hashes and unique pet/event plus pet/sequence
keys reject conflicting duplicate snapshots. Audit context is stored with records
before it is removed from the bounded companion cache. No outcome record has TTL.

The `PetGrowthRecord` indexes must be present before rollout. Provisioning indexes
on production is a separate operational step; no production index job ran here.

## Verification and remaining gates

- Root typecheck and production build passed; Vite retains its large-bundle warning.
- `node server/scripts/inspectPetForms.mjs` is a manual inspection fixture using
  synthetic catalog metadata, not production art or a test runner. It prints
  Lv10/11/20/30/1000/1001 exact/below boundaries, stable planning, frozen Lv20 choice,
  repeat avoidance, preserved age/parts/capabilities, migration preservation,
  mismatch blocking, and missing-content fallback. Reviewed outputs matched those
  expectations. Synthetic form selection does not validate art exports.
- Automated suites were not run and no automated tests were added, following the
  plan's constraint. Existing tests that expect the former Lv10 ceiling need review.
- Disposable-database rollback, receipt concurrency, pagination, index behavior,
  two-caregiver integration and forbidden-ID behavior remain unverified at runtime.
- All 66 production rigs, portraits, manifest availability, walking/elder appearance,
  gallery pages and accessible reveals remain art/UI integration gates. Do not
  enable `PET_GAMEPLAY_ENABLED` until that integration and database review complete.
