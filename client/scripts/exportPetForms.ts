import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import SoftPet, { petArtPalette, previewPetParts, SOFT_PET_SPECIES } from '../src/components/companion/SoftPet.js';
import { FORM_CATALOG_VERSION, FORM_SOCKET_NAMES, formDetailIds, petBodyForms } from '../src/components/companion/petBodyForms.js';
import { speciesArtKits } from '../src/components/companion/speciesArtKit.js';

// Validation is an explicit release gate after visual review, never inferred from generation.
// Detail visuals are deferred at the user's request; do not release this bundle yet.
const validated = false;
const output = new URL('../public/assets/companions/forms/', import.meta.url);
await mkdir(new URL('rigs/', output), { recursive: true });
await mkdir(new URL('portraits/', output), { recursive: true });
const animationCss = await readFile(new URL('../src/components/companion/pet-art.css', import.meta.url), 'utf8');
const seen = new Set<string>();
const manifest = { catalogVersion: FORM_CATALOG_VERSION, forms: [] };
const review: string[] = [];
if (petBodyForms.length !== 66) throw new Error('Expected all 66 authored forms.');
for (const species of SOFT_PET_SPECIES) {
  const forms = petBodyForms.filter((form) => form.species === species);
  if (forms.length !== 6 || new Set(forms.map((form) => form.headPath)).size !== 6 || new Set(forms.map((form) => form.bodyPath)).size !== 6) throw new Error(`Incomplete/distinct contours: ${species}`);
}
for (const form of petBodyForms) {
  if (seen.has(form.id) || form.id !== `${form.species}_${form.style}_${form.body}_v1`) throw new Error(`Invalid ID: ${form.id}`);
  seen.add(form.id);
  for (const name of FORM_SOCKET_NAMES) {
    for (const point of [form.sockets[name].anchor, form.sockets[name].pivot]) {
      if (![point.x, point.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 512)) throw new Error(`Invalid socket: ${form.id}/${name}`);
    }
  }
  const detailIds = formDetailIds(form);
  const props = { species: form.species, render: {
    species: form.species, level: 20, parts: previewPetParts(form.species, 10),
    bodyForm: { id: form.id, style: form.style, body: form.body, chapter: 1, rendererVersion: form.rendererVersion }, detailIds,
  } };
  const raw = renderToStaticMarkup(createElement(SoftPet, props));
  const accent = form.style === 'nature' ? '#A8D9BE' : form.style === 'celestial' ? '#C5B6E8' : '#FFBD77';
  const svg = raw.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replaceAll('var(--creature-body)', petArtPalette[form.species]).replaceAll('var(--creature-accent)', accent).replaceAll('var(--creature-eye)', '#41334D');
  if (!svg.includes(`data-form-id="${form.id}"`)) throw new Error(`Renderer did not resolve form: ${form.id}`);
  const rigPath = `rigs/${form.id}.svg`;
  const portraitPath = `portraits/${form.id}.svg`;
  await writeFile(new URL(rigPath, output), svg.replace('>', `><style>${animationCss}</style>`));
  await writeFile(new URL(portraitPath, output), svg);
  manifest.forms.push({ id: form.id, species: form.species, style: form.style, body: form.body, rendererVersion: form.rendererVersion, validated, rigPath, portraitPath, sockets: form.sockets, detailIds, gait: speciesArtKits[form.species].gait });
  review.push(`<article><h2>${form.species} · ${form.style} · ${form.body}</h2><img src="${portraitPath}" alt="${form.id}" width="256" height="256"><code>${form.id}</code></article>`);
}
await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('review.html', output), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>66 evolution rigs</title><style>body{font-family:system-ui;background:#faf5ff;color:#392b48;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px}article{background:#f0eaf5;border-radius:20px;padding:16px}h2{font-size:16px}img{display:block;margin:auto}code{font-size:10px}</style><h1>66 authored evolution forms</h1><p>Actual rig portraits · original species retained · validation: ${validated}</p><main>${review.join('')}</main></html>`);
console.log(`Exported ${petBodyForms.length} rigs, portraits and manifest; validated=${validated}. No gameplay flag or server environment changed.`);
