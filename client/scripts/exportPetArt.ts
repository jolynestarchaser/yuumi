import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import SoftPet, { SOFT_PET_SPECIES, petArtPalette } from '../src/components/companion/SoftPet.js';

const output = new URL('../../docs/art-direction/pet-outline-v1/', import.meta.url);
await mkdir(output, { recursive: true });
const sheet: string[] = [];
for (const [row, species] of SOFT_PET_SPECIES.entries()) {
  for (let level = 1; level <= 10; level++) {
    const raw = renderToStaticMarkup(createElement(SoftPet, { species, level }));
    const svg = raw.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('var(--creature-body)', petArtPalette[species]).replaceAll('var(--creature-accent)', species === 'frog' ? '#AEDBF0' : '#F6A4B6').replaceAll('var(--creature-eye)', '#5B3D45');
    await writeFile(new URL(`pet_${species}_l${String(level).padStart(2, '0')}_v01.svg`, output), svg);
    sheet.push(`<g transform="translate(${(level - 1) * 145 + 10} ${row * 190 + 36})"><rect width="138" height="160" rx="16" fill="#e9e3f4"/>${svg.replace('width="256" height="256"', 'x="5" y="5" width="128" height="128"')}<text x="69" y="151" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#5B3D45">${species} · Lv${level}</text></g>`);
  }
}
await writeFile(new URL('growth-review.svg', output), `<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="990" viewBox="0 0 1460 990"><rect width="1460" height="990" fill="#FFF4DD"/><text x="20" y="24" font-family="sans-serif" font-size="16" fill="#5B3D45">Outlined pet anatomy · authored preview routes · Lv1–10 · review required</text>${sheet.join('')}</svg>`);
console.log(`Exported 50 editable SVG states and review sheet to ${fileURLToPath(output)}`);
