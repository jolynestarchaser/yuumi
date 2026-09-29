export type VocalizationIntent = 'idle' | 'curious' | 'thinking' | 'searching' | 'working' | 'happy' | 'confused' | 'sleepy' | 'greeting' | 'care_response' | 'success' | 'surprised' | 'wake';

export type Syllable = { sound: 'mi' | 'mii' | 'pyo' | 'kii' | 'mo' | 'nya'; duration: number; pitch: number; endPitch: number; pause?: number };

const mi = (duration: number, pitch = 1, endPitch = pitch, pause = .045): Syllable => ({ sound: 'mi', duration, pitch, endPitch, pause });
const pyo = (duration: number, pitch = 1, endPitch = pitch, pause = .045): Syllable => ({ sound: 'pyo', duration, pitch, endPitch, pause });
const kii = (duration: number, pitch = 1, endPitch = pitch, pause = .045): Syllable => ({ sound: 'kii', duration, pitch, endPitch, pause });
const mo = (duration: number, pitch = 1, endPitch = pitch, pause = .045): Syllable => ({ sound: 'mo', duration, pitch, endPitch, pause });

// A small, repeatable phonetic identity: mi / pyo / kii / mo / nya.
// Variations change the melody and rhythm, not the creature's vocabulary.
export const vocalizations: Record<VocalizationIntent, readonly (readonly Syllable[])[]> = {
  idle: [[mi(.15, .86, .94)], [mo(.18, .82, .78)], [{ sound: 'nya', duration: .16, pitch: .88, endPitch: .94 }]],
  curious: [[pyo(.16, .9, 1.14)], [mi(.12, .9, 1.12), pyo(.11, 1.1, 1.2)]],
  thinking: [[mo(.23, .76, .96)], [mi(.22, .8, 1.04)], [mo(.14, .76, .8), mi(.13, .87, 1.04)]],
  searching: [[pyo(.1, 1, 1.1), mi(.11, 1.06, 1.18)], [kii(.09, 1, 1.12), pyo(.13, 1.1, 1.18)]],
  working: [[mi(.1, .88, .9)], [kii(.12, .86, .92)]],
  happy: [[mi(.11, 1, 1.12), kii(.15, 1.13, 1.32)], [pyo(.11, 1.04, 1.16), mi(.1, 1.14, 1.23), kii(.12, 1.2, 1.34)]],
  confused: [[mo(.13, .92, .78), pyo(.16, .82, 1.08)], [mi(.1, .85, .75), pyo(.18, .78, 1.12)]],
  sleepy: [[mo(.3, .68, .62)], [{ sound: 'mii', duration: .32, pitch: .7, endPitch: .64 }]],
  greeting: [[mi(.13, .92, 1.05), pyo(.17, 1.02, 1.18)], [pyo(.14, .9, 1.08), mi(.15, 1.02, 1.16)]],
  care_response: [[mo(.13, .9, 1), mi(.18, 1, 1.16)], [mi(.12, .96, 1.06), pyo(.16, 1.04, 1.18)]],
  success: [[kii(.11, 1.05, 1.2), mi(.11, 1.16, 1.27), kii(.15, 1.2, 1.36)], [pyo(.12, 1, 1.14), mi(.16, 1.14, 1.32)]],
  surprised: [[pyo(.09, .85, 1.28)], [kii(.13, .9, 1.22)]],
  wake: [[mo(.25, .68, .84, .08), mi(.17, .9, 1.12)], [{ sound: 'mii', duration: .22, pitch: .72, endPitch: .86, pause: .08 }, pyo(.14, .98, 1.16)]],
};

export const vocalizationPriority: Record<VocalizationIntent, number> = {
  idle: 0, thinking: 1, curious: 1, searching: 1, working: 1, sleepy: 1,
  greeting: 2, happy: 2, care_response: 3, surprised: 3, wake: 3, success: 4, confused: 4,
};
