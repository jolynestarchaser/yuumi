import type { CompanionSpecies, PetBodyForm } from '../../../../shared/contracts.js';
import { organicBodyForms } from './petOrganicForms.js';

import { formSockets } from './petFormSockets.js';
import type { FormSocket, FormSocketName } from './petFormSockets.js';
export { FORM_SOCKET_NAMES, formSockets } from './petFormSockets.js';
export type { FormSocket, FormSocketName } from './petFormSockets.js';
export interface AuthoredBodyForm {
  id: string;
  species: CompanionSpecies;
  style: PetBodyForm['style'];
  body: PetBodyForm['body'];
  rendererVersion: 'pet-form-v1';
  headPath: string;
  bodyPath: string;
  sockets: Record<FormSocketName, FormSocket>;
}

const sockets = formSockets;

// Individually drawn chassis contours; these drafts are not server-selection eligible yet.
const robotContours = [
  { style: 'nature', body: 'compact', headPath: 'M166 180Q146 150 180 146H332Q369 148 354 182L367 288Q372 333 332 338H180Q140 333 145 288Z', bodyPath: 'M178 310Q128 342 157 410Q172 438 256 438Q340 438 355 410Q384 342 334 310Z', sockets: sockets(108, 342, 146) },
  { style: 'nature', body: 'agile', headPath: 'M181 151Q256 116 331 151L349 282Q351 331 318 337H194Q162 331 164 282Z', bodyPath: 'M203 315L308 315Q334 341 327 408Q322 435 294 438H217Q189 435 184 408Q178 341 203 315Z', sockets: sockets(83, 336, 138) },
  { style: 'celestial', body: 'compact', headPath: 'M256 144C329 144 378 181 378 247C378 317 327 342 256 342C185 342 134 317 134 247C134 181 183 144 256 144Z', bodyPath: 'M183 316Q143 335 148 388L177 431H335L364 388Q369 335 329 316Z', sockets: sockets(111, 344, 144) },
  { style: 'celestial', body: 'agile', headPath: 'M190 139L320 139L350 180L337 310L311 340H200L174 310L161 180Z', bodyPath: 'M201 315H311L326 375L299 439H213L186 375Z', sockets: sockets(83, 333, 139) },
  { style: 'adventurer', body: 'compact', headPath: 'M145 162H365L378 183V313L357 336H155L134 313V183Z', bodyPath: 'M165 310H346L365 335V408L339 438H172L146 408V335Z', sockets: sockets(115, 345, 162) },
  { style: 'adventurer', body: 'agile', headPath: 'M176 157L209 140H303L337 157L349 295L326 334H187L163 295Z', bodyPath: 'M201 313H312L339 345L322 391L305 438H208L190 391L173 345Z', sockets: sockets(94, 345, 140) },
] satisfies Omit<AuthoredBodyForm, 'id' | 'species' | 'rendererVersion'>[];
export const robotBodyForms: AuthoredBodyForm[] = robotContours.map((form) => ({ ...form, id: `robot_${form.style}_${form.body}_v1`, species: 'robot', rendererVersion: 'pet-form-v1' }));
export const petBodyForms: AuthoredBodyForm[] = [...robotBodyForms, ...organicBodyForms];
export const FORM_CATALOG_VERSION = 'pet-forms-v1';
export function formDetailIds(form: Pick<AuthoredBodyForm, 'id'>): string[] {
  return Array.from({ length: 9 }, (_, index) => `${form.id}_detail_${index + 1}`);
}

export function resolveBodyForm(species: string, form: PetBodyForm | undefined): AuthoredBodyForm | undefined {
  if (!form || form.rendererVersion !== 'pet-form-v1') return undefined;
  return petBodyForms.find((rig) => rig.species === species && rig.id === form.id && rig.style === form.style && rig.body === form.body);
}
