# Art implementation status

## First batch: robot chassis

Six individually authored head/body contours implement nature, celestial and
adventurer styles with compact/agile bodies. The renderer resolves the exact
saved ID, style, body and renderer version; it does not select or reroll a form.
Development review exposes the six drafts without editing saved pets.

These are drafts, not validated server assets. No manifest marks them eligible.
Tail, paws, wings, horns and gills now use form-local socket anchors. Six draft
SVGs are exported under `draft-rigs/` using `npm run art:export-forms` in client.
The generated robot concept and exact prompt are saved alongside this note.

Remaining work: crest and pivot-aware animation wiring, nine authored detail IDs per rig,
validated rig/portrait bundles, visual inspection at all age stages and sizes,
and the other ten species (60 forms). Unknown rigs retain the existing base
renderer. No backend selection or migration is changed by this art batch.

Age and existing walking classes remain separate from body selection.
