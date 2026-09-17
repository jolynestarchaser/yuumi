# Shared companion and release announcements

## Product

One custom virtual creature belongs to Joe and Focus together. Character creation
has three steps: imagine its name/form/appearance, choose a starting temperament,
then review and hatch. Nothing is generated or billed during creation.

The dock opens a game-like companion home with an animated starter illustration,
needs, care actions, imagined thoughts, daily wishes, shared chat, a memory journal,
and personality/inspiration controls. Both people can care for the same character.

- Feed, play, cuddle, rest, and explore shape different traits and award experience.
- Time away gently changes needs, with safe lower bounds and automatic rest.
- No death, relationship penalties, guilt, or streak loss.
- Dialogue uses Gemini. The model chooses text, mood, and an imagined thought,
  never arbitrary state changes, tools, or unsourced factual memories.
- The most recent 80 care/chat memories and 60 conversation turns persist in MongoDB.
  Caregiver identity comes from the authenticated session, never the request body.
- Each caregiver can add their own inspiration. Both are included in dialogue and portraits.
- Forgetting a memory removes it and clears recent chat/thought context that may repeat it.
  Existing images and numerical growth are not reversed. Provider retention is separate.
- Portraits use Gemini image generation with a pixel-art prompt, stored as 256 × 256 PNGs
  in Cloudinary and rendered with `image-rendering: pixelated`. Generated artwork may vary;
  exact sprite consistency is not guaranteed. The starter illustration is not a preview
  of the custom portrait. No image binaries are persisted in MongoDB.

## Server configuration

Set only on the backend (Railway service variables or an uncommitted `server/.env`):

```text
GEMINI_API_KEY=<your server-side key>
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

Model names are configurable; select models available to your Gemini project.
Image generation also requires the existing Cloudinary credentials. Never use a
`VITE_` variable for the Gemini key. No keys are collected in the browser.
Care and creation work without Gemini; chat/image buttons report unavailable configuration.
Model access, quota and billing must be configured in the Google project.

Uses the official [GenerateContent REST API](https://ai.google.dev/api/generate-content)
and [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation).
Only companion settings, memories, and conversations are sent to Gemini; existing
letters, calendars, files, and credentials are not part of the prompt.

## API and concurrency

- `GET /api/companions`: protected shared snapshot and configuration capabilities.
- `POST /api/companions/actions`: validated adopt/care/chat/inspiration/portrait/forget.
- A MongoDB lease serializes writers across processes; expired locks recover after 3 minutes.
- The latest 60 operation IDs deduplicate retries. Concurrent adoption is rejected.
- Server-side daily limits: 60 chat attempts and 5 portrait attempts, shared by both
  people, reset at UTC midnight. Failed provider requests count because they may incur cost.
- Care has a 5-second per-person cooldown; chat 5 seconds; portrait generation 60 seconds.
- Gemini text requests time out after 45 seconds; image requests after 60 seconds.
- Client polls every 12 seconds while the widget is visible and refreshes on returning
  to the tab. No new Socket.IO protocol or background paid generation is introduced.

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
