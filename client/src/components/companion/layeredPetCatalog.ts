import type { CompanionSpecies } from '../../../../shared/contracts.js';
import type { PetArtRender } from './SoftPet.js';
import { petBodyForms, resolveBodyForm } from './petBodyForms.js';
import { formSockets } from './petFormSockets.js';

export type TextureFrame = readonly [number, number, number, number];
export interface LayeredPetAtlas {
  size: readonly [number, number];
  frames: readonly TextureFrame[];
  faces: readonly (readonly [number, number])[];
  bodyClips?: Partial<Record<number, string>>;
}

/** Texture coordinates are authored separately from 512×512 stage sockets. */
export const layeredPetAtlases: Partial<Record<CompanionSpecies, LayeredPetAtlas>> = {
  cat: {
    size: [1024, 1536],
    frames: [[24,47,249,312],[279,45,251,316],[535,28,234,331],[772,46,241,315],[33,363,239,360],[298,405,261,316],[549,357,259,371],[850,416,135,277],[55,742,157,275],[271,747,247,276],[583,847,167,71],[812,869,192,35],[39,1129,206,28],[353,1135,102,29],[615,1112,72,59],[890,1119,41,47],[36,1238,221,264],[346,1244,137,247],[547,1247,227,259],[814,1253,178,247]],
    faces: [[149,203],[405,203],[652,172],[893,200],[155,551],[415,554],[658,511]],
    bodyClips: {
      5: 'M298 405H542V550H559V721H298Z',
      6: 'M549 357H625V378H706V357H808V728H549Z',
    },
  },
  dog: {
    size: [1024,1536],
    frames: [[16,56,245,261],[262,65,247,254],[509,31,247,288],[757,51,253,266],[10,326,253,308],[263,374,244,260],[509,330,273,303],[844,367,131,269],[73,655,160,262],[279,680,218,229],[527,756,216,58],[803,770,178,25],[51,1059,177,22],[329,1052,114,29],[581,1048,107,66],[865,1048,51,59],[21,1221,230,265],[303,1211,173,273],[547,1248,195,230],[777,1215,228,277]],
    faces: [[140,164],[386,170],[644,145],[884,160],[145,435],[384,481],[638,433]],
    bodyClips: { 1: 'M262 65H501V252H509V319H262Z' },
  },
  frog: {
    size: [1122,1402],
    frames: [[26,112,267,201],[300,78,260,235],[568,52,250,262],[829,65,276,250],[27,337,261,290],[279,417,317,221],[594,345,238,290],[902,365,149,275],[59,663,171,248],[327,689,228,185],[601,754,218,80],[861,772,228,47],[48,1026,221,37],[359,1024,193,31],[647,1003,136,74],[946,1006,46,61],[47,1137,203,217],[364,1159,157,177],[608,1168,199,170],[900,1155,178,195]],
    faces: [[160,178],[435,186],[698,140],[968,183],[161,437],[438,484],[714,414]],
    bodyClips: { 5: 'M300 417H587V540H596V638H279V545H300Z' },
  },
  dragon: {
    size: [1024,1536],
    frames: [[39,39,258,323],[304,30,228,334],[543,9,212,356],[784,25,225,338],[31,383,254,366],[303,435,234,310],[554,382,223,366],[836,441,157,285],[51,768,177,254],[273,773,235,251],[556,868,173,73],[797,894,197,29],[35,1131,175,18],[361,1145,74,17],[616,1138,55,42],[894,1144,24,27],[31,1242,237,261],[313,1239,184,281],[538,1241,213,276],[791,1265,210,250]],
    faces: [[158,211],[406,212],[624,189],[885,211],[160,581],[412,586],[640,559]],
  },
  duck: {
    size: [1024,1536],
    frames: [[20,54,235,296],[270,56,240,299],[527,21,221,330],[768,53,241,302],[16,376,275,357],[286,452,264,292],[548,391,263,349],[830,449,154,286],[55,761,184,267],[296,786,195,222],[561,897,144,52],[795,908,174,32],[53,1129,184,25],[324,1112,131,81],[568,1104,141,97],[847,1112,92,77],[29,1243,205,250],[314,1269,181,214],[543,1281,222,213],[814,1291,188,193]],
    faces: [[145,186],[400,188],[658,112],[887,189],[193,465],[427,575],[678,474]],
    bodyClips: { 5: 'M306 452H536V600H550V744H286V600H306Z' },
  },
  spirit: {
    size: [1122,1402],
    frames: [[21,38,304,311],[327,55,236,293],[571,32,270,317],[844,57,273,292],[38,366,341,353],[383,394,314,309],[702,364,339,351],[99,736,134,234],[341,736,142,235],[581,800,152,140],[846,833,199,75],[57,1049,193,28],[329,1055,217,24],[656,1061,102,23],[920,1050,80,53],[131,1252,36,46],[300,1186,174,181],[711,1189,183,166],[508,1162,166,208],[933,1186,157,173]],
    faces: [[181,181],[448,183],[710,153],[985,183],[216,497],[551,537],[883,486]],
  },
  bunny: {
    size: [1122,1402],
    frames: [[25,47,298,282],[320,46,270,284],[582,19,271,311],[853,76,261,254],[13,340,327,324],[344,377,311,293],[658,358,347,314],[92,686,138,239],[362,687,153,242],[616,743,160,160],[863,790,215,66],[51,1040,211,21],[340,1046,205,24],[662,1043,97,26],[937,1048,75,42],[136,1254,30,36],[341,1152,186,218],[635,1180,145,152],[890,1168,197,191],[890,1168,197,191]],
    faces: [[176,169],[455,170],[723,152],[975,182],[175,467],[511,498],[830,488]],
  },
  fox: {
    size: [1122,1402],
    frames: [[48,20,221,312],[301,31,264,302],[586,12,211,331],[831,22,250,310],[44,357,251,338],[313,385,275,307],[608,358,237,344],[938,414,109,248],[59,714,167,247],[295,742,272,217],[635,814,147,50],[885,825,166,12],[86,1042,156,20],[386,1054,107,26],[673,1047,77,43],[965,1046,33,35],[38,1146,235,223],[368,1168,128,198],[629,1152,167,221],[908,1145,181,228]],
    faces: [[158,165],[421,170],[688,162],[944,164],[161,507],[428,525],[714,505]],
  },
  robot: {
    size: [1024,1536],
    frames: [[23,52,241,314],[279,54,242,312],[541,34,196,336],[766,57,244,312],[31,385,226,306],[278,411,261,271],[563,401,208,287],[839,435,134,256],[58,713,155,269],[545,728,231,238],[49,1080,173,63],[300,1085,191,42],[550,1093,187,36],[858,1104,99,39],[858,1104,99,39],[858,1104,99,39],[38,1281,197,195],[336,1271,90,197],[539,1305,195,155],[810,1287,176,174]],
    faces: [[145,220],[400,220],[640,195],[888,223],[147,525],[413,541],[661,524]],
  },
  child: {
    size: [1024,1536],
    frames: [[7,65,259,308],[277,85,242,299],[526,30,234,356],[767,81,255,304],[8,418,265,321],[277,444,242,293],[530,427,258,309],[840,480,114,234],[68,777,122,226],[317,792,156,232],[533,856,213,60],[788,875,218,24],[41,1147,183,26],[373,1155,52,19],[605,1127,71,59],[880,1156,31,35],[40,1303,195,185],[332,1296,118,191],[566,1282,173,200],[834,1327,163,160]],
    faces: [[143,245],[397,259],[640,252],[899,256],[142,589],[404,616],[662,598]],
  },
  custom: {
    size: [1122,1402],
    frames: [[15,42,308,265],[327,40,245,268],[574,37,271,270],[853,40,261,269],[40,320,396,290],[424,337,320,279],[753,326,353,288],[91,623,135,237],[387,626,146,238],[663,628,364,235],[85,930,146,50],[360,950,151,15],[622,954,186,20],[951,958,85,25],[121,1100,73,59],[405,1101,48,58],[606,1059,178,159],[869,1042,220,221],[201,1202,221,170],[707,1225,179,159]],
    faces: [[178,203],[455,206],[712,197],[990,204],[225,486],[618,497],[892,486]],
    bodyClips: { 5: 'M438 337H744V616H424V530H438Z' },
  },
};

export function layeredBodyCell(species: CompanionSpecies, render?: PetArtRender) {
  const form = resolveBodyForm(species, render?.species === species ? render.bodyForm : undefined);
  if (!form) return 0;
  return 1 + (form.style === 'nature' ? 0 : form.style === 'celestial' ? 2 : 4) + (form.body === 'agile' ? 1 : 0);
}

/** No XP-derived rolls or modulo tiers. Only existing saved IDs enter the rig. */
export function layeredGrowth(species: CompanionSpecies, render?: PetArtRender) {
  const matching = render?.species === species ? render : undefined;
  const parts = matching?.parts || {};
  const steps = (family: keyof typeof parts, max: number) => {
    const value = parts[family]?.step;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
  };
  const result = { tail: steps('tail', 2) / 2, crest: steps('crest', 2) / 2,
    paws: steps('paws', 3) / 3, wings: steps('wings', 4) / 4,
    horns: steps('horns', 4) / 4, gills: steps('gills', 4) / 4 };
  const ids = [...new Set(matching?.detailIds || []), ...new Set(matching?.precursorProgress?.detailIds || [])];
  const accepted: string[] = [];
  const counts = { tail: 0, crest: 0, wings: 0, horns: 0, gills: 0 };
  for (const id of ids) {
    const match = /^(.*)_detail_([1-9])$/.exec(id);
    if (!match) continue;
    const form = petBodyForms.find((entry) => entry.species === species && entry.id === match[1]);
    if (!form) continue;
    if (!accepted.includes(id)) accepted.push(id);
    const step = Number(match[2]);
    // Each saved stage grows one coherent family, not nine floating decorations.
    const family = step <= 3 ? 'tail' : step <= 6 ? 'crest' : form.style === 'nature' ? 'gills' : form.style === 'celestial' ? 'horns' : 'wings';
    counts[family] += 1;
  }
  // Count distinct saved IDs, not their shuffled numeric order. Every new ID
  // contributes even if the corresponding early-level part is already mature.
  for (const family of Object.keys(counts) as (keyof typeof counts)[]) {
    result[family] += Math.min(6, counts[family]) / 12;
  }
  return { ...result, accepted };
}

export function layeredBodyPlacement(species: CompanionSpecies, bodyCell: number) {
  const frame = layeredPetAtlases[species]!.frames[bodyCell]!;
  const scale = Math.min(300 / frame[2], 330 / frame[3]);
  const width = frame[2] * scale, height = frame[3] * scale;
  // Frog body cells include the feet. Other species have separate overlay feet.
  return { scale, width, height, x: (512 - width) / 2, y: (species === 'frog' ? 448 : 408) - height };
}

export function layeredSockets(species: CompanionSpecies, bodyCell: number) {
  const atlas = layeredPetAtlases[species]!;
  const frame = atlas.frames[bodyCell]!;
  const { scale, width, x: bodyX, y: bodyY } = layeredBodyPlacement(species, bodyCell);
  const [faceX, faceY] = atlas.faces[bodyCell]!;
  const x = bodyX + (faceX - frame[0]) * scale;
  const y = bodyY + (faceY - frame[1]) * scale;
  // Face landmarks are authored separately for every species/body cell.
  // This texture compositor is not an eligible server SVG rig manifest.
  const sockets = formSockets(width * .34, Math.min(365, y + 94), Math.max(105, y - 62));
  sockets.tail = { anchor: { x: 256 + width * .27, y: 382 }, pivot: { x: 256 + width * .27, y: 382 } };
  sockets.crest = { anchor: { x, y: Math.max(100, y - 70) }, pivot: { x, y: Math.max(100, y - 70) } };
  sockets.gillLeft = { anchor: { x: x - 52, y: y + 24 }, pivot: { x: x - 52, y: y + 24 } };
  sockets.gillRight = { anchor: { x: x + 52, y: y + 24 }, pivot: { x: x + 52, y: y + 24 } };
  const legLength = bodyCell > 0 && bodyCell % 2 === 0 ? 112 : 96;
  sockets.pawLeft = { anchor: { x: 207, y: 448 - legLength }, pivot: { x: 207, y: 448 - legLength } };
  sockets.pawRight = { anchor: { x: 305, y: 448 - legLength }, pivot: { x: 305, y: 448 - legLength } };
  // Long-neck ducks and narrow humanoid torsos need lower, closer wing roots;
  // ear/head bounds are not a shoulder measurement.
  const wingSpan = species === 'duck' ? 42 : species === 'child' ? 48 : species === 'robot' ? 60 : Math.min(76, width * .29);
  const wingY = species === 'duck' ? 363 : species === 'child' ? 337 : 322;
  sockets.wingLeft = { anchor: { x: 256 - wingSpan, y: wingY }, pivot: { x: 256 - wingSpan, y: wingY } };
  sockets.wingRight = { anchor: { x: 256 + wingSpan, y: wingY }, pivot: { x: 256 + wingSpan, y: wingY } };
  return sockets;
}
