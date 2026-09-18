# Deployment evidence and remaining verification prerequisites

Date: 2026-09-19. This change is implemented locally and has not been tested,
built, deployed, or exercised against a running service. The user explicitly
requested no tests during this work. No provider or production calls were made.

## Backend revision observability

`GET /api/revision` returns only:

```json
{"revision": "<full commit hash or null>", "nodeVersion": "v22.x.x"}
```

The revision accepts only a full hexadecimal 40-character Git SHA-1 or
64-character Git SHA-256. It prefers `RAILWAY_GIT_COMMIT_SHA`, with
`APP_COMMIT_SHA` as a fallback for another hosting platform. An absent or invalid
value returns `null`; it never returns raw environment content. The response has
`Cache-Control: no-store`. `/api/health` still returns exactly `{"ok":true}`.

Set `APP_COMMIT_SHA` only from the deployed artifact's actual source revision in
the release pipeline. A configured hash is an operator assertion, not an
independent proof of artifact integrity. Do not put credentials in either field.
The endpoint is public and intentionally discloses the Node runtime version.

## Revision procedure (not executed)

Prerequisites: deployment approval, project read access, intended commit hash,
and deployment of this source change. When verification is authorized, record:

```powershell
git rev-parse HEAD
Invoke-RestMethod 'https://<approved-api-host>/api/health'
Invoke-RestMethod 'https://<approved-api-host>/api/revision'
```

Compare the response hash with Railway's deployment source SHA/build evidence
and the intended commit. Confirm the runtime is Node 22. A null/mismatched hash,
an unsupported runtime, or failed health response leaves the gate blocked.
Do not infer frontend revision from the backend response: record Vercel's
deployment source SHA independently, along with its build output and deployment
URL. If the frontend/backend commits differ, document compatibility explicitly.
No cleanup is required for these read-only requests.

## Remaining prerequisites

| Gate | Required isolated setup | Evidence still required |
| --- | --- | --- |
| Replica-set Mongo | Disposable replica-set database, explicit test-only URI, synthetic records and mocked storage. Never load the production `.env` for this purpose. | Real transactional ownership, duplicate-operation, lost-response, rollback and quota race cases. Standalone Mongo does not prove these guarantees. |
| Browser | Staging client/API on recorded revisions, disposable database and synthetic accounts. | Recorded companion switching, travel recovery and letter/alert attachment journeys, including delayed/lost responses and refresh. |
| Cloudinary | Dedicated non-production product environment and synthetic fixtures, with provider IDs retained for precise cleanup. | Malformed-media behavior, animation preservation, storage replay and cleanup/compensation evidence. |
| Production smoke | Deployment approval, verified revisions, rollback plan and an isolated synthetic namespace. | Authenticated smoke evidence only after required local/staging gates pass. Without a synthetic namespace, mutating smoke remains blocked. |

Full cases and pass/fail criteria remain in
`11-media-links-security-review.md`. Its earlier statement that no revision
endpoint exists describes the prior checkpoint; the new endpoint is source-only
until deployed and verified. No browser, Mongo, storage, runtime test, or
production gate is marked passed by this document. Never modify or delete real
Joe/Focus content. Any later synthetic cleanup must target recorded synthetic
IDs only, not an entire shared database or Cloudinary account.
