# Yuu & Mi — Secret, History, Profiles และ Letters

สถานะของแผน implementation แยกตาม phase เพื่อใช้ติดตามงานจริง โดย server เป็น source of truth และใช้ revision ป้องกันข้อมูลเก่าเขียนทับ

## Phase 0 — Foundation

- [x] เพิ่มโมเดล Session, RevisionHistory, AuditEvent และ Message
- [x] เพิ่ม `DESKTOP_PIN` ใน server environment documentation
- [ ] ทำ MongoDB migration/backup runbook สำหรับ production

## Phase 1 — PIN และ Profile

- [x] `POST /api/auth/unlock` ตรวจ PIN ฝั่ง server และ rate limit
- [x] `POST /api/auth/profile` เลือก Joe/Focus และออก session ใหม่
- [x] Socket.IO ตรวจ session และเข้าห้องตาม profile
- [x] ปุ่ม Joe Neon green และ Focus Royal blue

## Phase 2 — Revision และ Logs

- [x] Item และ DesktopText มี revision และ actor ล่าสุด
- [x] Note autosave ต่อคิว request และส่ง expected revision
- [x] เก็บ snapshot ประวัติการสร้าง/แก้ไขข้อความ
- [x] ส่ง event จาก server หลัง commit เพื่อลด stale broadcast

## Phase 3 — History / Restore

- [x] `GET /api/history` และ `POST /api/history/:historyId/restore`
- [x] หน้าดูประวัติ Note และข้อความบน desktop
- [x] Restore สร้าง revision ใหม่และตรวจ conflict

## Phase 4 — Secret Items

- [x] Item รองรับ `secret` และ `secretLabel`
- [x] ซ่อน preview/thumbnail จน double-click เพื่อ reveal
- [x] context menu ทำให้เป็น Secret หรือแสดงกลับ

## Phase 5 — Letters / Alerts

- [x] Inbox, unread count, sent/received และ mark-read
- [x] ส่งถึง Joe/Focus อีกคนด้วย operation ID และ rate limit
- [x] จดหมายแบบ hearts, sparkles, emoji-rain หรือไม่มี animation
- [x] แจ้งเตือนในเว็บและโหลดข้อความค้างจาก DB หลังเลือก profile

## Phase 6 — Verification / Rollout

- [x] Server syntax check, 7 model tests และ Vite production build ผ่าน
- [ ] ทดสอบสอง browser sessions กับ MongoDB production-like replica set
- [ ] deploy Railway/Vercel แล้วตรวจ session, Socket.IO, history และ messages จริง

## Architecture Rules

- OOP เฉพาะ service/repository ที่ถือ dependency; business validation และ state reconciliation เป็น pure functions
- REST และ Socket ใช้กติกา revision เดียวกันและไม่รับ actor จาก payload
- ห้ามเก็บ PIN หรือ token ใน logs; ประวัติของ Secret item ใช้ snapshot เดียวกับ item เพื่อให้กู้คืนได้
- Secret เป็นการซ่อนใน UI ตามที่กำหนด ไม่ใช่ encryption หรือ permission boundary
