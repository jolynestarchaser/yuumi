# Implementation Plan — React 19 · Tailwind · shadcn/ui · Animate UI

สถานะ: Planned

ย้าย UI ทั้งระบบทีละส่วนตามลำดับด้านล่าง เปลี่ยนสถานะแต่ละ phase เป็น Implemented พร้อม commit hash เมื่องานส่วนนั้นเสร็จจริง

## Phase 1 — กำหนดโครงสร้าง migration

สถานะ: Planned

- [ ] ย้าย UI ทั้งระบบทีละส่วน โดยใช้ JavaScript/JSX, Vite, Zustand และ dnd-kit ต่อไป
- [ ] แบ่งหน้าที่: `components/ui` สำหรับ shadcn, `components/animate-ui` สำหรับ Animate UI และ shared components สำหรับหน้าต่าง/ฟอร์มของ Yuu & Mi
- [ ] ให้ UI component รับ props และ callback; ให้ hooks/store จัดการข้อมูล และ pure functions จัดการพิกัดกับการรวม state ตามหลัก DRY/SOLID
- [ ] บันทึก ADR เรื่อง incremental migration, CSS layers และ animation ownership พร้อมเหตุผลและผลกระทบ
- [ ] คง HTTP API, Socket.IO events, schema, revision และข้อมูลตำแหน่งเดิมทั้งหมด
- [ ] แยก commit ตาม phase; แต่ละ phase ต้องเปลี่ยนกลับได้โดยไม่แก้ข้อมูลในฐานข้อมูล

Commit ที่วางแผนไว้: `docs: define frontend migration phases`

## Phase 2 — อัปเกรด React 19

สถานะ: Planned

- [ ] อัป `react` และ `react-dom` เป็น stable release ในสาย 19 โดยใช้เวอร์ชันเดียวกันและบันทึกใน lockfile
- [ ] ตรวจ peer dependencies ของ dnd-kit, Zustand, Lucide และ Vite plugin; อัปเฉพาะ package ที่จำเป็น หลีกเลี่ยง `--force` และ `--legacy-peer-deps`
- [ ] ใช้ modern JSX transform และคง `createRoot` กับ StrictMode ตาม [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [ ] ปรับ ref callback, effect cleanup และ API ที่เลิกใช้เฉพาะจุดที่พบจริง
- [ ] ให้การ mount ซ้ำไม่สร้าง socket, timer, audio context หรือ event listener ซ้ำ

Commit ที่วางแผนไว้: `chore: migrate frontend to react 19`

## Phase 3 — ติดตั้ง Tailwind และ design tokens

สถานะ: Planned

- [ ] ติดตั้ง Tailwind 4.1+ กับ `@tailwindcss/vite` ตาม [แนวทาง Vite](https://tailwindcss.com/docs/installation/using-vite) และเพิ่ม alias `@` ไปยัง `client/src`
- [ ] จัด CSS layers เป็น `theme → base → legacy → components → utilities`; นำ CSS เก่าเข้า `legacy` เพื่อให้ Tailwind utilities override ได้ตามลำดับ
- [ ] ช่วงเปลี่ยนผ่านใช้ reset เดิมก่อน และเปิด Tailwind Preflight ใน phase เก็บงานหลังย้าย UI ทั่วไปครบ
- [ ] รวมสีหลักเป็น tokens: Neon `#b6ff00`, Royal blue `#2453ff`, Navy `#06113e`, White `#eff5ff`, Pink `#ff8fa5`
- [ ] ใช้ Manrope สำหรับเนื้อหา/หัวข้อ และ DM Mono สำหรับข้อมูลประกอบ พร้อม tokens ของ radius, glass blur, shadow และ focus ring
- [ ] ค่าสีจากผู้ใช้, wallpaper และพิกัดใช้ CSS variables/inline styles; ไม่ประกอบชื่อ Tailwind class จากข้อมูล runtime
- [ ] รองรับความกว้าง 320px ขึ้นไป, `dvh`, safe-area และ toolbar แบบเลื่อนแนวนอนบนมือถือ

Commit ที่วางแผนไว้: `feat: introduce tailwind and desktop design tokens`

## Phase 4 — วาง shared components ด้วย shadcn/ui

สถานะ: Planned

- [ ] ตั้ง shadcn สำหรับ Vite เดิม: JavaScript (`tsx: false`), CSS variables, Radix primitives และ Lucide ตาม [เอกสารติดตั้ง](https://ui.shadcn.com/docs/installation/vite)
- [ ] เพิ่มเฉพาะ Button, Input, Textarea, Label, Dialog, AlertDialog, Tooltip, Tabs, Select, Slider, Switch และ ContextMenu
- [ ] สร้าง `cn()` ด้วย `clsx` และ `tailwind-merge`; รวม variants ของปุ่ม/พื้นผิวไว้ส่วนกลาง
- [ ] คง interface ของ `GlassDialog` ได้แก่ `title`, `eyebrow`, `onClose`, `children`, `actions`, `className` แล้วเปลี่ยน implementation ภายในเป็น Radix Dialog
- [ ] ใช้ AlertDialog สำหรับการยืนยันลบ; ใช้ Dialog สำหรับจดหมายที่กดเปิดทีหลังหรือปิดด้วย Escape ได้
- [ ] จัดการ focus trap, focus restoration และ nested dialogs ผ่าน primitive เดียว ไม่ซ้อน keyboard listeners ของระบบเก่า

Commit ที่วางแผนไว้: `feat: introduce shared shadcn ui components`

## Phase 5 — ย้ายฟอร์มและ popup ไป Tailwind

สถานะ: Planned

- [ ] ย้ายตามลำดับ: PIN/เลือก Joe–Focus → Add URL → Confirm/Trash → History → Appearance/Icon picker → Letters & Alerts
- [ ] ใช้ shared components และแทน layout, spacing, typography, borders, responsive rules ด้วย Tailwind
- [ ] คง Joe สี Neon และ Focus สี Royal blue; รักษา desktop glassmorphism และ popup จดหมายแบบ macOS กลางจอ
- [ ] ปรับ icon picker เป็นวงกลมสัดส่วน 1:1, รองรับสีอิสระและ keyboard selection; คงค่า icon key/emoji ที่บันทึกไว้
- [ ] รวม overlay tokens: desktop windows อยู่ใน stacking context ของตัวเอง ส่วน modal และ notification portal อยู่เหนือหน้าต่าง
- [ ] เนื้อหายาวเลื่อนภายใน popup ได้ พร้อมปุ่มหลักที่เข้าถึงได้บนมือถือและจอแนวนอน
- [ ] ลบ selector เก่าของแต่ละ component เมื่อย้ายเสร็จ เพื่อลด style ซ้ำ

Commit ที่วางแผนไว้: `refactor: migrate forms and dialogs to tailwind`

## Phase 6 — เพิ่ม Animate UI และ Motion

สถานะ: Planned

- [ ] ใช้ Motion 12.23+ และนำ Animate UI จาก registry เข้ามาเป็น source component ภายในโปรเจ็กต์ ตาม [การติดตั้ง](https://animate-ui.com/docs/installation) และ [เวอร์ชันที่แนะนำ](https://animate-ui.com/docs/troubleshooting)
- [ ] เริ่มด้วย Animate UI Radix Dialog, animated Button และ animated icons ที่ใช้จริง; แปลง source เป็น JSX เมื่อจำเป็นและคง license/attribution
- [ ] ให้ shared dialog ใช้ Animate UI แทน implementation ของ Radix เดิม โดยรักษา props contract จาก Phase 4
- [ ] กำหนด motion กลาง: popup เข้าแบบ spring, ออกแบบ fade, ปุ่ม hover/tap และ icon เล่นหนึ่งครั้งเมื่อข้อความมาถึง
- [ ] ให้ Motion เป็นเจ้าของ animation ของ element ที่ย้ายแล้ว และถอด CSS animation ที่ทำงานซ้ำบน element เดียวกัน
- [ ] คงการลากกับ dnd-kit; ใส่ motion ที่ wrapper ภายใน เพื่อไม่แย่ง `transform` หรือพิกัดของ drag target
- [ ] ใช้ `prefers-reduced-motion` ปิด spring, floating particles และการขยับต่อเนื่อง

Commit ที่วางแผนไว้: `feat: integrate animate ui motion components`

## Phase 7 — จัดวงจรแจ้งเตือนหลัง Login

สถานะ: Planned

- [ ] แยก controller ของ inbox/notification ออกจาก UI: เริ่มโหลดเมื่อ session และ profile พร้อม แล้วแสดงข้อความที่ยังไม่อ่านของผู้รับเท่านั้น
- [ ] รวมผลโหลด inbox กับข้อความ realtime โดยใช้ message ID และรักษาสถานะอ่านแล้ว เพื่อไม่ให้ request เก่าทับข้อความที่เพิ่งเข้ามา
- [ ] แสดงทีละ popup; เมื่อปิดให้แสดงข้อความถัดไป และเมื่อเปิดอ่านให้ลด unread เพียงครั้งเดียว
- [ ] ระหว่างมี dialog อื่นเปิดอยู่ ให้พัก notification จน dialog นั้นปิด เพื่อไม่แย่ง focus หรือซ่อนฟอร์มที่กำลังกรอก
- [ ] รีเซ็ต queue, dismissed IDs และสถานะเสียงเมื่อออกจากระบบหรือเปลี่ยน profile; ยกเลิกผล async ของ profile เก่า
- [ ] ใช้ audio service ร่วมกัน โดยเตรียม AudioContext จากการกดเลือกผู้ใช้ และเล่น chime เมื่อข้อความแสดงจริง
- [ ] เคารพ sound preference; ถ้า browser ไม่อนุญาตเสียง ให้ popup ทำงานต่อและมีปุ่มเปิดเสียง
- [ ] เล่น animation/เสียงครั้งเดียวต่อ message ID ต่อ session รวมกรณี reconnect และ StrictMode

Commit ที่วางแผนไว้: `feat: coordinate login alerts and notification effects`

## Phase 8 — ย้าย Desktop และเก็บงาน migration

สถานะ: Planned

- [ ] ย้าย Topbar, Dock, DesktopItem, FolderDesktop, WindowManager, PenToolbar, upload queue และ toast ไปใช้ Tailwind/shared components
- [ ] คง CSS เฉพาะพิกัด canvas, SVG strokes, wallpaper, cursor และเอฟเฟกต์ที่ต้องคำนวณ runtime
- [ ] รักษาการ drag/drop เข้า folder/Trash, movable text, note autosave, window maximize/minimize และการใช้ media controls
- [ ] แยกลำดับหน้าต่างที่บันทึกใน DB ออกจาก z-index ของ overlay; หน้าต่างที่ focus อยู่หน้าสุดภายใน window layer ทั้งสถานะปกติและขยาย
- [ ] เปิด Preflight และปรับค่าที่เคยอาศัย browser defaults ให้ชัดเจน เช่น button, heading, border, image และ SVG
- [ ] ถอด CSS imports/selector, keyframes และ dependencies ที่ไม่มีผู้ใช้งาน พร้อมแก้เอกสาร stack ให้ตรงกับ implementation
- [ ] ใช้แนวทาง code-reviewer และ test-master พิจารณาจุดเสี่ยงเรื่อง focus, พิกัด, async และ cleanup ในการอ่านโค้ด โดยไม่เพิ่มหรือรันชุดทดสอบตามคำขอ
- [ ] อัปเดตเอกสาร phase ด้วยสถานะและ commit hash จริง; เตรียม frontend สำหรับ deployment workflow เดิม โดยแยกการ publish ออกจาก migration

Commit ที่วางแผนไว้: `refactor: complete desktop tailwind migration`
