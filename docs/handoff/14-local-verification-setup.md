# Isolated verification setup

Status: BLOCKED — scaffolding only. No database, browser, provider verification,
tests, typecheck or build were run for this setup. The user requested no tests.
Run these procedures only during a separately authorized verification session.

## Disposable Mongo replica set

Prerequisites: an explicitly supplied, trusted local MongoDB `mongod.exe`, a
compatible `mongosh.exe`, and free loopback port 27028. This procedure installs
nothing and must not load `server/.env` or copy a production connection string.

From the repository root in PowerShell, substitute actual executable paths:

```powershell
.\scripts\start-media-mongo.ps1 -MongodPath 'C:\YOUR-MONGODB\bin\mongod.exe'
```

The script creates a unique `.tools/media-mongo-<GUID>/data` directory and starts
a hidden process bound exclusively to `127.0.0.1:27028`. Retain the printed PID,
directory and log path. Startup output does not prove readiness. Inspect that
instance's log before continuing. Do not substitute an existing database path.
The database is unauthenticated and suitable only for synthetic data on a trusted
local workstation. Never tunnel or expose its port.

Initialize the single-node replica set manually:

```powershell
& 'C:\YOUR-MONGOSH\mongosh.exe' 'mongodb://127.0.0.1:27028/admin?directConnection=true'
```

At that `mongosh` prompt, run:

```javascript
rs.initiate({_id: 'rsMedia', members: [{_id: 0, host: '127.0.0.1:27028'}]})
db.hello()
```

Pass readiness only when `db.hello()` reports `setName: rsMedia` and
`isWritablePrimary: true`. A running standalone process is insufficient. Failure
to become primary, an occupied port, wrong set name or unexpected database path
means stop and investigate; do not redirect to Atlas or the application's `.env`.

An eventual integration harness must take this explicit URI:

```text
mongodb://127.0.0.1:27028/media_links_synthetic?replicaSet=rsMedia
```

No integration test command is supplied here because this scaffolding does not
introduce a test harness. That harness must independently reject non-loopback
hosts, unexpected ports/database names and missing replica-set topology before
mutations. Use generated synthetic owner/operation IDs in disposable fixtures;
the app's fixed Joe/Focus profile labels may appear only in this isolated DB.

Required later assertions: cross-owner attachment rejection, immutable import
replay, altered-payload conflict, concurrent duplicate deduplication, lost-response
replay, transactional rollback and message-reference protection during any future
cleanup. Record the exact command/results separately. Merely starting this DB
does not prove any assertion.

Stop this dedicated instance through its explicit local endpoint:

```powershell
& 'C:\YOUR-MONGOSH\mongosh.exe' 'mongodb://127.0.0.1:27028/admin?directConnection=true' --eval 'db.adminCommand({shutdown:1})'
```

A closed-connection message is expected during shutdown; confirm the recorded
process and listener have stopped. Keep the disposable directory and logs until
evidence is reviewed. There is deliberately no automatic deletion. If later
removing it manually, verify its resolved path is the exact recorded GUID
directory under this repository's `.tools`, and never delete `.tools` wholesale.

## Browser and Cloudinary isolation

Use a dedicated local/staging backend pointing only at the disposable database,
a separate browser profile, and synthetic credentials/data. Ensure the browser's
API and socket endpoints both reach that backend before entering any content.
Do not reuse the logged-in production Joe/Focus browser session. If endpoint
isolation cannot be established, browser verification remains BLOCKED.

Storage verification additionally requires an existing isolated Cloudinary
product environment and its server-side credentials. Do not create accounts or
copy production credentials. Use uniquely named synthetic tiny image/audio
fixtures; record returned provider identifiers without secrets. Verify storage,
animation, ownership, replay and rendering only after the environment is isolated.
Cleanup must name only the synthetic assets created during that run and must
preserve assets referenced by retained synthetic messages. The new provider-ID
fields alone do not authorize deletion or implement a safe cleanup lifecycle.

## Deployment and smoke evidence

Before any later smoke work, record expected Git SHA plus frontend and backend
deployment identifiers from the configured platform. A page loading does not
establish the backend revision. Confirm both deployments' source revisions and
environment mappings. Do not print provider secrets or signed URL query values.

Use synthetic staging accounts and content for changed flows. Production smoke
requires an explicitly isolated synthetic scope; without it, keep this gate
BLOCKED. Never alter real Joe/Focus notes, companions, maps, messages or assets.
Record browser actions, observed results, provider identifiers and cleanup actions
separately from source review or local automated-test results.
