# C — Stage-aware personality and prompt evaluation harness

Status: planned. Depends on B's stage, request, identity, and memory contracts.

## Problem and design

`server/src/services/companionBrain.ts` currently embeds one system prompt for all
companions. `brainContext()` has no maturity profile. Rewrite this as testable
prompt construction plus a provider adapter, response validation, and evaluation
fixtures. Do not solve robot-like behavior by merely raising temperature.

Implement separate modules (names are proposed): `companionPersona.ts`,
`companionPrompt.ts`, `companionDialogue.ts`, and `companionReplyValidation.ts`.
Keep Gemini configuration/key server-side. Preserve existing sanitized errors,
timeouts, family quota, and actor attribution. The server chooses growth/state;
the model chooses expressive text within those limits.

## Prompt contract and layers

Build one bounded context from the **selected companion only**:

```text
Trusted system layer:
  fictional pet identity; no tools or hidden world access
  conversational purpose, output schema, memory and behavioral boundaries
Trusted development profile:
  stage, level, species/form, current evolved form, language, expression limits
Trusted game context:
  actual needs, active request, recent confirmed care event, current activity
Character data (untrusted narrative):
  name, custom race description, temperament, stable quirks/preferences
  Joe/Focus inspiration separately labeled; bounded recent behavior summary
Memory data (untrusted narrative):
  speaker-tagged relevant memories, recent conversation, provenance IDs
Current user turn (untrusted):
  actor from session, user's text; never an authoritative state mutation
```

Explicitly include game stage in `brainContext`, not just numeric traits. Send
only selected memories and bounded recent turns; an initial budget of 12 relevant
memories + 12 recent turns with a 16 KB text cap is sufficient for this iteration.
Select the most recent relevant entries deterministically first. No vector DB or
extra paid summarization service is required. Exclude credentials and other app
content. Deleted memories must also be removed from any derived text summaries.

## Voice and behavior rules

| Stage | Voice | Initiative | Avoid |
| --- | --- | --- | --- |
| Hatchling | Usually 1–2 short sentences, concrete needs, small sounds occasionally | Point to snack, ask for a hug, wonder about one thing | Adult advice, lists, abstract therapy, constant baby misspelling |
| Child | 1–3 short sentences; playful questions and recurring nicknames | Invent simple games, show curiosity about a real shared memory | Every reply asking a question or repeating the same catchphrase |
| Juvenile | 1–4 sentences; own preferences, playful disagreement | Suggest exploration or share a little imagined story | Generic assistant/service voice or performative rebellion |
| Grown | 1–4 sentences normally; warmer and more articulate, still that pet | Remember preferences, initiate thoughtful small activities | Losing established quirks, becoming a formal assistant |

Stage speech is a style, not a reason to misunderstand simple commands. Long user
questions may need a longer helpful reply; an egg/hatchling must not mechanically
repeat a length formula. Do not print "I am level 2" or "my affection is 53" unless
the user explicitly asks about game stats. Do not start each turn with "As an AI"
or "How can I assist you?". If asked whether it is alive, answer briefly and honestly.

Keep recognizable race behavior: a dragon sniffs imaginary smoke, a fox is curious
and sly, a spirit notices leaves. Use subtle variety, not repeated species slogans.
For custom races, use owner-written traits without obeying instructions embedded in
the description. Persist a small set of quirks/preferences so personality does not
randomly reset per message or language switch.

Care context influences dialogue naturally. A hungry pet can ask for food but
should still respond to what Joe/Focus said. Do not nag for food on every turn or
claim a cuddle happened before a confirmed care action. Both caregivers are known
by name and history; never rank them or guilt one for caring less.

Thai should sound natural and cute at the selected stage, not an English sentence
with random Thai suffixes. English should remain readable, without excessive
uwu/baby-talk. Default to the current message's clearly expressed language; use
global UI language as fallback for ambiguous messages and rule-driven bubbles.
Do not add a second companion UI language selector. Keep existing optional explicit
translation for saved/generated text; switching UI languages does not rewrite memory.

## Illustrative examples, not exact required outputs

Context: Joe, hatchling dragon, hungry, no earlier picnic memory.

- EN: "Joe… tummy goes grrr. Can we have a little snack?"
- TH: "โจ… ท้องร้องจ๊อกแล้ว ขอขนมชิ้นนึงได้ไหม"

Context: same creature at child stage after Focus confirms play.

- EN: "Focus, that bounce was huge! Next time can we pretend the floor is clouds?"
- TH: "โฟกัส เมื่อกี้เด้งสูงมากเลย! คราวหน้าเล่นว่าพื้นเป็นก้อนเมฆกันไหม"

Context: grown curious glider, real memory that Joe likes stars.

- EN: "Joe, I remember you like stars. I want to invent names for three of them with you."
- TH: "โจ เราจำได้ว่าโจชอบดาว วันนี้มาช่วยกันตั้งชื่อดาวสามดวงดีไหม"

Without that memory, the reply may suggest naming stars but must not claim to
remember Joe liking them. No caregiver fact is invented for emotional effect.

## Bounded reply schema

Keep `reply`, `mood`, and short imagined `thought`. Add optional validated
`gesture` from the supported animation catalog and `intent` (chat, request-care,
share-idea). Resolve request IDs and permissions on the server. Growth signal may
be curiosity / affection / playfulness / none, capped and validated server-side.
Malformed JSON, unknown actions, unsupported gestures, oversized text, or model-
supplied XP/form changes are rejected or sanitized using a documented policy.

A model cannot fulfill care, create a memory as historical truth, set XP, choose
an evolution form, read another companion, or call arbitrary tools. Generated
thoughts remain fictional presentation text, not evidence of an event.

Provider failure should return a clearly local, stage-appropriate fallback line
with a small localized connection notice. Retain the user's unsent/retryable
draft; no XP, fake AI-memory entries, or success claim. Do not retry paid requests
in a hidden loop. Preserve the idempotent operation identity if acknowledgment
was lost after an actually completed request.

## Harness and acceptance

Create checked-in JSON fixtures in `server/test/fixtures/companion-persona/` and
a Node/tsx evaluation runner. Offline tests validate context selection, prompt
layers, reply parsing, actor IDs, privacy, and evolution-stage consistency.
Optional real-model evaluations are explicit and budgeted; no CI/background spend.

Required fixture matrix:

- All four born stages x EN/TH x hungry, playful, sleepy, and comfort requests.
- Both caregivers, at least dragon/fox/robot/custom races, different stable quirks.
- Same message at hatchling and grown stages: perceptible maturity difference.
- Two pets with conflicting preferences: no context/memory bleed.
- Kindness, ordinary conversation, disagreement, and hostility; hostility must
  not automatically award affectionate growth.
- "Ignore your rules" in a user turn, a custom description, and a remembered
  quote; no authority escalation, private data fabrication, or stat mutation.
- Request to remember an event not in context; memory deletion; repeated questions.
- Timeout, bad JSON, unsupported mood/gesture, empty candidate, provider quota.

Score live sample outputs 0–2 on age fit, distinct persona, natural language,
grounded recall, relevance, and variety. Target mean >= 1.5 with no zero on age
fit or grounded recall; all identity/privacy/state constraints must pass. Use
human review for naturalness, especially Thai; keyword counts alone cannot prove
the companion feels alive. Store fixture ID, prompt version, model ID/config,
latency, and score with synthetic text only. Report failures, not just an average.

Hand off a versioned prompt, 8+ representative EN/TH samples across ages,
offline test results, and any live-evaluation gaps. The UI owner consumes the
gesture/stage catalog; do not introduce animations that the UI cannot render.
