# Outlined pet art v1

Original SVG art authored in `client/src/components/companion/SoftPet.tsx`.
Source brief: `virtual-pet-art-handoff.md`, version 1.1, 2026-10-02.
Creator/tool: Codex, authored vector paths; no traced or external imagery, fonts,
paid generation, or external SVG resources. Rights follow the repository's ownership;
no third-party license is introduced.

The sheet shows one preview route for cat, dog, frog, dragon, and duck at Lv1–10.
Tail/crest develops at Lv2–3, paws at Lv4–6, and wings/horns/gills at Lv7–10.
Final previews retain their precursors. Saved render parts override preview defaults
and retain earlier mature parts. This renderer consumes state; it does not choose
random outcomes or grant capabilities. Lv11–30 has no new art in this delivery.

All source files have viewBox `0 0 512 512`, ground baseline `(256,448)`, named
layers, and a separate ground shadow. Outline is `#5B3D45`, nominal 10 units.
Main eyes and muzzle have independent paths. Cat keeps pointed ears and curled tail;
dog keeps folded ears and oval nose; frog keeps eye bulbs and wide mouth; dragon
keeps short muzzle, horn markers, and tail; duck keeps short beak and paddle feet.
User-selected colors remain available in the live renderer.

Sockets/source pivots: wing `(162,307)/(350,307)`, horn `(191,163)/(321,163)`,
gill `(132,298)/(380,298)`, tail `(352,378)`, paw `(152,338)/(360,338)`.
Near/far groups use mirrored local coordinates with local pivot `(0,0)`.
Equipment is not authored; no equipment compatibility is claimed.

Animation uses transforms for breath, blink, wing follow-through, feed, play, sleep,
thought, and level reveal. Animation-off and reduced motion produce static poses.
Path states swap discretely; path interpolation is not enabled.

Run `npm run art:export --prefix client` to regenerate 50 standalone editable SVGs
and `growth-review.svg`. Run `npm run test:pet-art --prefix client` for renderer
checks. The PNG is a static review export of the same SVG sheet.

Status: rigged review candidate, not production-approved random pools. The preview
metadata's candidate IDs are design placeholders, not asset approvals. Full review
of every saved final combination, 64/128/256 px readability, clipping during motion,
and raster fallbacks remains a release task. This commit does not modify game rules,
database schemas, backend progression, or XP rewards.
