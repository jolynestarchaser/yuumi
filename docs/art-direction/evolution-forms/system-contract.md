# System/art integration contract

Confirmed by the user on 2026-10-02. This contract describes integration, not completed art.

- Immutable form ID: `<species>_<nature|celestial|adventurer>_<compact|agile>_v1`.
- `bodyForm`: `{ id, style, body, chapter, rendererVersion: 'pet-form-v1' }`.
- Preserve saved `species`, `parts`, `capabilityIds`, and original `catalogVersion`.
- `detailIds` contains committed detail IDs. `precursorProgress` is
  `{ planId, fromLevel, toLevel, step, totalSteps, detailIds }`;
  steps are 1–9 in a ten-level chapter; totalSteps is 10. The endpoint commits
  the body and clears precursor progress. IDs are saved, never rolled by the client.
- Socket names: `tail`, `crest`, `pawLeft`, `pawRight`, `wingLeft`, `wingRight`,
  `hornLeft`, `hornRight`, `gillLeft`, `gillRight`. Each maps to
  `{ anchor: { x, y }, pivot: { x, y } }` in the rig's 512×512 canvas.
  Ground baseline: y=448. Each contour authors its own socket geometry.
- Robots use mechanical equivalents. Earned anatomy and abilities survive forms.
- Age is independent of chapter. Renderer age adjustments do not choose a form.

The system accepts an art export bundle through `PET_FORM_ASSET_ROOT`.
Its `manifest.json` has `{ catalogVersion, forms: [...] }`. Each form supplies
`id`, `species`, `style`, `body`, `rendererVersion`, `validated: true`,
`rigPath`, `portraitPath`, `sockets`, and nine `detailIds` supported by its rig.
Paths must be relative, contained within the bundle, and point to available SVGs.
All sockets must exist; mechanical equivalents use the same logical names.
Only those entries can be selected. Missing bundles block late content safely.
Concept images are never evidence that a production rig is available.

The art team owns rigs, portraits, manifest exports, and client rendering. The
system team owns saved contracts, selection, migration, and durable history.
