# P1/P2 backend contract and rollout

Status: implemented in the local working patch on 2026-09-18; production migration and smoke tests are still required.

## Contract changes

- Companion records are family-scoped and schema-versioned. New roster creation requires `operationId`, creates a born companion, and is idempotent.
- A family lease serializes create/restore and enforces at most six active companions. Unknown companion IDs never upsert.
- Gemini usage is reserved from one family-wide daily budget. A repeated chat operation does not reserve twice.
- Needs use `needsUpdatedAt` rather than generic `updatedAt`; comfort is migrated to 75 for legacy records.
- Normal `PATCH /api/items/:id` writes require `expectedRevision` and `operationId`.
- Item update/restore, revision history, audit event, and immutable operation response commit in one Mongo transaction. Replays return the original response without another write.
- Revision zero matches both explicit zero and legacy records with no `contentRevision`. Other revisions remain strict compare-and-swap.

## Migration

Prerequisites:

- Back up the production database.
- Use a MongoDB replica set or Atlas deployment. Item write transactions are intentionally not supported on a standalone `mongod`.
- Deploy server code before the client or in the same release. The previous server does not require the new client fields, but the new server requires operation IDs for item content writes.

Run from `server/` with the production `MONGODB_URI` available only in the environment:

```sh
npm run migrate:companions
```

The migration is idempotent. It adds family/schema/archive/needs-clock/comfort defaults without deleting memories, portraits, evolution history, or legacy per-pet budget data. It then creates the family quota document, seeding same-day usage from existing companion budgets. Running it twice should report zero companion changes on the second run.

No bulk item rewrite is required. Legacy missing `contentRevision` is accepted only as revision zero and becomes revision one on the next successful transactional write.

## Rollout checks

1. Run root `typecheck`, `test`, and `build`.
2. On a disposable replica-set database, run the migration twice and compare companion counts and payloads.
3. Race two create requests when five companions are active. Exactly one may create; retry the loser and confirm the explicit six-active conflict.
4. Replay a successful create and an item save after withholding the first response. Each must return the same ID/revision with one database record/history row.
5. Interleave chat reservations on two pets and both profiles at the final daily slot. Exactly one reservation wins.
6. Send an action to a valid-looking unknown companion ID and confirm the companion count is unchanged.
7. Race two item writers at one revision; one commits and one receives the current record in a 409 response.
8. Force history/audit failure inside the item transaction and confirm the item does not change.
9. Restore item history and confirm the partner receives `item:updated` only after commit.

## Rollback

Do not delete the added fields or operation/family collections during rollback. Old code ignores them, while retaining them preserves idempotency and quota evidence for a later redeploy. If the new server must be rolled back, roll back the client at the same time because new item writes rely on the transactional contract. Investigate and repair any failed migration from backup; do not rerun destructive cleanup against the companion collection.
