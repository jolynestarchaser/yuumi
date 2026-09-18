# Media Links security and correctness review

Review date: 2026-09-19
Baseline: `f211f39` plus the narrow importer changes described below.
Scope: direct HTTPS media imports used by letters and alerts. GIPHY stays ID-based and Spotify stays on its existing adapter.

This document records source evidence and outstanding verification. It does not claim a production rollout.

## Flow and trust boundaries

1. `MessageCenter` classifies GIPHY and Spotify before generic URLs, preserves the draft, and owns cancellation/generation checks.
2. `desktopStore.importMessageAttachment` sends `{ url, operationId }` to authenticated `POST /api/messages/attachment-url` with an abort signal.
3. The server scopes the operation key to the authenticated profile, fingerprints the exact trimmed URL, and creates a unique pending import record before external work.
4. `remoteMedia` validates the URL and every redirect, resolves all addresses, rejects an answer set containing any non-public address, and pins the HTTPS request to one validated address while retaining the original hostname for TLS SNI/verification.
5. The response is streamed into a buffer with a hard 10 MiB cap, then signature/header/resource validation runs. This is structural validation, not codec decoding.
6. The verified bytes are uploaded to Cloudinary as `image` or `video` (audio), and only server-derived metadata is stored in `MessageAttachmentAsset`.
7. Message send accepts hosted media only by asset ID and queries for the authenticated owner, `complete` status, and matching kind. It copies server-owned metadata into the immutable message snapshot.
8. Import uniqueness is `{ owner, operationId }`; message uniqueness is `{ sender, operationId }`. Exact completed replays return the prior record and changed fingerprints conflict.

## Audit classification

Classification: **A** enforced and tested; **B** enforced but insufficiently tested; **C** partially enforced; **D** missing.

### URL and network security

| Check | Class | Evidence / limitation |
| --- | --- | --- |
| HTTPS only | A | URL validator and unit test reject HTTP, file, blob, and local paths. |
| URL length | A | 8,192-character cap and boundary rejection test. |
| Embedded credentials | A | Username/password rejected and tested. |
| Allowed ports | A | Only implicit/explicit 443; nonstandard port tested. |
| IPv4 private/loopback/link-local/documentation/shared/reserved ranges | A | Explicit address tests cover the security-sensitive ranges used by the filter. The list is intentionally conservative for several documentation blocks. |
| IPv6 loopback/private/link-local/site-local/multicast/documentation/transition forms | A | Binary-word checks plus compressed, expanded, mapped, NAT64, and 6to4 private-address tests. |
| DNS resolution | A | `all: true`, verbatim results; empty or any unsafe answer fails closed. |
| Mixed A/AAAA answer set | A | Deterministic mixed public/private resolver test. |
| DNS rebinding prevention | B | Connection is pinned through the HTTPS `lookup` callback; no disposable-network integration test proves socket destination. |
| Redirect validation and cap | A | Every hop re-enters URL/DNS validation; private/provider redirects and loop cap are tested. |
| TLS hostname verification | B | Original hostname and SNI are retained while IP is pinned; real TLS integration is not exercised. |
| Cookies/session/auth forwarding | B | Request constructs only `Accept` and `User-Agent`; no wire-level test asserts header absence. |
| Signed-query logging/redaction | B | Importer does not log or include the source URL in its own errors; the global error logger is not a structured redacting logger. |
| Request cancellation | B | Pending DNS cancellation is tested and socket abort is wired; Cloudinary upload cancellation is not wired. |
| Connect/read/overall timeout | B | Connect 5 s, read-idle 8 s, and whole-operation 15 s limits exist; the whole deadline now includes DNS and redirect chains, but real slow TLS/body tests are absent. |

### Resource limits

| Check | Class | Evidence / limitation |
| --- | --- | --- |
| Maximum response bytes | A | 10 MiB streaming counter rejects after the limit. |
| `Content-Length` | B | Declared oversize is rejected before buffering; no socket-level test. |
| Chunked response | A | Byte counting is independent of `Content-Length` and tested with an async chunk stream. |
| Compressed response | B | The importer does not decompress content; compressed wrappers fail signature validation. No live `Content-Encoding` test exists. |
| Animated image cost | C | Header dimensions plus marker-based frame/pixel-frame caps; markers are not a real GIF/WebP block decode. |
| Image dimensions | A | Header-derived dimensions and a 40M-pixel cap are enforced and unit tested indirectly. |
| Per-request memory | B | Body memory is bounded to 10 MiB plus copies; no heap-profile test. |
| Concurrent memory/request pressure | C | Per-profile import rate limiting is process-local; no shared limiter or global in-flight byte budget. |
| Partial hosted-upload cleanup | D | No persisted provider asset ID or compensating destroy workflow. |

### Content validation

| Format/check | Class | Current enforcement |
| --- | --- | --- |
| PNG | C | Signature, IHDR position, dimensions and pixel limit; no chunk CRC, zlib or pixel decode. |
| JPEG | C | SOI and supported SOF dimensions; no table/entropy/end-of-image decode. |
| GIF | C | Header, logical dimensions and marker-count resource check; no block/LZW/trailer decode. |
| WebP | C | RIFF/WEBP and VP8/VP8L/VP8X dimensions; no full RIFF/codec decode. |
| WAV | C | RIFF/WAVE signature only. |
| Ogg | C | `OggS` signature only. |
| MP3 | C | ID3 or MPEG-sync prefix only. |
| MP4/M4A | C | `ftyp` placement only; no box tree or audio-track validation. |
| HTML/SVG/script-bearing input | A | Text prefix rejects HTML, SVG, XML and script content; tests cover HTML/SVG. |
| Claimed MIME mismatch | B | Response `Content-Type` and extension are not trusted; a wire-level deceptive-header test is absent. |
| Malformed/truncated media | C | Bad/missing dimension headers fail, but signature-valid truncated payloads can pass; tests explicitly document this decoder gap. |

## Codec-decoder decision

Decision: **defer codec decoding and keep the Media Links acceptance gate blocked**.

No decoder is already installed. The current Railway/Nixpacks configuration installs only Node dependencies and declares no libvips or FFmpeg runtime package. Adding a native parser changes the build, runtime attack surface, failure modes, and deterministic test matrix.

| Option | Coverage and quality | Deployment/resource implications | Decision |
| --- | --- | --- | --- |
| Sharp/libvips | Strong image decode for claimed JPG/PNG/GIF/WebP formats; supports animated inputs only when all pages are requested. No audio validation. | Native/prebuilt dependency; page/pixel limits, process isolation/timeout and animation-preserving output behavior still need design. Metadata-only calls are not equivalent to a complete pixel decode. | Viable image half only; do not add alone. |
| FFmpeg/ffprobe | Broad image/audio demux/decode and duration/stream inspection. `ffprobe` alone can probe without decoding every sample/frame. | Binary is absent; Nixpacks must install/version it. Requires fixed argument arrays, protocol lockdown, process timeout/kill, bounded stdio/temp storage and concurrency control. Larger parser surface and operational burden. | Viable combined path after explicit senior/deployment approval, not a narrow patch. |
| Pure-JS decoders/parsers | Possible format-by-format checks. | Fragmented support, in-process CPU/memory risk, no existing dependency, and a large custom security/test surface for animation plus four audio containers. | Reject for this slice. |
| Browser decoding | Useful secondary preview signal. | Browser-dependent, bypassable by direct API clients, and occurs after server ingestion. Cannot be an authorization/security gate. | Not sufficient. |
| Cloudinary upload success | Provider rejects unsupported assets and returns detected metadata for accepted uploads. | Behavior is external and currently unverified in an isolated product environment; upload does not give the application explicit decode limits or a local deterministic malformed corpus. | Defense in depth only. |
| Quarantine + bounded re-encode | Can force decode and publish only normalized outputs. | Needs private/quarantine delivery, provider IDs, lifecycle state, compensation and deliberate animation/audio preservation. Re-encoding can change animation/metadata. | Strong future design, but architectural work. |
| Stronger format parsers | Can reject more malformed containers cheaply. | Still cannot prove pixel/sample decoding and risks growing custom codec logic. | Useful incremental defense, not acceptance evidence. |

A senior decision should choose either separate bounded image/audio validators or a sandboxed, pinned FFmpeg pipeline. The decision must specify supported formats, animation preservation, maximum duration/frame count/pixel-frames, concurrency, process isolation, timeout/cancellation, and malformed fixture corpus.

## Ownership and idempotency evidence

- Source-confirmed: import operations are keyed and uniquely indexed by authenticated `owner + operationId`; send operations by authenticated `sender + operationId`.
- Source-confirmed: identical completed import/send replays return the prior immutable record; changed fingerprints conflict.
- Source-confirmed: a hosted attachment lookup includes `_id`, authenticated owner, `complete` state and kind. Client-supplied URL/name/MIME/bytes cannot override stored values.
- Source-confirmed: only the winner of the unique pending import record proceeds to remote fetch/upload, preventing normal duplicate logical imports.
- Integration-unverified: unique-index creation, concurrent duplicate imports, lost responses and cross-owner guessed IDs against a real replica-set Mongo deployment.
- Known recovery gap: a process crash can leave an import permanently `pending`; there is no lease/takeover state.
- Known coupling: send replay normalizes the current asset before looking up the prior message. Future cleanup must not make a previously successful message replay fail.

## Unattached asset cleanup

No cleanup worker exists. `MessageAttachmentAsset` does not store Cloudinary `asset_id`/`public_id`/resource type, attachment/reference state, expiry, deletion lease or failure state. A Cloudinary success followed by a database-save failure can orphan provider storage.

Do not delete assets with the current schema. The smallest safe design is:

1. Persist immutable provider asset ID, public ID, resource type, origin (`url` versus legacy upload), `replayUntil`, and lifecycle state on successful upload.
2. Make message creation and the transition from `available` to `attached(messageId)` one Mongo transaction. A cleanup claim must conditionally transition only expired `available` records to `deleting`; sends must reject/serialize against `deleting`.
3. Before provider deletion, recheck that no message references `attachment.assetId`. Never select legacy assets or records without the new lifecycle marker.
4. Claim work with a database lease so only one server instance deletes. Record retryable `deleteFailed` state; provider failures must not remove the database evidence.
5. Keep immutable operation tombstones. Define the replay contract after `replayUntil`; before it, exact replay must return the same usable attachment.
6. Protect all historical/sent messages indefinitely. Provider deletion uses the immutable provider asset ID where supported.

Retention and post-expiry replay semantics are product decisions. Until implemented and replica-set/storage-tested, cleanup remains blocked.

## Verification procedures for blocked environments

### A. Disposable replica-set Mongo

Prerequisites: supported Node 20/22; disposable Mongo replica-set URI in `TEST_MONGODB_URI`; isolated database name; no production URI or Joe/Focus records; Cloudinary mocked for database-only cases. Docker/Podman is optional, not assumed.

Required test entrypoint to add: `server/test/messageAttachment.mongo.test.ts`, gated to refuse database names that are not explicitly disposable. Run:

```powershell
Set-Location server
node --import tsx --test test/messageAttachment.mongo.test.ts
```

Test with synthetic profiles/asset IDs: exact import replay, altered replay conflict, concurrent duplicate import, lost-response retry, cross-owner guessed asset rejection, one sent message on double send, and referenced-asset cleanup protection. Pass means one logical import/message and exact immutable responses under concurrency. Any duplicate, foreign ownership success, stuck state without documented recovery, or referenced deletion fails the gate. Drop only the uniquely named disposable database afterward.

### B. Browser verification

Prerequisites: staging client/API on the reviewed commit, isolated staging database, synthetic Joe/Focus credentials, provider mocks or isolated storage, and a browser runner or manual recording. Do not point the test browser at the production couple's desktop.

Run the letter and alert journeys from `13-testing.md` plus direct JPG/PNG/WebP/GIF/audio preview, cancel, replace, attachment-only send, double click, refresh/reopen, GIPHY, Spotify, failed resolver, delayed A-after-B, and lost-response proxy cases. Pass requires preserved subject/body/source, no stale replacement, one unread message, manual audio playback only, and identical rendering after refresh in both EN/TH and reduced motion. Record browser/version, staging revision, timestamps and screenshots/video. Delete only synthetic staging messages/assets.

### C. Cloudinary/storage verification

Prerequisites: a dedicated non-production Cloudinary product environment or strictly isolated credentials, synthetic malformed/valid fixture corpus, and a deletion-capable cleanup account. Current configuration has no folder/tag isolation, so shared production credentials are not acceptable.

Upload each supported valid format and malformed signature-valid fixtures through the authenticated staging endpoint. Verify detected resource type/format/bytes/duration, animation preservation, rejection behavior, timeout behavior, and response metadata. Simulate DB failure after upload only after provider IDs/compensation are implemented. Pass requires no provider orphan, no accepted unsupported/script payload, stable replay, and complete synthetic cleanup. Never enumerate or delete existing account assets.

### D. Deployed revision verification

Prerequisites: Vercel/Railway project read access and the intended commit SHA. The application currently exposes only `{ ok: true }` at `/api/health`; it has no revision endpoint.

Compare the Vercel and Railway deployment commit SHAs/build logs to the intended Git SHA, confirm Railway uses a supported Node version, then fetch `/api/health` and the client build. Pass requires both provider dashboards to identify the same intended source revision (or documented compatible frontend/backend SHAs) and successful health/build checks. HTTP 200 alone is not revision evidence.

### E. Production smoke

Prerequisites: explicit rollout approval, verified deployed revisions, backup/rollback plan, designated synthetic production profiles/data namespace, and isolated synthetic media. Without a synthetic namespace, do not run mutating production smoke tests.

Exercise one direct image and one audio import, exact import replay, one attachment-only message, exact send replay, recipient refresh/read, GIPHY and Spotify legacy paths. Pass requires one provider asset/reference and one message per operation with no changes to real Joe/Focus content. Remove only identified synthetic records/assets through an approved cleanup procedure and retain redacted evidence.

## Remaining gate state

- Codec-level malformed image/audio rejection: **BLOCKED**.
- Replica-set ownership/idempotency/concurrency evidence: **BLOCKED**.
- Race-safe unattached asset cleanup and orphan compensation: **BLOCKED**.
- Real-browser letter/alert acceptance: **BLOCKED**.
- Isolated Cloudinary behavior: **BLOCKED**.
- Deployed revision and production smoke: **BLOCKED**.
- The existing client bundle-size warning is not a Media Links correctness blocker.
