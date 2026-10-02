# New companion hub — 2026-10-02

Replaces the split home/settings interface with a full activity workspace.

- A compact roster header and navigation for Care, Chat, Memories, Appearance,
  and Personality. Desktop has a navigation rail; mobile has five labeled items.
- Care puts the animated habitat beside needs, followed by care actions,
  expandable growth, requests, display settings, and shared moments.
- Chat keeps its composer visible while only the conversation scrolls. Memories
  use cards; personality and inspiration share the same readable surfaces.
- The editor uses intrinsic-height blocks, not a shrinking grid inside a flex
  scroll area. Its preview retains a square artwork stage, and one workspace
  scrolls. Save feedback and reset/save actions remain sticky inside that view.
- Switching views starts a fresh scroll position. Arrow keys/Home/End navigate
  the feature buttons; Enter/Space selects. Existing modal focus trapping stays.
- Creation has a Back action to return to the hub without hatching.
- All 11 species, animation, reduced motion, voice controls, and existing
  authenticated/revision-checked actions remain. No backend/gameplay changes.
- Updated EN/TH What's New, with a fresh acknowledgment ID.

## Review

Run Vite and open `/companion-review.html` for the development-only mock fixture.
Its Axios adapter returns local data for all requests; it does not contact the
backend or Gemini, and is not an entry in the production build.

Visually reviewed care, editor, chat, journal, and personality. Editor geometry at
1440×900 and 390×844: no overlap between the preview and animation controls, no
horizontal page/content overflow. TypeScript compilation passed. No automated
test suites run. Production backend actions, all creation steps, growth reveals,
and reduced-motion/device input behavior remain unverified in this UI review.
