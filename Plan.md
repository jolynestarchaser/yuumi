# Yuu & Mi — implementation handoff: companion life, notes, and travel

Status: **PLANNED — implementation has not started for this handoff.**
Prepared: 2026-09-18. Inspected application baseline: `924afcc`.

This is the root `plan.md` requested by the owner. The repository already uses
`Plan.md`; on this Windows filesystem they are the same filename. Keep this casing
and use the links below. Earlier phase notes remain at the bottom as historical
records, not evidence that the new acceptance criteria pass.

## Outcome the owner wants

Joe and Focus should raise several shared, expressive virtual companions. A newly
hatched companion acts and speaks like a cute little creature, asks for food,
play, and hugs, and visibly matures through care. Its race, memories, preferences,
and the way both people treat it influence its personality and evolving appearance.
The desktop should feel like a small pet game, while notes reliably save and the
travel globe becomes useful for planning and remembering trips together.

The current request is to prepare this handoff. **Do not treat creation of these
documents as completion of the features.** No production diagnosis or real Gemini
generation was performed during this planning pass.

## Read order and work packages

| Order / owner | Document | Deliverable |
| --- | --- | --- |
| A: persistence | [01 — reliable notes and shared writes](docs/handoff/01-persistence-and-notes.md) | Reproduce note failure; durable drafts, autosave, atomic revision conflicts; persistence foundation for maps |
| B: companion domain | [02 — roster, care, and growth](docs/handoff/02-companion-domain.md) | Multiple companions, migration, care requests, EXP rules, growth stages, persistent appearance outcomes |
| C: dialogue | [03 — persona and prompt harness](docs/handoff/03-persona-harness.md) | Stage-aware Gemini persona, grounded memory, age-appropriate speech, repeatable EN/TH evaluations |
| D: game UI | [04 — animated companion life](docs/handoff/04-companion-game-ui.md) | Nursery, care scenes, soft/pixel animation, visible growth; remove new image generation |
| E: travel | [05 — travel map upgrade](docs/handoff/05-travel-map.md) | Reliable pins, edit/status/date/filter/search, accessible globe controls and selection |
| Integrator | [06 — delivery and verification](docs/handoff/06-delivery-and-verification.md) | Contracts, task dependencies, migration/rollout gates, cross-feature QA, agent handoff format |

## Findings that inform the plan

These are source observations at the baseline, not a claim to have reproduced
every production symptom.

1. `NoteWindow` in `client/src/components/WindowManager.tsx` saves on its button
   or local close. There is no debounce autosave. `WindowManager` removes minimized
   windows from the tree, so an unsaved component-local draft is lost on minimize.
   Note inputs only reload when the item ID changes, not on remote content/history
   changes. The model rejects an empty note body. These need separate regressions.
2. Item PATCH and history restore compare a loaded revision and then call `save()`;
   the comparison is not a database compare-and-swap. `updateItem` normally selects
   the newest store revision even if the editor's draft began on an older version.
   A queue alone does not protect two people editing the same content.
3. `brainContext()` supplies traits and the latest evolution but no explicit level,
   maturity profile, or current care request. One generic prompt produces all ages.
4. Every companion operation targets `COMPANION_KEY = 'joe-and-focus'`. A second
   tab or avatar alone cannot provide multiple independent companions.
5. Needs decay is tied to generic `updatedAt`. The care controller settles state,
   then `careFor()` settles it again without advancing that timestamp. Refactor the
   clock before introducing more needs; test this potential double-decay path.
6. Care/chat award EXP but there is no persistent need-request lifecycle. Current
   evolution displays an emblem and influences optional portrait prompts; it does
   not implement staged body changes.
7. Image generation exists, but its failure cause is unverified. The owner permits
   removing it. Remove new generation and make built-in art the supported path;
   keep existing stored assets safe.
8. The globe now has real bundled land shapes. Remaining gaps include cleared
   drafts before save success, overlapping saves using the same revision, errors
   leaving optimistic pins displayed, and no pin editing. Its 100-pin UI limit is
   inconsistent with the server's 10,000-character generic content limit. Earlier
   reports that all map concurrency/capacity issues were fixed were too broad.

## Decisions and proposed defaults

These are implementation defaults to avoid repeatedly asking the owner routine
questions. They are tuning choices, not claims that the owner specified numbers.

- Keep React/Vite, TypeScript, Express, Mongoose, Zustand, existing desktop items,
  shared EN/TH settings, and the current deployment topology.
- Keep one shared family for Joe and Focus, initially allowing **six active
  companions**, with archive/restore and at most two desktop roamers at once.
- Keep the familiar 80 EXP per level for existing saves. Growth stages: egg before
  adoption, hatchling at levels 1–2, child at 3–5, juvenile at 6–9, grown at 10+.
  Later grown-level rewards are cosmetic, not repeated re-hatching.
- Food, energy, fun, and comfort matter; unmet needs produce cute requests and
  visible behavior. No death, irreversible illness, loss of levels, or blame for
  time away. A busy couple must be able to resume happily.
- Development and dialogue share a single server-calculated stage. Race stays
  recognizable through growth, and the chosen colors remain the palette anchor.
- **Evolution must change the actual creature's form**, following the satisfying
  transformation principle of Pokemon/Digimon/Persona-style progression with
  original designs. A badge, glow, palette swap, resize, or accessory alone is not
  evolution. Each stage milestone needs a distinct silhouette/anatomy and a
  before/after transformation scene in both soft and pixel styles.
- New artwork uses authored/procedural soft and pixel parts. No paid image
  generation is required for character creation, care, leveling, or evolution.
- Upgrade the existing orthographic globe first. It is a rotatable 3D-looking SVG
  globe, not a WebGL terrain engine. Add useful trip interactions before changing
  the renderer. Place text/coordinates and bundled shortcuts work without API keys.
- Fix notes first because loss of writing is the highest-impact reported issue.

## Sequence and ownership rules

1. A reproduces and fixes persistence. B specifies and lands versioned companion
   contracts, shared care/growth rules, migration, and the multi-companion API.
2. C and D may design against B's agreed contracts; integrate only after those
   types and fixtures exist. E may build visual controls independently but its
   saving path depends on A's revision service.
3. Each owner works in separate task files/worktrees. The integrator alone merges
   edits to `shared/contracts.d.ts`, `desktopStore.ts`, `App.tsx`, package scripts,
   `en.json`, `th.json`, and release entries. No simultaneous blind JSON rewrites.
4. Ship complete vertical slices: persistence, roster, care/growth, persona,
   animation/portrait retirement, map polish. Every slice includes EN/TH strings,
   errors/loading states, applicable tests, and schema compatibility checks.

The owner intends to hand this plan to other agents. This plan does not launch
agents or implement their tasks during the planning turn.

## Explicit boundaries

- Do not claim the creature is conscious; its apparent initiative comes from game
  state, persistent preferences, and constrained dialogue.
- Do not add Next.js, Redux, new realtime protocols, autonomous paid background
  AI calls, public accounts, combat, trading, monetization, or a relationship score.
- Do not read letters, maps, notes, or calendars into companion memory by default.
- Do not copy branded game characters/assets or promise an exact Pikachu voice.
- Do not delete existing companions, portraits, notes, history, or unrelated user
  files. Preserve the existing untracked `.vscode/` folder.
- Do not ship a placeholder graphic as proof of a working custom generator.
- Do not declare a feature live because the homepage returns HTTP 200. Verify the
  deployed revision and the actual user journey.

## Definition of complete

Both people can keep drafts without losing text, maintain two or more distinct
companions, fulfill readable care requests, see a stage change and a treatment-
influenced body design, and hear a consistent persona mature across those same
stages. Map pins can be added, edited, marked visited, and recovered from failed
saves. Every workflow operates in EN and TH and survives refresh, minimization,
conflicting sessions, and ordinary provider/network failure. All required gates in
document 06 have recorded evidence; unchecked gates remain explicitly unfinished.

---

# Historical plan — Secret, History, Profiles และ Letters

สถานะของแผน implementation แยกตาม phase เพื่อใช้ติดตามงานจริง โดย server เป็น source of truth และใช้ revision ป้องกันข้อมูลเก่าเขียนทับ

## Phase 0 — Foundation

- [x] เพิ่มโมเดล Session, RevisionHistory, AuditEvent และ Message
- [x] เพิ่ม `DESKTOP_PIN` ใน server environment documentation
- [ ] ทำ MongoDB migration/backup runbook สำหรับ production

## Phase 1 — PIN และ Profile

- [x] `POST /api/auth/unlock` ตรวจ PIN ฝั่ง server และ rate limit
- [x] `POST /api/auth/profile` เลือก Joe/Focus และออก session ใหม่
- [x] Socket.IO ตรวจ session และเข้าห้องตาม profile
- [x] ปุ่ม Joe Neon green และ Focus Royal blue

## Phase 2 — Revision และ Logs

- [x] Item และ DesktopText มี revision และ actor ล่าสุด
- [x] Note autosave ต่อคิว request และส่ง expected revision
- [x] เก็บ snapshot ประวัติการสร้าง/แก้ไขข้อความ
- [x] ส่ง event จาก server หลัง commit เพื่อลด stale broadcast

## Phase 3 — History / Restore

- [x] `GET /api/history` และ `POST /api/history/:historyId/restore`
- [x] หน้าดูประวัติ Note และข้อความบน desktop
- [x] Restore สร้าง revision ใหม่และตรวจ conflict

## Phase 4 — Secret Items

- [x] Item รองรับ `secret` และ `secretLabel`
- [x] ซ่อน preview/thumbnail จน double-click เพื่อ reveal
- [x] context menu ทำให้เป็น Secret หรือแสดงกลับ

## Phase 5 — Letters / Alerts

- [x] Inbox, unread count, sent/received และ mark-read
- [x] ส่งถึง Joe/Focus อีกคนด้วย operation ID และ rate limit
- [x] จดหมายแบบ hearts, sparkles, emoji-rain หรือไม่มี animation
- [x] แจ้งเตือนในเว็บและโหลดข้อความค้างจาก DB หลังเลือก profile

## Phase 6 — Verification / Rollout

- [x] Server syntax check, 7 model tests และ Vite production build ผ่าน
- [ ] ทดสอบสอง browser sessions กับ MongoDB production-like replica set
- [ ] deploy Railway/Vercel แล้วตรวจ session, Socket.IO, history และ messages จริง

## Architecture Rules

- OOP เฉพาะ service/repository ที่ถือ dependency; business validation และ state reconciliation เป็น pure functions
- REST และ Socket ใช้กติกา revision เดียวกันและไม่รับ actor จาก payload
- ห้ามเก็บ PIN หรือ token ใน logs; ประวัติของ Secret item ใช้ snapshot เดียวกับ item เพื่อให้กู้คืนได้
- Secret เป็นการซ่อนใน UI ตามที่กำหนด ไม่ใช่ encryption หรือ permission boundary
