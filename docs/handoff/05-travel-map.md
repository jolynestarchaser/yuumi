# E — Travel map improvements

Status: planned. Depends on A's atomic content-save service for persistence.
Read `22-travel-map.md` and the root [Plan](../../Plan.md).

## Keep the working foundation; finish the trip workflow

Current code: `client/src/components/TravelMap.tsx`, `lib/travelMap.ts`,
`lib/travelMap.test.ts`, `store/desktopStore.ts`, `components/WindowManager.tsx`,
`App.tsx`, `styles.css`, `server/src/models/Item.ts`, and `routes/items.ts`.

Installed packages are `d3-geo`, `topojson-client`, and `world-atlas`. They already
project bundled land onto a globe with pins. Keep that offline-capable renderer.
No GPS, tracking, map key, runtime tile CDN, or paid provider is needed for this
phase. This is approximate world-scale geography, not street-level navigation.

## Remaining defects to fix first

| Evidence at `924afcc` | Required fix |
| --- | --- |
| `addPin` clears fields before the async save result | Clear only after acknowledgment of that exact draft |
| `save` catches errors but leaves optimistic map on screen | Explicit error/pending state and Retry; no false Saved state |
| Consecutive changes can capture the same revision | Serialize mutations and preserve intent against the actual base revision |
| Store uses server read/check/save revision path | Use A's atomic service, not just client checks |
| `Item.content` has 10,000-char cap for every type | Type-specific map schema/cap large enough for 100 max-size pins |
| Shared rotation saves the entire map | Separate local viewing from shared trip-data mutations |
| Fixed `ocean`/`globe-clip` SVG IDs | Unique IDs per mounted map using React `useId` |
| Pin groups are aria-hidden and lack selection | Equivalent selectable list and accessible controls |
| Broad `declare module`/`as never` casts | Add correct library type packages or narrow explicit adapter types |
| Viewport-only media breakpoint | Responsive layout based on actual map-window width |

Do not cite passing pure geometry tests as proof that persistence, conflicts, or
pointer/touch behavior work. Add tests at those boundaries.

## Data and write contract

Keep maps in the existing `items` collection. A canonical versioned JSON content:

```ts
type TravelMapV2 = {
  version: 2;
  pins: Array<{
    id: string;
    name: string;       // 1..80 trimmed characters
    note: string;       // 0..240 characters
    emoji: string;      // bounded approved sticker/emoji
    status: 'planned' | 'visited';
    lat: number;       // finite, -90..90
    lon: number;       // finite, -180..180
    plannedDate?: string; // valid calendar date YYYY-MM-DD
    visitedDate?: string; // valid calendar date YYYY-MM-DD
  }>;
};
```

Maximum 100 pins with unique bounded IDs. Validate actual date validity (not only
regex), primitive types, coordinates, string lengths, allowed statuses, and serialized
payload size on the server. Proposed cap: 256 KiB UTF-8 for map JSON with bounded
fields, distinct from notes' 10,000-character limit. Prove 100 maximum-length Thai,
emoji, escaped-character pins fit the cap; reject excessive payloads explicitly.
Strip/reject unknown fields consistently; do not trust a browser's pin count.

Read legacy `{ rotation, pins }` without data loss. Normalize IDs safely and preserve
all valid pins; warn on malformed/over-limit legacy content rather than silently
persisting a truncated map over the original. Missing version must not become an
empty-map save. A recovery view should let the user export/copy the original if
parsing cannot safely preserve it. No bulk rewrite on render/open.

Keep camera rotation/zoom/filter/selection local per item/browser. Initialize
camera from saved legacy rotation, then navigation makes no content mutation.
New v2 saves omit camera data. This supersedes older shared-rotation behavior and
prevents looking around from overwriting someone else's trip. Camera state does
not affect the existing shared desktop-window position behavior.

Mutations are add/update/remove intents keyed by stable pin ID with operation ID
and expected content revision. Reuse A's persistence service and recovery model.
Two edits to different pin IDs may rebase after fetching authoritative state;
two edits/removals of the same changed pin must show a conflict. Never blindly
retry a full old map document on a newer revision. Lost acknowledgment retries
must not create duplicate pins. Keep draft name/note/sticker until its save succeeds.

## Usable map interactions

1. Add: globe click selects coordinates and shows a draft marker; fill place,
   sticker, note, planned/visited, optional date. Add by typed coordinates or
   keyboard-accessible city shortcut without precise clicking.
2. Select: click a pin or list item to open details and rotate the camera toward
   it. Highlight the matching marker/list row. Hidden-side pins remain in the
   accessible list and fly into view when selected.
3. Edit: change name, sticker, note, coordinates, date, and status. Planned can
   become Visited without deleting/recreating the pin. Confirm before removing;
   preserve recovery through item history or an undo mutation with its own revision.
4. Find: search saved places and a small bundled city catalog; localize display
   names/shortcut labels. Never rewrite owner-entered place names when language
   changes. No online geocoder in this phase; enter any place by coordinates/name.
5. Filter: All / Planned / Visited and search; show counts, empty state, and clear
   filters. Sort by name or date without changing pin identity or persisted ordering
   unless a deliberate ordering feature is added later.
6. Navigate: reset view, rotate buttons, bounded zoom in/out; keyboard equivalent
   to pointer input. Zoom keeps the same projection/inverse used for click picking.
   Touch rotation does not drag the desktop window. Correctly handle pointer
   capture, cancel, second finger, and tap-after-drag so dragging cannot add a pin.
7. Show pending/saved/error/conflict state next to the editing control. Disable
   double-submit, not the whole app. A failed save cannot appear as a persisted trip.

Trip photos, linked itineraries/calendar events, route optimization, geographic
search APIs, street maps, and satellite/WebGL terrain are deferred. Do not add a
provider subscription as an implicit dependency of basic pinning.

## Rendering and layout

Extract `TravelGlobe`, `TravelPinEditor`, `TravelPinList`, and a mutation hook so
projection math, interaction state, and persistence are testable separately.
Use one projection configuration for coastlines, markers, and inverse pointer
picking. Test padded/letterboxed SVGs, dateline wrap, poles, non-square bounds,
zoom and back-face visibility. Remove unused imports and broad module declarations.

Prefer a wide globe/details layout in a large map window and stacked/tabbed panels
in narrow windows. Use container queries or ResizeObserver because a 640px desktop
window can be narrow even on a 1920px monitor. Size the new map window reasonably
through existing window defaults; never mutate all saved windows during resize.
Limit height with independent list/editor scroll, 44px touch actions, wrapping long
place names, visible focus and contrast. Reduced motion disables fly-to tweening.

Lazy-load the map feature/geometry so logging in or reading notes does not load
all geography. Keep Natural Earth/world-atlas and D3/TopoJSON license/attribution
information with the project. Bundle data locally; no map-data network requirement
after the application assets load.

## Acceptance

- Test 100 pins, including long Thai notes; save succeeds, reload preserves all,
  101st add is blocked with a localized explanation on both client and API.
- Both profiles edit different pins concurrently without loss; same-pin conflicts
  are visible with both versions recoverable. Failed saves preserve form values.
- Rotate while the partner adds a pin: no write generated by rotation and no loss.
- Test multiple map windows for SVG ID conflicts; zoom/click location round-trip;
  pointer cancel; keyboard-only create/edit/status-change; 360px and narrow-window
  layout; date behavior near UTC midnight; full EN/TH labels.
- Whole-map Trash/restore still works. Legacy content upgrades only on successful
  deliberate save. Tests use an isolated fixture or disposable integration DB.
