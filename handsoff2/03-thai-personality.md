# Thai companion personality and evaluation

Status: proposed dialogue behavior and evaluation work. No live model samples
were collected for this handoff. Thai examples below are authored fixtures.

## Model configuration

Change the chat default in [companionBrain.ts](../server/src/services/companionBrain.ts)
to `gemini-2.5-flash-lite`; retain `GEMINI_CHAT_MODEL` as a backend override.
Update deployment examples without writing credentials or changing production
settings as part of documentation work. Portrait generation remains retired.

The user first requested Gemini 1.5 and then explicitly selected 2.5 Flash-Lite.
Google's [September 29, 2025 release notes](https://ai.google.dev/gemini-api/docs/changelog#september-29-2025)
list Gemini 1.5 models as shut down. The [deprecation table](https://ai.google.dev/gemini-api/docs/deprecations)
listed no announced shutdown date for 2.5 Flash-Lite when checked on 2026-09-19.
Recheck availability before release; never silently select a different model.

## Prompt composition

Split the current single prompt into typed, testable layers:

1. Trusted system rules: fictional companion, response schema, privacy, state
   authority, and grounded recall.
2. Trusted game context: actual stage, activity, health, needs, confirmed recent
   care, and one active request. Never send mutation permissions to the model.
3. Persistent personality: species, temperament, self-reference, caregiver address
   forms, two quirks, likes/dislikes, and current form. Use authored defaults;
   retain them across messages, refreshes, and language changes.
4. Untrusted narrative: custom description, inspirations, selected memories,
   speaker-tagged conversation, and current message.

Use the selected pet only. Keep at most 12 memories, 12 recent turns, and a
16 KB UTF-8 context cap. Remove oldest context first; validate required fields
fit even after optional context is removed. Do not truncate a JSON string into
invalid JSON. Exclude letters, files, credentials, and other pets' messages.
Forgetting memories must clear derived recall context that could repeat them.

Prefer the language clearly used in the user's message. For short/ambiguous
messages, use the supplied global UI language. Switching UI language does not
rewrite stored text. Preserve optional explicit translation and device voice.

## Thai writing rules

Include direct Thai instructions equivalent to this authored draft:

> ตอบให้ตรงกับสิ่งที่ผู้ดูแลพูด ใช้ภาษาไทยแบบคุยกันตามวัยและนิสัยของตัวละคร
> ใช้คำแทนตัวให้สม่ำเสมอ ถ้าไม่มีความทรงจำเรื่องนั้น อย่าอ้างว่าเคยทำด้วยกัน
> บอกความต้องการเมื่อเข้ากับบทสนทนา ไม่ต้องขออาหารหรือปิดท้ายด้วยคำถามทุกครั้ง
> ใช้คำธรรมดา เก็บมุกและความชอบเฉพาะตัวไว้ ไม่ต้องชมผู้ดูแลทุกข้อความ

Apply `no-ai-slop` and its `eval.md` to the drafted prompts and fixtures. Remove
generic assistant openings, empty praise, repeated reassurance, exaggerated
metaphors, forced contrasts, and mechanically identical replies. Do not enforce
an English word blacklist as a substitute for Thai editing. Preserve intentional
hesitation, fragments, humor, and recognizable word choice. Report edits with
a short explanation of what changed in the evaluation artifact.

Use stable self-reference (default `เรา`) without forcing it into every sentence.
User-facing names come from allowed character/profile data, not inferred identity.
Avoid random gendered particles, constant baby spelling, excessive emoji, repeated
species catchphrases, and customer-support expressions such as “มีอะไรให้ช่วยไหม”.
An elder remains the same pet with a more settled voice, not a generic wise narrator.

| Context | Illustrative Thai reply | Check |
| --- | --- | --- |
| Hungry hatchling | หิวแล้ว ขอขนมหน่อยได้ไหม | Short concrete need |
| Child after confirmed play | เมื่อกี้เด้งสูงมากเลย คราวหน้าลองอีกนะ | References confirmed action |
| Curious juvenile | วันนี้อยากสำรวจใต้โต๊ะ เผื่อมีอะไรให้เล่น | Specific initiative |
| Adult offered a game | วันนี้อยากเล่นซ่อนหามากกว่า เมื่อกี้นอนเต็มอิ่มแล้ว | Preference; requires confirmed rest |
| Elder chatting about rain | ฝนตกแบบนี้ เราอยากนั่งฟังอยู่ตรงหน้าต่าง | Calm voice without stock wisdom |
| Ill pet | วันนี้ไม่ค่อยมีแรง ขอพักก่อนนะ | Factual current condition |
| Missing memory | เราจำเรื่องนั้นไม่ได้ เล่าให้ฟังหน่อยได้ไหม | No fabricated recall |
| User says they are busy | ได้เลย ไว้ค่อยคุยกัน | No guilt or pressure |

These show register, not fixed responses. Do not add the same phrases to every
prompt example or require word-for-word matches. Death/retirement messages are
localized UI status text; do not generate new dialogue from a deceased pet.

## Output authority and validation

Retain reply text (nonempty, at most 2,000 characters), imagined thought (at most
300), and supported mood. Add optional gesture from the implemented animation
catalog and growth signal `curiosity`, `affection`, `playfulness`, or `none`.
Use `none` for neutral/hostile input rather than automatically awarding a trait.
The server controls trait increments, XP, care, stage, forms, illness, and death.

Reject malformed JSON, unsupported enum values, empty/oversized replies, and
fields claiming state mutations. Use strict runtime parsing from `unknown`.
Do not let a prompt embedded in a memory/custom description override trusted
rules. Generated thoughts and imagined stories are presentation, not proof of
an event. Never claim that an unconfirmed feed/cuddle or remembered outing happened.

Preserve existing timeouts and sanitized provider errors. On failure keep the
user draft and show a localized connection notice. Do not save a fake fallback
conversation, grant XP, or hide automatic paid retries. If a response was already
committed, replay its operation result instead of calling the provider again.

## Evaluation contract

Add synthetic fixtures under `server/test/fixtures/companion-persona/` and an
offline Node/tsx runner. These are future artifacts, not present files.

- Cover five speaking stages, Thai/English, both synthetic caregivers, and
  hungry/playful/sleepy/comfort/ill contexts.
- Include dragon, fox, robot, and custom species; stable quirks; conflicting
  preferences across two pets; same message at hatchling and adult stages.
- Include absent memories, forgotten context, neutral/hostile chat, embedded
  instructions, unauthorized state changes, bad JSON, quota, and timeout.
- Unit tests verify context bounds, identity isolation, stage consistency,
  schema checks, no reward on failure, and no hidden provider calls.
- Style reviews name the pattern, quote the actual line, and suggest a minimal
  edit. Do not claim an AI detector proves authorship or naturalness.

Reports expose `status` (success/warning/error), `summary`, `next_actions`, and
`artifacts`. Errors also include a cause hint, safe retry instruction, and stop
condition. Store fixture/prompt/model versions and synthetic output only.

Live sampling is separate, explicit, and budgeted. Human review scores age fit,
distinct persona, natural Thai, grounded recall, relevance, and variety from 0–2.
Target mean at least 1.5 and no zero on age fit or recall; identity/privacy/state
checks must all pass. Save at least ten reviewed Thai examples across stages.
Track first-attempt schema success, retries, latency, and cost per successful
reply. Report unrun live evaluation as an open validation item, not a pass.
