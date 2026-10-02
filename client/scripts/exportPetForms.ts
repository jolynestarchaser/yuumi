import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, writeFile } from 'node:fs/promises';
import SoftPet, { previewPetParts } from '../src/components/companion/SoftPet.js';
import { robotBodyForms } from '../src/components/companion/petBodyForms.js';

// Draft outputs intentionally contain no validated server manifest.
const output = new URL('../../docs/art-direction/evolution-forms/draft-rigs/', import.meta.url);
await mkdir(output, { recursive: true });
for (const form of robotBodyForms) {
  const raw = renderToStaticMarkup(createElement(SoftPet, {
    species: form.species, render: {
      species: form.species, level: 20, parts: previewPetParts(form.species, 10),
      bodyForm: { id: form.id, style: form.style, body: form.body, chapter: 1, rendererVersion: form.rendererVersion },
    },
  }));
  const svg = raw.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replaceAll('var(--creature-body)', '#AEDBF0').replaceAll('var(--creature-accent)', '#A8D9BE').replaceAll('var(--creature-eye)', '#41334D');
  await writeFile(new URL(`${form.id}.svg`, output), svg);
}
console.log(`Exported ${robotBodyForms.length} draft robot rigs; not server-selection eligible.`);
