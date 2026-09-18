# Letters and alerts: paste a media URL or choose a GIPHY GIF

Status: **SPECIFIED, NOT IMPLEMENTED**. Follow-up to the owner's request during the review of `e0531ff`. This document is the implementation handoff, not a claim that the composer already supports these sources.

Related: [review findings](07-review-and-required-fixes.md), [patch/release plan](09-patch-and-whats-new.md), and [letter/alert experience](../../18-letter-alert-experience.md).

## Requested behavior and scope

Joe and Focus can attach media to either a **letter** or an **alert** by uploading a file, pasting a public media URL, pasting a GIPHY link, selecting a GIF from a GIPHY picker, or using the existing Spotify link field. Preview the selected attachment before sending. The recipient sees the same attachment after reopening the message or refreshing.

Interpret “URL path” as an absolute public HTTPS media link, including paths such as `https://example.org/photos/us.gif`. A Windows path, `file:` URL, relative path, or temporary `blob:` URL cannot be shared with the other person's browser; show a localized “Choose a file from your device” action instead. Do not attempt to read a local path automatically.

Keep the existing single-attachment message contract for this release. Replacing a source replaces the draft attachment visibly. Multi-file galleries, arbitrary webpage embeds, video uploads, and provider subscriptions are outside this slice. Existing uploaded images/GIFs/audio and Spotify messages remain readable.

## Current implementation to extend

| File | Current behavior / task |
| --- | --- |
| `client/src/components/MessageCenter.tsx` | File chooser and Spotify input; one submit flow for letter/alert; inline image/audio/Spotify renderer. Extract a shared attachment composer and renderer before adding modes. |
| `client/src/store/desktopStore.ts` | Upload and send calls. Add typed attachment resolution functions, leaving existing callers compatible. |
| `shared/contracts.d.ts` | MessageAttachment includes hosted image/audio and Spotify; add separate source/input/output types. |
| `server/src/routes/messages.ts` | Multipart upload, client-metadata normalization, message save; needs immutable retry semantics and trusted attachment references. |
| `server/src/models/Message.ts` | Persisted attachment union requires migration-compatible extension. |
| `server/src/routes/linkPreview.ts` | Inspect existing URL/network protections for reusable primitives; do not assume metadata parsing makes downloading safe. |
| `client/src/locales/en.json`, `th.json` | All new copy/errors must be paired here. |
| `client/src/lib/releases.ts`, `components/WhatsNewDialog.tsx` | Announce this only after the feature is working; see doc 09. |

Current uploaded media normalization trusts caller-supplied HTTPS URL, bytes, and MIME metadata. Do not extend it by accepting arbitrary claimed metadata for imported attachments. Message retry currently allocates a new operation ID on each attempt and can reupload; repair that as part of the new send pipeline.

## Composer flow

1. Show source buttons: **Upload**, **Paste link**, **GIPHY**, **Spotify**. Both message kinds use the same component.
2. Paste link accepts direct image/GIF/audio HTTPS URLs, GIPHY share/media URLs, or Spotify URLs. Explicit **Preview link** starts validation/resolution; ordinary pasted body text stays body text.
3. While resolving, show a cancellable pending state and disable sending that unresolved attachment. Do not discard the message subject/body.
4. Preview successful media with name/alt text, source, and Remove/Replace controls. Audio is user-played; GIFs offer a static/reduced-motion view and play/pause behavior through a suitable renderer.
5. GIPHY mode offers search, results, paging, selection, loading/empty/error states, and required source attribution. Search only the typed query; never send letter text, companion memories, profile details, or desktop content to GIF search.
6. Send supports attachment-only messages. Allocate one operation ID for the exact message snapshot and keep it through a network retry. Freeze that submitted snapshot while allowing a separate later draft if needed.
7. A failed resolution/send retains the original draft and selected source. A delayed result for URL A cannot replace URL B after editing. Cancel must invalidate stale work and revoke local preview object URLs.
8. The incoming alert keeps the existing compact “attachment included” cue. Opening the alert or letter displays the attachment in its detail view, without sound autoplay.

## Attachment contract proposal

Finalize the shared TypeScript union before assigning frontend/backend implementations. Avoid overloading hosted image metadata with unverified remote data.

```ts
type AttachmentSourceInput =
  | { source: 'upload'; attachmentId: string }
  | { source: 'url'; url: string }
  | { source: 'giphy'; gifId: string }
  | { source: 'spotify'; spotifyUrl: string };

type ResolvedAttachment =
  | {
      kind: 'image' | 'audio';
      source: 'upload' | 'url';
      attachmentId: string;
      secureUrl: string;
      name: string;
      mimeType: string;
      bytes: number;
      duration?: number | null;
    }
  | { kind: 'giphy'; provider: 'giphy'; gifId: string; name: string }
  | { kind: 'spotify'; spotifyUrl: string; embedUrl: string; name: string };
```

Hosted metadata is server-owned after upload/import and referenced by an opaque attachment ID scoped to the shared desktop. The input cannot select an arbitrary hosted URL by asserting a safe MIME type. Keep legacy payload support behind an explicit compatibility normalization path; do not rewrite all historical messages.

For GIPHY messages, persist provider identity and GIF ID, not a copy of its asset or a cached rendition URL. Resolve media for display using the provider integration; show a useful unavailable state if removed. The name/label is display-only and must never authorize media fetching or script/HTML rendering.

## Ordinary media URL import

Proposed authenticated endpoint: `POST /api/messages/attachment-url`, accepting `{ url, operationId }`, returning a resolved attachment or a bounded structured error. Reuse the current 10 MiB media ceiling and supported image/audio MIME list.

- Parse with URL; require HTTPS, reject embedded credentials, excessive input length, local/private/loopback/link-local/reserved network destinations, and unsupported ports. Resolve all A/AAAA results and prevent DNS rebinding by connecting to the validated address with correct TLS hostname verification. Validate every redirect hop; cap redirects (proposed 3).
- Use explicit connect/read/overall timeouts and cancellation. Stream with an enforced byte cap regardless of Content-Length, chunking, or compression. Do not download an unbounded body into memory.
- Verify supported file signatures and actual decodability/dimensions; do not trust extension or response Content-Type alone. Bound animated-image dimensions/frame/resource cost. Reject HTML login pages, SVG/script-bearing payloads, and unsupported media with a friendly message.
- Forward no app cookies, session tokens, or authorization to the remote host. Redact signed URL query values from logs. Bind imported results to authenticated ownership so callers cannot reference another upload by guessing an ID.
- Store allowed non-GIPHY imported media using the existing hosted media path, preserving animation. Record verified output size/MIME and a safe display name. Avoid persisting sensitive source-query credentials.
- Rate-limit and deduplicate import operations across server instances. Retry of a completed import returns the same attachment; define expiry/cleanup for newly created unattached assets without deleting old messages or existing user uploads.
- GIPHY sources must be routed to the GIPHY adapter before generic import. Do not use the generic importer to copy provider assets.

Suggested error codes: `INVALID_URL`, `UNSUPPORTED_SOURCE`, `UNSUPPORTED_MEDIA`, `MEDIA_TOO_LARGE`, `MEDIA_UNAVAILABLE`, `MEDIA_TIMEOUT`, `RATE_LIMITED`. Return localized product copy from codes; do not show stack traces or raw upstream errors.

## GIPHY provider integration

The official API documents require direct client requests, visible attribution, unchanged returned media URLs, and no media/URL caching without special approval. They provide Search, Trending, and Get GIF by ID. Accordingly, this plan uses a browser-specific GIPHY integration and ID-based persisted references, not a server proxy or Cloudinary reupload. Use a dedicated web API key for this integration; it is separate from the server-only Gemini and Cloudinary credentials. Confirm the dashboard's current limits/configuration before rollout. [Official GIPHY API documentation](https://developers.giphy.com/docs/api/).

Product implementation requirements:

- Accept canonical GIPHY share links and recognized media links by extracting a validated GIF ID; never render user-provided iframe HTML. Unsupported/ambiguous link formats get a helpful error instead of speculative scraping.
- Fetch provider metadata for the chosen ID using the dedicated browser integration. Treat display fields as untrusted text. A provider failure cannot mutate or mark the message sent.
- Keep search transient, debounce it, cancel stale requests, and bound result counts. Use provider-supported language/rating options appropriate to the app. Resolve the recipient's media lazily when opening the message.
- Distinguish configured/unconfigured states. Direct URL and file attachments continue working when the GIF picker is unavailable. Do not ask the user to paste service credentials into message forms.
- Implement a static preview/reduced-motion fallback and explicit media error fallback. Do not claim a removed GIF is available merely because its ID is stored.
- Verify current provider rules again before implementation if they have changed; this document does not authorize extra subscriptions or external account changes.

## Send idempotency and ownership

Use one stable operation ID per submitted draft and sender-scoped uniqueness. On replay, return the original saved message rather than overwriting its sender/body/attachment. A different payload under the same operation ID returns a conflict. Validate the recipient from the permitted Joe/Focus pair and sender from the authenticated profile.

Do not reupload/reimport the same attachment on a plain send retry. Attachment resolution and message submission are separate acknowledged operations. A retry must not add an extra unread message or repeated notification. Ensure an expired/different profile session cannot send a prior user's in-progress draft.

## EN/TH copy to add

| Key / English | Thai |
| --- | --- |
| Paste media link | วางลิงก์รูป GIF หรือเพลง |
| Paste an image, GIF, audio, GIPHY, or Spotify link | วางลิงก์รูป GIF ไฟล์เสียง GIPHY หรือ Spotify |
| Preview link | ดูตัวอย่างจากลิงก์ |
| Checking attachment… | กำลังตรวจสอบไฟล์แนบ… |
| Search GIPHY | ค้นหา GIF ใน GIPHY |
| Remove attachment | ลบไฟล์แนบ |
| This link is not a supported media file. | ลิงก์นี้ไม่ใช่ไฟล์สื่อที่รองรับ |
| Choose a file from your device instead. | กรุณาเลือกไฟล์จากอุปกรณ์แทน |
| This attachment is unavailable. Your message is still here. | ไฟล์แนบนี้ใช้งานไม่ได้ แต่ข้อความของคุณยังอยู่ |
| Could not send. Your draft and attachment are saved for retry. | ส่งไม่สำเร็จ เก็บร่างข้อความและไฟล์แนบไว้ให้ลองอีกครั้งแล้ว |

Only use “saved for retry” once that recovery behavior is actually implemented and tested. Provider attribution should use the approved provider branding, not a fabricated localized logo.

## Acceptance gates

- [ ] Joe sends a letter and Focus sends an alert with a direct JPG/PNG/WebP/GIF URL; recipient renders it after refresh.
- [ ] Supported audio URL previews and plays only on user action; Spotify behavior remains intact.
- [ ] GIPHY share link, supported media link, and picker selection resolve to the same stable GIF identity; no API key prompts in the composer.
- [ ] One attachment replaces another predictably; attachment-only messages work; removed attachments do not reappear after a delayed request.
- [ ] Invalid URL, filesystem path, HTML page, unsupported type, fake MIME, large/chunked file, redirect loop, and timeout preserve draft text and show localized errors.
- [ ] Network fetch tests block private IPv4/IPv6, redirect-to-private, DNS rebinding, and credential forwarding without contacting real internal services.
- [ ] Lost import response, lost send response, double-click, and exact retry result in one asset/message; altered replay cannot overwrite a sent message.
- [ ] Removed GIF/remote media yields a graceful reader fallback; no blank inaccessible player.
- [ ] EN/TH, 360px layout, keyboard selection, reduced motion, and muted audio verified in both letter and alert journeys.
- [ ] Legacy uploaded media/Spotify messages still render; no destructive data migration.
- [ ] Tests are registered in actual package scripts; API tests use mocked network/provider responses and disposable data.
- [ ] Update notification follows doc 09 only after the feature and deployed revision pass smoke testing.
