import type { CompanionSpecies } from '../../../../shared/contracts.js';

// Socket-relative contours: four discrete precursor/final steps, not scaled copies.
const feather = ['', 'M0 0Q-37-28-31 5Q-19 20 0 0Z', 'M0 0Q-63-48-52-13Q-68 14-32 22Z', 'M0 0Q-85-71-69-30Q-105-20-73 9Q-74 39-33 24Z', 'M0 0Q-112-96-88-49Q-137-43-105-7Q-132 25-76 27Q-76 56-34 30Z'];
const membrane = ['', 'M0 0L-34-26L-24 12Z', 'M0 0L-68-54L-49 3L-22 24Z', 'M0 0L-96-81L-76-18Q-57-23-48 15L-24 32Z', 'M0 0L-128-113L-109-34Q-86-42-78 6Q-45-5-43 41L-16 31Z'];
const leaf = ['', 'M0 0Q-8-44-34-30Q-45-3 0 0Z', 'M0 0Q-12-64-54-43Q-64-4 0 0Z', 'M0 0Q-22-83-68-58Q-97-24-52 9Q-26 37 0 0Z', 'M0 0Q-27-114-92-83Q-128-41-64 10Q-94 59-34 38Z'];
const fin = ['', 'M0 0L-25-20L-28 12L-8 15Z', 'M0 0L-45-43L-51 16L-16 23Z', 'M0 0L-74-61L-78 10L-57 32L-16 30Z', 'M0 0L-103-84L-109-12L-90 32L-38 48L-15 31Z'];
const cape = ['', 'M0 0Q-24-20-28 13L-8 22Z', 'M0 0Q-47-30-48 25L-12 38Z', 'M0 0Q-70-38-68 46L-39 39L-10 55Z', 'M0 0Q-105-58-94 67L-62 55L-40 76L-12 55Z'];
const petal = ['', 'M0 0Q-28-42-39-13Q-40 11 0 0Z', 'M0 0Q-28-72-55-43Q-73-15-30 17Z', 'M0 0Q-35-92-71-56Q-98-30-47 8Q-59 43-20 27Z', 'M0 0Q-38-122-95-87Q-140-42-64 7Q-96 56-42 47Z'];
const flame = ['', 'M0 0L-32-33L-22 8Z', 'M0 0L-61-60L-48-18L-48 21Z', 'M0 0L-83-87L-76-40L-103-33L-68 16L-42 33Z', 'M0 0L-112-119L-100-64L-140-61L-105-16L-120 12L-66 29L-36 45Z'];
export const speciesWingPaths: Partial<Record<CompanionSpecies, string[]>> = {
  cat: feather, dog: feather, duck: feather, dragon: membrane,
  frog: leaf, spirit: leaf, bunny: petal, fox: flame, robot: fin, child: cape,
} satisfies Partial<Record<CompanionSpecies, string[]>>;
export const robotHornPaths = ['', 'M0 0V-24H13V0Z', 'M0 0V-43H14V0Z', 'M0 0V-52H14V-18H29V-38H41V0Z', 'M0 0V-66H15V-22H31V-49H45V-13H58V-34H71V0Z'];
export const robotTailPaths = ['M0 0h20v12H0Z', 'M0 0h38v-28h15v44H0Z', 'M0 0h47v-38h18v51H0Z'];
export const robotGillPaths = ['', 'M0 0H-25V15H0Z', 'M0-8H-38V6H-15V22H0Z', 'M0-12H-48V0H-23V13H-41V25H0Z', 'M0-18H-58V-6H-24V8H-49V20H-18V34H0Z'];
export const robotPawPaths = ['M-12 0h24v29h-24Z', 'M-14 0h28v38h-28Z', 'M-15 0h30v22h-7v26H-8V22h-7Z', 'M-16 0h32v23h10v24H13V34H-13v13h-13V23h10Z'];
export const childHornPaths = ['', 'M0 0L-5-18L5-28L14-18L10 0Z', 'M0 0L-8-23L4-41L18-23L12 0Z', 'M0 0L-14-26L-2-52L15-33L28-42L23-14L12 0Z', 'M0 0L-17-29L-5-59L12-39L37-53L30-24L47-15L20-9L12 0Z'];
const webbed = ['M0 0Q-20 8-16 27L0 35L17 27Q20 8 0 0Z', 'M0 0L-24 30L-11 42L0 29L12 42L24 30Z', 'M0 0L-34 29L-23 44L-10 31L0 50L12 32L25 45L34 29Z', 'M0 0L-40 27L-27 50L-13 36L0 58L14 36L29 50L40 27Z'];
const wingtip = ['M0 0Q-15 7-9 34Q12 23 0 0Z', 'M0 0Q-21 7-18 43L3 33Q17 14 0 0Z', 'M0 0Q-30 8-25 48L-13 40L-8 51L9 33Z', 'M0 0Q-41 8-35 53L-22 44L-17 60L-2 49L5 55L19 29Z'];
const leafHand = ['M0 0Q-24 7-17 31Q8 43 0 0Z', 'M0 0Q-32 10-24 40Q14 52 0 0Z', 'M0 0Q-43 9-31 51Q23 61 0 0Z', 'M0 0Q-50 10-39 56Q-16 62-11 45Q26 60 0 0Z'];
export const speciesPawPaths: Partial<Record<CompanionSpecies, string[]>> = { robot: robotPawPaths, frog: webbed, duck: wingtip, spirit: leafHand };
export const spiritTailPaths = ['M0 0Q30 22 34-5Q30-21 18-9Z', 'M0 0Q48 33 54-12Q51-36 31-21Q15-7 40-2Q38 17 8 8Z', 'M0 0Q64 42 67-17Q65-46 42-28Q25-11 56-5Q55 24 9 9Z'];
export const dogTailPaths = ['M0 0Q35 8 28-23Q17-37 13-12Z', 'M0 0Q55 11 47-40Q26-61 26-23Q26-11 12-14Z', 'M0 0Q80 18 67-55Q46-70 43-44L36-53L27-46L31-25Q29-10 13-15Z'];
