# A — Reliable notes and shared content persistence

Status: planned. Priority: P0. Read the root [Plan](../../Plan.md) first.

## Scope and evidence

Inspect `client/src/components/WindowManager.tsx` (`NoteWindow`, minimize, close),
`client/src/store/desktopStore.ts` (`updateItem`, HTTP/realtime reconciliation),
`server/src/routes/items.ts`, `server/src/routes/history.ts`,
`server/src/services/historyService.ts`, `server/src/models/Item.ts`,
`server/src/models/RevisionHistory.ts`, and the actual server entry/error middleware.
Do not assume there is a `server/src/app.ts`; resolve the entry with `rg --files`.

Existing specs: `03-backend-api.md`, `11-state-management.md`,
`16-mac-window-desktop.md` (note autosave), `20-typescript-migration.md`.
This plan supersedes the old requirement that a note must have a nonempty body:
**a named blank note is valid**. Keep the existing note-body length cap.

## Reproduce before claiming a root cause

Capture only status codes, error codes, revision numbers, and synthetic test text.
Never print production note bodies, session tokens, environment variables, or keys.

| Scenario | Source risk to verify | Required result |
| --- | --- | --- |
| Type and refresh before Save | No autosave | Autosave or explicitly recoverable draft |
| Type and minimize/restore | Editor unmounts | Exact draft survives |
| Clear body and Save | Required-content validators | Empty string saves successfully |
| Restore history while editor open | Reload depends only on ID | Clean draft shows restored text |
| Joe edits; Focus saves first | Queue adopts latest revision | Conflict preserves both versions |
| Save, type more before response | Request/draft ownership | New typing never marked saved or erased |
| Save while offline, then close | Error/lifecycle handling | Draft remains and close waits or offers recovery |
| Item commits; history recording fails | Split persistence | No ambiguous success or destructive retry |

The source establishes risks, not which one caused the owner's latest production
failure. First deliver a small reproduction and diagnosis with the failing case.

## Target editor model

Extract a `NoteEditor` component and a testable draft/save controller. Maintain a
store keyed by profile + item ID outside window mounting. Track:

```ts
type NoteDraft = {
  baseRevision: number;
  base: { name: string; content: string };
  draft: { name: string; content: string };
  editSequence: number;
  status: 'clean' | 'dirty' | 'saving' | 'error' | 'conflict';
  pendingOperationId?: string;
  remote?: { revision: number; name: string; content: string };
};
```

- Debounce 600 ms after a change; one write in flight per note. Save button and
  Ctrl/Cmd+S flush the same pipeline; shortcuts only affect the focused note.
- Save the draft's **baseRevision**, never substitute a newer store revision to
  make an outdated draft pass. After own success, rebase queued later edits onto
  that acknowledged version only if no intervening remote version exists.
- Compare acknowledgments with the request's edit sequence. Show Saved only if
  that acknowledged snapshot equals the current draft.
- Idle remote updates replace the clean draft. Dirty remote updates retain the
  local draft and expose a conflict comparison with Reload remote and Save copy.
  An explicit overwrite, if offered, requires the user to review the current text.
- Minimize never discards state. Intentional close flushes and waits; failure
  keeps the editor open. Remote close must also preserve the local draft.
- Keep a bounded recovery cache in sessionStorage per profile/item for refresh
  recovery, clear only the acknowledged version, and purge on explicit logout.
  Session storage may fail: retain the in-memory draft and show recovery limits.
  Do not persist private note text to cross-session localStorage by default.
- Navigation/unload cannot guarantee an HTTP save. Persist recovery first and
  use a dirty-page warning where supported; never claim unload saves are guaranteed.
- Display accessible localized Unsaved / Saving / Saved / Retry / Conflict
  states. Title limit 160, body 10,000 characters, with counters/errors before API.

## Server contract and atomicity

Keep item content in `items`. Introduce a reusable content-write service with:

```text
input: itemId, actor from session, expectedRevision, operationId, whitelisted patch
success: authoritative item and acknowledged operationId
conflict: 409 REVISION_CONFLICT + current authoritative item
invalid: 400 VALIDATION_ERROR + field information
missing/trashed: 404/410
```

Use an atomic filter on `_id`, `deletedAt: null`, and `contentRevision`, plus a
revision increment. Normalize legacy absent revisions deliberately. Check revision
is a nonnegative integer and operation IDs are bounded. Whitelist fields; do not
replace the whole document or overwrite position updates from content writes.

Preferred persistence strategy is a Mongo transaction for item mutation, unique
operation acknowledgment, revision history, and audit. Verify replica-set support
in the integration environment before using this strategy. On deployment setups
without it, document and implement an outbox/repair strategy before rollout;
do not quietly return an error after a write and then replay it as a new revision.
Idempotency must let a lost HTTP acknowledgment return the committed result.

Route history restore through this same service and broadcast through the existing
item-update channel after commit. Apply monotonically newer content and position
revisions separately on clients; a delayed HTTP response must not rewind either.
Explicitly refresh/merge the authoritative record returned by a conflict.

Map writes will reuse this service. Preserve behavior for calendar, image metadata,
secret settings, and other item callers while migrating expected-revision handling.
Protect all writes with the existing session/profile policy; verify the item
router's `optionalDesktopSession` behavior rather than assuming it enforces auth.

## Deliverables and gates

- Regression coverage for the scenarios above, including two concurrent writes
  with the same revision: exactly one succeeds, the other receives 409.
- Database-backed integration test for atomic write + history + retry behavior;
  pure/model tests alone do not prove concurrency.
- UI test for editing while saving, minimize, failed close, refresh recovery,
  clean remote update, and dirty conflict. Use a mock API with controlled ordering.
- Update specs/tests expecting nonempty note bodies. Do not loosen media/link
  validation while fixing notes.
- Handoff includes exact reproduction, verified root cause, data recovery behavior,
  response contract, and changed call sites. No migration may discard note history.
