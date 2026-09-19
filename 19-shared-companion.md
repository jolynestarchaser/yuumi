# Shared companion and release announcements

## Product

One custom virtual creature belongs to Joe and Focus together. Character creation
has three steps: imagine its name/form/appearance, choose a starting temperament,
then review and hatch. Nothing is generated or billed during creation.

The dock opens a game-like companion home with an animated starter illustration,
needs, care actions, imagined thoughts, daily wishes, shared chat, a memory journal,
and personality/inspiration controls. Both people can care for the same character.

- Feed, play, cuddle, rest, explore, clean, and medicine shape different traits, needs, and health.
- Time away gently changes needs via piecewise stepping; after 24 hours of absence, simulation auto-pauses.
- Upon return after auto-pause, the absence gap is discarded and a 24-hour return protection window activates (health is clamped >= 1 against neglect death).
- Lifespan & aging: companions reach the elder stage at 60 days (1440 hours) and have a 90-day natural lifespan.
- Illness & healthcare: 6 continuous hours with one or more needs below 20 triggers illness, causing health to drain at 5 points/hour. Recovery requires all critical needs >= 40 plus a medicine action (6-hour wall-clock cooldown). Clean action restores hygiene. Neglect death occurs only if unprotected health reaches 0.
- Unlimited XP: daily XP caps (formerly 40 care / 12 chat) are completely removed. Meaningful care (<85 need) awards 8 XP; fulfilled care requests award a +4 XP bonus; saved chat awards 4 XP.
- Generations & lineage: retired or deceased companions are preserved in a memorial garden (with lifetime stats and cherished memories) and do not occupy active slots (up to 6 active companions). Successor generations can be hatched, inheriting generation increment (Gen N+1) and lineage tracking.
- Dialogue uses Gemini 2.5 Flash-Lite by default. The model chooses text, mood, and an imagined thought within a 16KB UTF-8 4-layered prompt, strictly validated and stripping unauthorized state mutations.
- The most recent 80 care/chat memories and 60 conversation turns persist in MongoDB.
  Caregiver identity comes from the authenticated session, never the request body.
- Each caregiver can add their own inspiration. Both are included in dialogue.
- Forgetting a memory removes it and clears recent chat/thought context that may repeat it.
  Existing visual growth is not reversed. Provider retention is separate.
- Portrait generation has been retired in favor of rich procedural built-in animated forms and pixel art across hatchling, child, juvenile, grown, and elder stages.

## Switchable appearance

- During creation and in the companion home, choose Soft or Pixel art and toggle animation.
- Save `appearance: { visualStyle, animated, usePortrait }` with adoption or the authenticated
  `appearance` action. Both profiles see the setting through the existing snapshot polling.
- Both Soft and Pixel art styles fully support all life stages including hatchling, child, juvenile, grown, and elder (adorned with wisdom crowns).
- Soft uses rounded procedural characters; pixel uses crisp retro pixel-art sprites.
  Both starters blink, rest with closed eyes, and move with their mood.
- The animation toggle and the browser's reduced-motion preference stop all avatar motion.

Manual checks: switch styles during creation; hatch and refresh; verify elder stage visuals; pause motion; test reduced motion, mobile layout, and both profile snapshots.

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
- Care earns 8 XP and successful chat earns 4. Every 80 XP adds a level; levels 3, 6,
  9, etc. roll an evolution path (explorer, guardian, trickster). Species bias and
  accumulated traits weight the random choice. The result persists under the companion
  lock and deduplicated actions cannot reroll it. The latest 40 evolutions are retained.
- Gemini supplies a validated one-trait growth signal per successful chat; the server
  caps the increment at one. Gemini never sets XP, levels, or evolution outcomes.
  Dialogue receives the latest evolution and can suggest preferences or activities.
- Evolution adds a visual emblem and informs the next generated portrait. Existing
  custom artwork remains until the user explicitly generates a replacement.
- Hatching shows a colored egg wobbling and cracking before saving the character.
  Leaving before the animation completes cancels the pending creation; failed saves
  return to the review step with the draft intact. No paid call or extra XP is triggered.
- Successful care triggers snack, hop, cuddle, sleep, explore, clean, or medicine reactions. Failed
  actions do not celebrate. Both styles support reactions; reduced motion and the
  animation switch disable movement.

## Provider configuration

Set only on the backend (Railway service variables or an uncommitted `server/.env`):

```text
GEMINI_API_KEY=<your server-side key>
GEMINI_CHAT_MODEL=gemini-2.5-flash-lite
```

Model names are configurable; `gemini-2.5-flash-lite` is the default. Portrait generation has been retired.
Never use a `VITE_` variable for the Gemini key. No keys are collected in the browser.
Care, growth, and creation work completely without Gemini; chat reports unavailable configuration when no key is set.
Model access, quota and billing must be configured in the Google project.

Uses the official [GenerateContent REST API](https://ai.google.dev/api/generate-content).
Only companion settings, memories, and conversations are sent to Gemini within a strictly validated 16KB prompt; existing
letters, calendars, files, and credentials are never part of the prompt.

## API and concurrency

- `GET /api/companions`: protected shared snapshot and configuration capabilities.
- `GET /api/companions/roster`: returns companion roster including alive, retired, and memorial entries.
- `POST /api/companions/roster`: hatches a new companion or successor generation with predecessor lineage tracking.
- `POST /api/companions/actions`: validated adopt, care (feed, play, cuddle, rest, explore, clean, medicine), visit, chat, inspiration, retire, and forget.
- A MongoDB lease serializes writers across processes; expired locks recover after 3 minutes.
- Durable receipts uniquely indexed by family, companion, and operation ID deduplicate retries. Concurrent adoption is rejected.
- Unlimited XP applies across all care actions and chat; server-side rate limits protect provider quota (60 chat attempts shared daily).
- Care has a 5-second per-person cooldown; medicine has a 6-hour cooldown; chat 5 seconds.
- Gemini text requests time out after 45 seconds.
- Client polls every 12 seconds while the widget is visible and refreshes on returning
  to the tab. Explicit visits settle simulation when entering or switching to the tab.

## Login update alert

`client/src/lib/releases.ts` defines the current release ID and user-facing highlights.
Change the ID and feature entries when shipping a new update. The alert appears after
profile login until dismissed, independently for Joe/Focus in each browser. “What's new”
in the top bar reopens it. Acknowledgments use local storage; if storage is blocked,
dismissal still works for the current session. New-message popups wait while the update
or companion dialog is open.

## Verification

Node's built-in test runner covers need progression, traits, forgotten context, input
validation, authenticated route rejection, sanitized provider errors, daily limits,
concurrent profiles, retry deduplication, and release acknowledgment. No real provider
calls are made by tests.

```text
npm test --prefix server
npm test --prefix client
npm run build --prefix client
```

Manual production checks still require configured MongoDB, Gemini, and Cloudinary:
create a character, care as each profile, chat in Thai and English, refresh both
profiles, generate a portrait, forget a memory, and log in again after bumping the release.
