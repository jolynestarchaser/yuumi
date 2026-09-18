# Media decoder implementation decision

Date: 2026-09-19. Status: **BLOCKED** pending implementation and verification. This is a design, not evidence of decoding. No tests, codec installation, or runtime changes were performed for this document, as requested.

## Decision and repository evidence

Keep Media Links codec acceptance blocked. Prepare **separate image and audio validators in an isolated worker**, using Sharp/libvips for images and FFmpeg for audio. Do not install either until the worker resource boundary and deployed binary versions are specified. This is the recommended implementation direction, not authorization to weaken the current structural checks or silently restrict advertised formats.

`server/src/services/remoteMedia.ts` currently downloads at most 10 MiB and checks image headers/dimensions and audio signatures. Its 40M-pixel, 200-frame and 80M-pixel-frame checks are preliminary filters; GIF/WebP marker counting is not authoritative. `server/package.json` has no decoder. The current working tree declares Node 22; `railway.json` uses Nixpacks with an npm-only server build. Neither a decoder binary nor per-job OS isolation is configured. Node 22 does not supply these capabilities.

A single FFmpeg path would reduce library count but makes animated WebP/GIF support depend on the exact compiled decoder set. Sharp is the better candidate for the four advertised image formats and explicit all-page image handling; FFmpeg supplies the audio decoding missing from Sharp. Neither metadata inspection nor ffprobe alone proves full decoding. This split still needs an image-format corpus and binary capability review.

Browser decode remains secondary preview feedback. Cloudinary upload success remains defense in depth until its malformed-media behavior and animation delivery are verified. A pure-JavaScript parser collection would add a new custom codec boundary without an existing repository dependency to justify it.

## Placement and trust boundary

Preserve the existing URL validator, DNS pinning, download cap, ownership and immutable-operation contracts. Insert validation after `sniffMedia` and before Cloudinary upload:

1. Acquire a bounded worker slot before retaining another downloaded body.
2. Send only downloaded bytes, the server-sniffed kind and a random job ID to the validator. Never send the original URL, cookies, provider credentials, profile data or filesystem paths supplied by the client.
3. Decode every frame/sample to EOF under resource limits. Return a small, schema-validated result with detected format, decoded resource counts and validator version.
4. Compare the result with the structural classification and the explicit product format allowlist. Reject discrepancies, unsupported streams, missing counts, decoder errors, cancellation and timeouts.
5. Upload the identical input bytes only after success. Keep a digest linking the validated bytes to the uploaded bytes. Validation does not sanitize metadata or guarantee every browser parser interprets the file identically.

Do not automatically re-encode in this first design. This preserves animation, timing and audio quality. If sanitized output becomes a requirement, a separate output contract must define metadata stripping, format conversion and animation preservation; decoding alone cannot make that claim.

## Proposed initial limits

These are implementation defaults to approve and measure, not currently enforced guarantees.

| Resource | Proposed boundary |
| --- | --- |
| Encoded input | Existing 10 MiB maximum; no archive or HTTP decompression |
| Image pixels | Existing 40M per composited frame |
| Animation | Existing 200 frames and 80M total composited pixels; inspect all frames |
| Image decoded output | At most 320 MB RGBA-equivalent output, streamed/discarded; account for higher bit depth before conversion |
| Audio | At most 10 minutes, 2 channels, 48 kHz and 57.6M channel-samples; a proposed compatibility limit requiring product review |
| Wall time | 15 seconds per validation job, including probe/startup; cancellation kills the job |
| Memory | 512 MiB hard OS/container limit per job; exceeding it rejects the input |
| CPU/processes | One active job per worker, one decoder thread where configurable; process-count cap |
| Queue | Two waiting jobs per worker, bounded wait; reject excess with retryable busy response |
| Diagnostics | At most 64 KiB combined captured diagnostics; no raw input/URL logging |
| Scratch | One random private job directory, at most 12 MiB input storage; no persistent decoded output |

The 512 MiB memory budget may reject some valid 40M-pixel images with decoder overhead. Do not claim the full nominal limit is supported until measured. Tune the deployment capacity or explicitly lower the product limit; never remove the hard memory boundary to make a fixture pass.

A child process alone is not an OS memory or filesystem sandbox. V8 heap limits do not bound native libvips/FFmpeg allocation. If Railway cannot provide a restricted worker container with a hard memory limit, no outbound network, a read-only root, an unprivileged identity and bounded scratch storage, this design remains blocked. Do not run native decoding in the Express process as a substitute.

## Images

Use a pinned Sharp/libvips build in a disposable worker process. Retain structural filtering, configure strict decode failure handling, pixel limits, all-page/animated input and bounded native concurrency/cache. A metadata call is only the preliminary inspection; force full pixel production through a bounded sink. Verify whether each supported loader is genuinely streaming: buffering a complete raw animated image internally still counts against the hard OS limit.

Count actual frames/pages and composited dimensions, not byte markers. Account for page height correctly; do not mistake a vertically stacked multi-page image for one frame. Reject an animation exceeding the frame/pixel budget rather than decoding just the first 200 frames and reporting success. Decode all frames once; loop count describes playback and must not cause repeated validation.

JPG, PNG, GIF and WebP remain the only image formats. APNG is a specific compatibility question: PNG is currently advertised without an APNG distinction, so determine whether the selected build validates every APNG frame. A first-frame-only APNG decode is insufficient; either support every frame or explicitly reject animated PNG with product copy and acceptance updates. Preserve GIF/WebP frame timing and loop metadata by uploading the original bytes after validation. Include corrupt later-frame cases in future verification.

## Audio

Use pinned FFmpeg/ffprobe binaries from a reproducible worker image. Probe under the same sandbox and deadline, then fully decode the permitted audio streams. A successful probe is not validation, and a zero exit code alone is insufficient if the decoder tolerates corrupt packets. Use the pinned build's strict error behavior, require EOF and positive decoded sample counts, and verify error behavior against malformed fixtures before defining the gate as passing.

Invoke binaries using a fixed executable and argument array with `shell: false`. Input is a server-created bounded local file to support seek-dependent MP4/M4A; never pass an attacker URL or filename. Restrict protocols/demuxers/decoders to those required. Protocol `file` permission alone is not confinement: the container must expose only job input and required runtime files, and deny network independently. Disable interactive input, cap stderr/stdout, terminate the entire process tree on cancellation/deadline and await its exit before scratch cleanup.

WAV, Ogg, MP3 and MP4/M4A are containers/signatures, not complete codec policies. Define the exact allowlist before implementation: candidate baseline is PCM WAV, Vorbis/Opus Ogg, MPEG Layer III MP3 and AAC M4A. ALAC, unusual WAV codecs, MP2 headers, multiple audio tracks, embedded artwork and video tracks require explicit decisions. The current `ftyp` check incorrectly provides no proof that a file is audio-only. Do not accidentally admit video simply because FFmpeg can decode it.

Enforce resource limits during decoding, not solely from declared duration. A duration cap flag that truncates output is not proof the remaining input is valid. Reaching the sample/time/resource ceiling before verified EOF must reject, and a truncated-prefix decode cannot pass. Bound source channel/sample-rate metadata before conversion; converting to stereo/48 kHz cannot conceal an excessive input resource cost.

## Failure, deployment and dependency policy

Missing worker, missing codec, unhealthy binary, malformed output, nonzero exit, signal termination, exceeded limits or cancellation must fail closed before storage. Return a stable product error while preserving the composer draft and import operation identity. Do not fall back to signature-only success. Permanent invalid-media errors and temporary worker-unavailable failures need distinct retry policy consistent with existing immutable operations; review the current permanently pending/failed import recovery gap before adding worker retries.

Pin the worker image digest, Sharp package/lockfile, libvips build and FFmpeg package/build configuration. Record supported formats and architecture in build artifacts. Review licenses and parser security updates; minimize compiled demuxers/protocols where practical. Do not download arbitrary binaries at request time. Windows development should use the same isolated Linux artifact for security equivalence; a Windows native smoke run cannot substitute for the deployed sandbox.

Cloudinary upload cancellation, orphan compensation and reference-safe cleanup remain independent blockers. A decoder does not repair them. Preserve provider identity for GIPHY and bypass this generic decoder path for GIPHY/Spotify adapters.

## Concrete next implementation sequence

1. Confirm isolated worker deployment/network/memory controls and choose a reproducible image source. Record operational cost and rollback behavior.
2. Decide audio codec/stream policies, APNG handling and the proposed duration/channel/rate limits. Update EN/TH only when behavior is implemented.
3. Add an internal validation result contract and fixed failure codes. Add the worker image/package pins and a small process supervisor with bounded input/output, deadline, cancellation and scratch cleanup.
4. Implement image full decode and audio full decode independently; enforce resource accounting before declaring EOF success.
5. Wire validation between structural checks and Cloudinary without changing import keys or message snapshots. Resolve transient retry/lease behavior through the existing operation contract review.
6. When testing is authorized again, add malformed/truncated corpora for every advertised format, corrupt final frames/samples, decoder crashes, oversized metadata, APNG, audio-in-video containers, cancellation, resource exhaustion and concurrent queue pressure. Verify that invalid input never reaches mocked storage. Then verify the pinned deployed image and isolated Cloudinary animation behavior.

No test commands are to be run under the current user instruction. Implementation, malformed-corpus evidence, sandbox verification and provider verification remain **BLOCKED**. A senior security review is still required before enabling the decoder path.

## Official references

- [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/): animated/page handling, pixel limits and failure policy; metadata alone is not the full decode proposed here.
- [FFmpeg documentation](https://ffmpeg.org/ffmpeg.html): probing/demuxing versus frame/sample decoding and explicit stream selection.
- [FFmpeg protocols](https://ffmpeg.org/ffmpeg-protocols.html): protocol allowlisting; this is one restriction within the proposed OS sandbox, not a substitute for it.
