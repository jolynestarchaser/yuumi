# Art implementation status

## All 11 species: 66 form drafts

All species now have six authored head/body contours: nature, celestial and
adventurer styles, each with compact/agile bodies. Species-native contour accents
and distinct compact/agile feet supplement the individual body paths.
The renderer resolves the exact saved ID, species, style, body and renderer
version; it never selects or rerolls a form. Old snapshots retain base rendering.
Age scaling and existing species walking profiles remain independent.

All logical sockets have form-local anchors/pivots. Moving attachments use their
local pivot coordinates. Robots use mechanical attachments, including gills.

`npm run art:export-forms` in client exports 66 rigs and 66 portraits to
`client/public/assets/companions/forms/`, plus a manifest and review page.
Entries remain `validated: false`; no server selection, environment variable,
gameplay flag or migration is changed. The old six robot `draft-rigs/` files
are historical first-batch outputs, not the current bundle.

## Saved details deferred by user request

The user requested removal of the messy detail decoration layer on 2026-10-02.
Committed and precursor detail IDs remain intact in system contracts and saves,
but are not drawn. The saved-detail slider has been removed from art review.
The unused `PetFormDetails.tsx` implementation is shelved for redesign, not
included by the runtime renderer. Manifest detail IDs are reserved, not currently
visually supported; the exporter cannot mark the bundle validated yet.

## Concept references and remaining release gates

All eleven species have generated concept references and recorded prompts.
Robot lives in `robot-concept-v1.png`; other species live in `concepts/`.
These are references, not animated runtime assets or exact matches for the simpler
SVG rigs. The development review shows all 66 with species/style, age, level,
size, wardrobe and walking controls. Levels are positive safe integers, not capped
at ten. Review controls never mutate saved pets.

Client typecheck and structural exports pass. Final visual approval across all
sizes/age stages and the redesigned nine-detail layer remain release gates.
Automated tests were not run, as requested. No production rollout performed.
