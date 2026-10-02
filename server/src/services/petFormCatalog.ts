import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import type { CompanionSpecies, PetFormSocket, PetFormStyle, PetSocketPose } from '../../../shared/contracts.js';

export interface AvailablePetForm {
  id: string; species: CompanionSpecies; style: PetFormStyle; body: 'compact' | 'agile';
  rendererVersion: 'pet-form-v1'; validated: true; rigPath: string; portraitPath: string;
  sockets: Record<PetFormSocket, PetSocketPose>; detailIds: string[];
}
export interface AvailablePetForms { catalogVersion: string; forms: AvailablePetForm[] }
const sockets: PetFormSocket[] = ['tail', 'crest', 'pawLeft', 'pawRight', 'wingLeft', 'wingRight', 'hornLeft', 'hornRight', 'gillLeft', 'gillRight'];
const species = ['spirit', 'bunny', 'cat', 'dog', 'frog', 'duck', 'fox', 'dragon', 'robot', 'child', 'custom'];

/** Only an explicitly validated production export with available files is eligible. */
export function loadPetForms(): AvailablePetForms {
  const root = process.env.PET_FORM_ASSET_ROOT;
  if (!root) return { catalogVersion: 'unavailable', forms: [] };
  try {
    const canonicalRoot = realpathSync(root);
    const manifest = JSON.parse(readFileSync(resolve(canonicalRoot, 'manifest.json'), 'utf8'));
    if (typeof manifest.catalogVersion !== 'string' || !Array.isArray(manifest.forms)) throw new Error('Invalid manifest.');
    const ids = new Set<string>();
    const forms = manifest.forms.filter((entry) => {
      if (!species.includes(entry.species) || !['nature', 'celestial', 'adventurer'].includes(entry.style) || !['compact', 'agile'].includes(entry.body)
        || entry.id !== `${entry.species}_${entry.style}_${entry.body}_v1` || entry.rendererVersion !== 'pet-form-v1' || entry.validated !== true || ids.has(entry.id)) return false;
      if (!Array.isArray(entry.detailIds) || entry.detailIds.length !== 9 || entry.detailIds.some((id) => typeof id !== 'string' || !id || id.length > 150)) return false;
      for (const name of sockets) for (const point of ['anchor', 'pivot']) {
        const pose = entry.sockets?.[name]?.[point];
        if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y) || pose.x < 0 || pose.x > 512 || pose.y < 0 || pose.y > 512) return false;
      }
      for (const path of [entry.rigPath, entry.portraitPath]) {
        if (typeof path !== 'string' || isAbsolute(path) || !path.endsWith('.svg')) return false;
        const resolved = realpathSync(resolve(canonicalRoot, path));
        const within = relative(canonicalRoot, resolved);
        if (within.startsWith('..') || isAbsolute(within) || !readFileSync(resolved, 'utf8').includes('<svg')) return false;
      }
      ids.add(entry.id); return true;
    });
    return { catalogVersion: manifest.catalogVersion, forms };
  } catch { return { catalogVersion: 'unavailable', forms: [] }; }
}
