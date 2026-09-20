# Shared companion and release announcements

## Product

One custom virtual creature belongs to Joe and Focus together. Character creation
has three steps: imagine its name/form/appearance, choose a starting temperament,
then review and hatch. Nothing is generated or billed during creation.

The dock opens a game-like companion home with an animated starter illustration,
needs, care actions, imagined thoughts, daily wishes, shared chat, a memory journal,
and personality/inspiration controls. Both people can care for the same character.

- Feed, play, cuddle, rest, explore, and cleaning shape growth; medicine is available only while ill.
- Schema v3 simulates at most 24 hours after a qualifying visit, then pauses until the habitat is opened again. Returning grants a bounded 24-hour health protection window.
- Companions grow through hatchling, child, juvenile, grown, and elder stages. Elders may retire; natural or illness death creates a memorial record without deleting history. There are no relationship penalties, guilt, or streak mechanics.
- Dialogue uses Gemini. The model chooses text, mood, and an imagined thought,
  never arbitrary state changes, tools, or unsourced factual memories.
- The most recent 80 care/chat memories and 60 conversation turns persist in MongoDB.
  Caregiver identity comes from the authenticated session, never the request body.
- Each caregiver can add their own inspiration. Both are included in dialogue and portraits.
- Forgetting a memory removes it and clears recent chat/thought context that may repeat it.
  Existing images and numerical growth are not reversed. Provider retention is separate.
- New portrait generation is retired. Existing portrait metadata remains readable for
  compatibility, while authored soft and pixel forms cover every lifecycle stage.

## Switchable appearance

- During creation and in the companion home, choose Soft or Pixel art and toggle animation.
- Save `appearance: { visualStyle, animated, usePortrait }` with adoption or the authenticated
  `appearance` action. Both profiles see the setting through the existing snapshot polling.
- Existing companions without this field keep their previous look: pixel if they have a
  portrait, soft otherwise. Switching does not delete or regenerate their saved portrait.
- Soft uses the original rounded character; pixel uses a crisp 32-cell starter on a
  256 × 256 canvas. Both starters blink, rest with closed eyes, and move with their mood.
- Legacy saved portraits remain readable, but current pixel mode uses the authored sprite
  for new forms. Broken legacy images fall back to the pixel sprite. Neither switching nor
  animation makes paid AI calls.
- The animation toggle and the browser's reduced-motion preference stop all avatar motion.

Manual checks: switch styles during creation; hatch and refresh; switch back with a saved
portrait; pause motion; test reduced motion, mobile layout, and both profile snapshots.

## Desktop roaming, design, voice, and growth

- App UI defaults to Thai with a device-local EN/TH choice in Settings. Both
  languages live in `client/src/locales/en.json` and `th.json`; changing the
  language updates the whole app without replacing user-written content.
  Chat, thoughts, and memory text can be explicitly translated through the existing
  server translation endpoint. Translation changes display only, never saved memories.
- Creation and the Personality editor offer spirit, bunny, cat, fox, dragon, robot,
  storybook child, and custom species plus body/accent/eye colors. Custom species use
  a starter until a portrait is generated from the description. Saved design edits
  are revision-checked and preserve XP, memory, and existing portraits.
- Optional device speech supports Thai/English voices, rate 0.5–1.5 and pitch 0.5–2.
  Voice lists vary by browser/OS. Speech is initiated by a preview/listen click and
  canceled when the voice component unmounts; no Gemini speech calls are made.
- Custom race reveals a required 1–500 character description, passed to chat and
  prioritized in portrait prompts. Face, silhouette, gender identity, and six
  coordinated palettes persist alongside the design. Selecting a palette changes
  body, accent, and eye colors together; manual colors mark it as custom.
- Five fantasy-style voice presets tune device speech pitch/rate. They are not
  character voice clones; audible results depend on installed voices. Gender does
  not force a voice or color palette.
- The creator is a wide two-column workbench with a live preview and Look/Colors/Voice
  panels. Small viewports retain scrolling. Language selection is in Settings,
  never a separate companion preference.
- Go out opens a bounded walking pet above the desktop dock. Speech bubbles use
  needs and dominant traits, with no background generation or XP rewards. Pause,
  chat, and return-home controls remain available. Hidden tabs skip wandering updates;
  reduced motion and the avatar animation setting stop walking. Roaming is session-local.
- Meaningful care earns 8 XP, first completion of an active request adds 4, and a saved
  chat reply earns 4. Valid XP rewards have no daily cap. XP level and lifecycle stage
  are independent: child requires two simulated days plus six meaningful care actions,
  juvenile seven days plus eighteen since child, and grown fourteen days plus thirty-six
  since juvenile. Elder begins at day 60 and natural death at day 90 regardless of care gates.
- Gemini supplies a validated one-trait growth signal per successful chat; the server
  caps the increment at one. Gemini never sets XP, levels, or evolution outcomes.
  Dialogue receives the latest evolution and can suggest preferences or activities.
- Evolution adds a visual emblem and informs the next generated portrait. Existing
  custom artwork remains until the user explicitly generates a replacement.
- Hatching shows a colored egg wobbling and cracking before saving the character.
  Leaving before the animation completes cancels the pending creation; failed saves
  return to the review step with the draft intact. No paid call or extra XP is triggered.
- Successful care triggers snack, hop, cuddle, sleep, or explore reactions. Failed
  actions do not celebrate. Both styles support reactions; reduced motion and the
  animation switch disable movement. Generated portraits move as a single image.

## Provider configuration

Set only on the backend (Railway service variables or an uncommitted `server/.env`):

```text
GEMINI_API_KEY=<your server-side key>
GEMINI_CHAT_MODEL=gemini-2.5-flash-lite
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

Model names are configurable; select models available to your Gemini project.
The image override and Cloudinary credentials remain only for legacy portrait records.
Never use a `VITE_` variable for the Gemini key. No keys are collected in the browser.
Care and creation work without Gemini; chat reports unavailable configuration.
Model access, quota and billing must be configured in the Google project.

Uses the official [GenerateContent REST API](https://ai.google.dev/api/generate-content)
and [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation).
Only companion settings, memories, and conversations are sent to Gemini; existing
letters, calendars, files, and credentials are not part of the prompt.

## API and concurrency

- `GET /api/companions`: protected shared snapshot and configuration capabilities.
- `POST /api/companions/actions`: validated adopt/care/chat/inspiration/visit/retire/forget.
- `/api/companions/v3`, `/v3/roster`, and `/v3/actions` are explicit aliases for the same compatible handlers.
- MongoDB leases serialize writers; companion state and durable operation receipts commit in one transaction. A family lease plus unique predecessor index protects the active cap and direct-successor rule.
- Receipts bind family, companion, actor, operation ID, and canonical payload hash. A changed-payload replay is rejected even after the 60-entry compatibility buffer rotates.
- Server-side limit: 60 chat attempts shared by both people, reset at UTC midnight.
  Failed provider requests count because they may incur cost.
- Care has a 5-second per-person cooldown and chat has a 5-second shared cooldown.
- Gemini text requests time out after 45 seconds.
- Client polls every 12 seconds while the widget is visible. Polling is read-only; an
  explicit visit is sent only when the habitat opens or the visible tab returns.

## Login update alert

`client/src/lib/releases.ts` defines the current release ID and user-facing highlights.
Change the ID and feature entries when shipping a new update. The alert appears after
profile login until dismissed, independently for Joe/Focus in each browser. “What's new”
in the top bar reopens it. Acknowledgments use local storage; if storage is blocked,
dismissal still works for the current session. New-message popups wait while the update
or companion dialog is open.

## Verification

Before release, Node's built-in test runner must cover simulation boundaries, migration,
transactions, generations, prompt validation, authenticated routes, and retry deduplication.
Provider tests must remain mocked; paid live evaluation needs separate authorization.

```text
npm test --prefix server
npm test --prefix client
npm run build --prefix client
```

Manual production checks still require configured MongoDB, Gemini, and Cloudinary:
create a character, care as each profile, chat in Thai and English, refresh both
profiles, exercise illness/recovery and retirement on fixtures, create a successor, forget
a memory, and log in again after bumping the release.
