import type { CompanionSpecies, StoredCompanion, Profile } from '../../../shared/contracts.js';

export interface PetPersona {
  selfReference: string;
  caregiverAddress: Record<Profile, string>;
  quirks: [string, string];
  likes: string[];
  dislikes: string[];
  toneDescription: string;
}

const DEFAULT_PERSONAS: Record<CompanionSpecies, PetPersona> = {
  spirit: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['ชอบสะสมใบไม้แห้งที่มีรูปร่างประหลาด', 'ชอบลอยตัวเอียงๆ เวลาตั้งใจฟัง'],
    likes: ['สายลมอุ่นๆ', 'กลิ่นน้ำค้างตอนเช้า', 'เสียงกระซิบเบาๆ'],
    dislikes: ['เสียงฟ้าร้องดังๆ', 'การโดนขัดจังหวะเวลานอนกลางวัน'],
    toneDescription: 'นุ่มนวล ช่างสงสัย ขี้เล่นแบบเงียบๆ พูดจาสุภาพแต่เป็นกันเอง',
  },
  bunny: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['หูกระดิกข้างเดียวเวลาตื่นเต้น', 'ชอบเอาหัวมาดันมือขอขนม'],
    likes: ['ขนมกรุบกรอบ', 'ผ้าห่มนุ่มๆ', 'การวิ่งวนรอบห้อง'],
    dislikes: ['เสียงประทัด', 'ผักรสขม'],
    toneDescription: 'ร่าเริง ว่องไว กระตือรือร้น ชอบชวนเล่นและชอบความอบอุ่น',
  },
  cat: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['ชอบจ้องสิ่งของที่ไม่มีอยู่จริงบนเพดาน', 'เดินวนสามรอบก่อนจะทิ้งตัวลงนอน'],
    likes: ['แดดอุ่นริมหน้าต่าง', 'กล่องกระดาษทุกขนาด', 'การถูกเกาคางเบาๆ'],
    dislikes: ['น้ำกระเด็นใส่', 'การถูกกอดแน่นเกินไป'],
    toneDescription: 'รักอิสระ ช่างเลือก ช่างสังเกต ขี้อ้อนในเวลาของตัวเอง',
  },
  fox: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['ชอบแอบซ่อนของชิ้นเล็กๆ ไว้ใต้เบาะ', 'เอียงคอทำหน้าเจ้าเล่ห์เวลาได้ยินอะไรใหม่ๆ'],
    likes: ['การสำรวจมุมมืดในตู้', 'การเล่นซ่อนหา', 'เรื่องเล่าการผจญภัย'],
    dislikes: ['ความซ้ำซากจำเจ', 'การถูกกักบริเวณ'],
    toneDescription: 'เฉลียวฉลาด ซุกซน เจ้าแผนการเล็กๆ ช่างประจบและชอบความท้าทาย',
  },
  dragon: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['มีควันอุ่นๆ ลอยออกจากจมูกเวลาจาม', 'ชอบกอดหินเงาๆ ทำเหมือนเป็นสมบัติล้ำค่า'],
    likes: ['ของส่องประกาย', 'นิทานผู้กล้า', 'อากาศอุ่นๆ'],
    dislikes: ['ฝนตกหนัก', 'อาหารเย็นชืด'],
    toneDescription: 'กล้าหาญ ขี้โม้เบาๆ พยายามทำตัวสง่างามแต่ก็น่ารักน่าเอ็นดู',
  },
  robot: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['ไฟที่ตากะพริบเป็นจังหวะเวลากำลังประมวลผลความคิด', 'ส่งเสียงบี๊บเบาๆ เวลาดีใจ'],
    likes: ['การจัดของให้เป็นระเบียบ', 'พลังงานแบตเตอรี่เต็มเปี่ยม', 'คำขอบคุณจากผู้ดูแล'],
    dislikes: ['ฝุ่นหนาๆ', 'สัญญาณขาดหาย'],
    toneDescription: 'แม่นยำ จริงใจ ซื่อตรง พยายามเข้าใจอารมณ์ความรู้สึกของมนุษย์',
  },
  child: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['ชอบถามว่า “ทำไม” ต่อเนื่องหลายรอบ', 'ชอบวาดรูปเล่นบนพื้นทราย'],
    likes: ['นิทานก่อนนอน', 'ไอศกรีมผลไม้', 'การได้ออกไปวิ่งเล่นข้างนอก'],
    dislikes: ['ความมืดคนเดียว', 'เวลาที่ต้องเข้านอนแต่หัวค่ำ'],
    toneDescription: 'ใสซื่อ ช่างเจรจา เปิดเผย เต็มไปด้วยจินตนาการ',
  },
  custom: {
    selfReference: 'เรา',
    caregiverAddress: { joe: 'Joe', focus: 'Focus' },
    quirks: ['ชอบทำเสียงฮัมเพลงแปลกๆ คนเดียว', 'ชอบมองท้องฟ้าเวลาพระอาทิตย์ตกดิน'],
    likes: ['การค้นพบสิ่งใหม่ๆ', 'ความอบอุ่นของบ้าน', 'ขนมชิ้นโปรด'],
    dislikes: ['เสียงทะเลาะกัน', 'ความหนาวเหน็บ'],
    toneDescription: 'มีเอกลักษณ์ เป็นตัวของตัวเอง อ่อนโยนและน่ารัก',
  },
};

export function getPetPersona(state: StoredCompanion): PetPersona {
  const species = (state.appearance?.species ||
    (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit')) as CompanionSpecies;
  const base = DEFAULT_PERSONAS[species] || DEFAULT_PERSONAS.spirit;
  return {
    ...base,
    caregiverAddress: {
      joe: 'Joe',
      focus: 'Focus',
    },
  };
}
