import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import SoftPet, { SOFT_PET_SPECIES, petArtPalette } from '../src/components/companion/SoftPet.js';

const output = new URL('../../docs/art-direction/pet-outline-v1/', import.meta.url);
await mkdir(output, { recursive: true });
const sheet: string[] = [];
const speciesSheet: string[] = [];
for (const [row, species] of SOFT_PET_SPECIES.entries()) {
  for (let level = 1; level <= 10; level++) {
    const raw = renderToStaticMarkup(createElement(SoftPet, { species, level }));
    const svg = raw.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('var(--creature-body)', petArtPalette[species]).replaceAll('var(--creature-accent)', species === 'frog' ? '#AEDBF0' : '#F6A4B6').replaceAll('var(--creature-eye)', '#5B3D45');
    await writeFile(new URL(`pet_${species}_l${String(level).padStart(2, '0')}_v01.svg`, output), svg);
    if (level === 1) speciesSheet.push(`<g transform="translate(${(row % 4) * 240 + 20} ${Math.floor(row / 4) * 250 + 50})"><rect width="220" height="235" rx="20" fill="#e9e3f4"/>${svg.replace('width="256" height="256"', 'x="10" y="5" width="200" height="200"')}<text x="110" y="220" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#5B3D45">${species === 'custom' ? 'custom · cloud base' : species === 'child' ? 'storybook child' : species === 'spirit' ? 'forest spirit' : species}</text></g>`);
    sheet.push(`<g transform="translate(${(level - 1) * 145 + 10} ${row * 190 + 36})"><rect width="138" height="160" rx="16" fill="#e9e3f4"/>${svg.replace('width="256" height="256"', 'x="5" y="5" width="128" height="128"')}<text x="69" y="151" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#5B3D45">${species} · Lv${level}</text></g>`);
  }
}
const height = SOFT_PET_SPECIES.length * 190 + 40;
await writeFile(new URL('species-review.svg', output), `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="820" viewBox="0 0 1000 820"><rect width="1000" height="820" fill="#FFF4DD"/><text x="20" y="30" font-family="sans-serif" font-size="22" fill="#5B3D45">All 11 companions · one outlined art style</text>${speciesSheet.join('')}</svg>`);
await writeFile(new URL('growth-review.svg', output), `<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="${height}" viewBox="0 0 1460 ${height}"><rect width="1460" height="${height}" fill="#FFF4DD"/><text x="20" y="24" font-family="sans-serif" font-size="16" fill="#5B3D45">Outlined pet anatomy · authored preview routes · Lv1–10 · review required</text>${sheet.join('')}</svg>`);
console.log(`Exported ${SOFT_PET_SPECIES.length * 10} editable SVG states and review sheet to ${fileURLToPath(output)}`);
