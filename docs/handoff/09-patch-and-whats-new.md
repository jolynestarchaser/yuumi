# Patch order and What's new release plan

Status: **DRAFT RELEASE PLAN — backend reliability slice implemented locally; not a published release entry**.
Baseline: `e0531ff`. This document responds to the owner's request to update the patch/What's new information after review. Application release metadata and locale JSON are intentionally unchanged in this Markdown-only pass.

Read [07](07-review-and-required-fixes.md) for defects and [08](08-message-url-giphy-attachments.md) for the new attachment feature.

## Existing shipped-source changes

These commits are present in the reviewed local history and were previously pushed. Their presence does not prove production deployment or completion of the larger handoff:

| Commit | Change present in source | Review qualification |
| --- | --- | --- |
| `1ec6cf2` | Note autosave/recovery and atomic revision-filtered item service | Remaining draft/flush/copy/history issues in doc 07 |
| `dcf7f03` | Derived life stages, soft/pixel growth styling, stage-aware prompt, portrait action retirement | True evolution forms and shared growth rules remain incomplete |
| `271f5d7`, `7bad109` | Clickable care suggestions and need context in chat | Requests are derived, not a persisted lifecycle |
| `abf4312`–`0b0e001` | Roster API, selected actions, switcher and add flow | Identity/hatch/quota defects block declaring this complete |
| `f041b3d`, `0bebcc5` | Stage idle movement and roamer quick-care control | Care-body animation priority needs fixing |
| `d2800e9` | In-flight note sequence handling and conflict controls | Recovery and Save copy regressions still exist |
| `e0531ff` | Editable/date-bearing map pins and v2 server validation | Retry, date switching, and legacy data issues remain |

Direct URL and GIPHY attachments are **planned**, not part of any release above. Existing local GIF upload and Spotify links must not be described as this new feature.

## Why the login update notice needs work

`client/src/lib/releases.ts` still has ID `2026-09-17-travel-globe`; later feature commits did not bump it. Existing acknowledgment keys are per profile/browser, so people who dismissed that release will not automatically see another notice for the recent changes.

Preserve the existing acknowledgment behavior. On the next verified release, update the actual `currentRelease.id`, title/subtitle, feature list and EN/TH translations together. Use a unique ID tied to the actual shipped date/version, not the old ID or a guessed future version. Do not mark a release read merely because its dialog mounts.

## Patch sequence and completion criteria

| Patch | Included review tasks | Required outcome before publishing |
| --- | --- | --- |
| Reliability | N1–N3, P1–P3, M1–M4 | Correct recovery/copy/flush; no stale overwrite; safe retry/history; dates and legacy maps preserved |
| Nursery | R1–R5 | Correct per-ID screens/actions; one successful hatch; capped/idempotent creation; archive/restore; shared paid quota |
| Companion life | G1–G5, C1 | Stable needs and requests; meaningful capped XP; actual forms and celebrations; behavior fixtures; working care animations |
| Travel usability | M5 | Selection/search/filter/coordinates, accessible navigation, narrow-window controls, local camera, lazy loading |
| Media links | L1 and doc 08 | Direct media URL + GIPHY preview/send/read in letters and alerts; preserved upload/Spotify support; retry-safe sends |
| Verification/release | V1 and doc 06 | Real integration/browser evidence and frontend/backend deployed revision smoke tests |

These are independently reviewable slices, not a requirement to interrupt the owner after every tiny backend change. Integrate compatible frontend/backend functionality before calling a slice usable.

## Suggested EN/TH release copy — only use after its gates pass

Proposed release title:

- EN: **Little companions, shared adventures, and richer messages**
- TH: **น้อง ๆ ของเรา ทริปด้วยกัน และข้อความที่พิเศษขึ้น**

Proposed subtitle:

- EN: **More ways for Joe and Focus to care, plan, and share.**
- TH: **เพิ่มวิธีดูแล วางแผน และส่งความรู้สึกให้กันสำหรับโจและโฟกัส**

| Feature | English copy | Thai copy | Publish after |
| --- | --- | --- | --- |
| Notes | **Keep every little thought.** Recover drafts, save safely, and keep a separate copy when edits conflict. | **เก็บทุกความคิดเล็ก ๆ ไว้** กู้คืนร่าง บันทึกได้มั่นใจ และเก็บสำเนาแยกเมื่อแก้ไขชนกัน | Note and persistence gates |
| Nursery | **Meet your growing little family.** Create and switch companions, each with their own memories and care. | **พบครอบครัวตัวน้อยของเรา** สร้างและสลับน้อง ๆ ที่มีความทรงจำและการดูแลแยกกัน | Roster identity/hatch/quota gates |
| Care | **A snack, a game, or a hug?** Your companion can ask for care at home or while walking around. | **ขนม เล่น หรือกอดดีนะ?** น้องบอกได้ว่าอยากให้ดูแลอะไร ทั้งตอนอยู่บ้านและเดินเล่น | Stable requests and reaction gates |
| Evolution | **Watch them grow into a new form.** Race and shared care shape their appearance as they mature. | **ดูน้องเติบโตเป็นร่างใหม่** สายพันธุ์และการดูแลของเราสองคนช่วยกำหนดรูปลักษณ์เมื่อน้องโตขึ้น | Actual form/transition visual acceptance |
| Travel | **Plan our next adventure.** Add stickers and dates, edit places, and mark trips visited without losing shared changes. | **วางแผนการผจญภัยครั้งต่อไป** เพิ่มสติกเกอร์และวันที่ แก้ไขสถานที่ และทำเครื่องหมายว่าไปแล้วโดยไม่ทำข้อมูลร่วมกันหาย | Map persistence/conflict/date gates |
| Media | **Send a little more feeling.** Paste an image, GIF, or music link, or choose a GIF from GIPHY for a letter or alert. | **ส่งความรู้สึกได้มากขึ้น** วางลิงก์รูป GIF หรือเพลง หรือเลือก GIF จาก GIPHY เพื่อแนบในจดหมายหรือข้อความด่วน | Full doc 08 acceptance |

Trim the release to the rows that actually pass. Do not publish all rows automatically. Keep not-yet-delivered items in these handoff documents instead of presenting them as enabled features in the login dialog.

## Implementation tasks for the release owner

- Update `client/src/lib/releases.ts` with a fresh stable ID and only verified features. Use keys with exact EN/TH entries rather than introducing untranslated literals.
- Preserve unique feature identifiers/icons; add icons deliberately if needed by `WhatsNewDialog.tsx`.
- Update `client/src/locales/en.json` and `th.json` together and run catalog parity/interpolation checks.
- Extend `client/src/lib/releases.test.ts` for new-release detection and unchanged-release behavior. Test Joe and Focus acknowledgments independently and blocked browser storage.
- Confirm login/profile selection triggers the new notice once per profile/browser; dismiss and reopen from the top bar still work; acknowledgment occurs only on the intended user action.
- Update relevant feature specifications (19/21/22 and rich-message/notes specs), the review status, and handoff checkboxes with evidence instead of blanket complete labels.
- Run required root checks after implementation; record exact command exits, test totals, build warnings, and any deferred acceptance IDs.
- Check actual hosting build status/revision for client and server. Use synthetic designated records for authenticated smoke tests; preserve the couple's real notes, messages, pets, and pins.
- Record rollback compatibility, commit IDs, deployed revisions, browser evidence, and known limitations in the final patch entry. A successful git push alone is insufficient.

## Present review status

- The local P1/P2 backend patch now passes server typecheck and 36 server tests.
- Companion creation replay/cap/migration, shared quota, needs clock, and transactional item-write replay have focused tests.
- Client monotonic reconciliation, note recovery/copy UI, map intent recovery, URL/GIPHY integration, browser checks, real replica-set contention, production migration, and deployment remain outstanding.
- No actual release-ID change or deployment is claimed here; do not publish the proposed release copy yet.
