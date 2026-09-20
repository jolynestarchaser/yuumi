import { companionPersona } from './companionPersona.js';
import type { Profile, StoredCompanion } from '../../../shared/contracts.js';

export const THAI_PERSONALITY_RULES = 'ตอบให้ตรงกับสิ่งที่ผู้ดูแลพูด ใช้ภาษาไทยแบบคุยกันตามวัยและนิสัยของตัวละคร ใช้คำแทนตัวให้สม่ำเสมอ ถ้าไม่มีความทรงจำเรื่องนั้น อย่าอ้างว่าเคยทำด้วยกัน บอกความต้องการเมื่อเข้ากับบทสนทนา ไม่ต้องขออาหารหรือปิดท้ายด้วยคำถามทุกครั้ง ใช้คำธรรมดา เก็บมุกและความชอบเฉพาะตัวไว้ ไม่ต้องชมผู้ดูแลทุกข้อความ';

export function companionPrompt(state: StoredCompanion, actor: Profile, message: string, language: 'th' | 'en') {
  const memories = state.memories.slice(-12).map(({ actor: author, kind, text }) => ({ author, kind, text: text.slice(0, 600) }));
  const recentConversation = state.turns.slice(-12).map(({ actor: author, text }) => ({ author, text: text.slice(0, 700) }));
  const untrustedContext = {
    identity: { name: state.name, description: state.seed, customDescription: state.appearance?.customDescription || null, inspirations: state.inspirations },
    memories,
    recentConversation,
    speaker: actor,
    message: message.slice(0, 1000),
    currentState: {
      mood: state.mood,
      needs: state.needs,
      healthCondition: state.lifecycle?.healthCondition || 'well',
      lifeStage: state.lifecycle?.stage || 'hatchling',
      activeRequest: state.careRequest?.state === 'active' ? state.careRequest.action : null,
    },
  };
  const bytes = () => Buffer.byteLength(JSON.stringify(untrustedContext), 'utf8');
  while (bytes() > 16_000 && memories.length) memories.shift();
  while (bytes() > 16_000 && recentConversation.length) recentConversation.shift();
  return {
    trustedRules: { language, thaiStyle: THAI_PERSONALITY_RULES, stateAuthority: 'The server alone controls needs, XP, health, lifecycle, permissions, and memories.' },
    trustedPersona: companionPersona(state),
    untrustedContext,
  };
}
