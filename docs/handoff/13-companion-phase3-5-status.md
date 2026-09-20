# Companion Phase 3–5 — สถานะการดำเนินงาน

วันที่อัปเดต: 2026-09-21  
สถานะ: implementation อยู่บน `main`; release verification และ production deployment ยังไม่ยืนยัน

เอกสารนี้สรุปจากการทำงานจริงใน repository ไม่ใช่รายการที่อนุมานจากแผน

## ทำแล้ว

### Phase 3 — Lifecycle และ XP

- เพิ่ม lifecycle v3 ใน shared contract และ Companion model
- เพิ่ม stage: hatchling, child, juvenile, grown, elder
- เพิ่ม simulated age, care count, illness, health, hygiene, protection และ terminal history
- เพิ่ม natural death ที่ 90 วัน และ elder transition ที่ 60 วัน
- เพิ่ม unlimited XP arithmetic พร้อม safe-integer validation
- เพิ่ม piecewise simulation สำหรับ nap/rest และ awake interval
- เพิ่ม deterministic ID/time injection ใน domain functions
- เพิ่ม Thai/English persona prompt และ reply validation
- เพิ่ม bounded context: memories และ recent conversation สูงสุด 12 รายการ และ 16 KB

### Phase 4 — Mutation, Migration และ Generations

- เพิ่ม operation receipts สำหรับ mutation replay
- เพิ่ม family/companion leases และ Mongo transactions ใน mutation paths
- เพิ่ม successor generation, lineage และ predecessor relationship
- เพิ่ม adoption clock reset เพื่อไม่ให้นับเวลาย้อนก่อนเกิด
- เพิ่ม terminal-state check หลัง settlement
- เพิ่ม partial unique index สำหรับ predecessor
- เพิ่ม migration dry-run command
- เพิ่ม migration revision/schema guards
- เพิ่ม valid actions: visit, clean, medicine, retire, archive, restore

### Phase 5 — Client และ UI

- เพิ่ม lifecycle fields ใน client contracts
- เพิ่ม lifecycle progress, health/hygiene, memorial และ growth UI
- เพิ่ม elder rendering ใน soft/pixel companion components
- แยก detail request ออกจาก roster request เพื่อไม่ให้ roster ช้าบล็อก detail
- เพิ่ม locale strings ภาษาไทยและอังกฤษ
- ปิด portrait generation path ตาม capability flag

### Review fixes ที่ทำเพิ่ม

- แก้ MongoDB index ที่ใช้ `sparse` พร้อม `partialFilterExpression`
- แก้ nap boundary ให้การคำนวณไม่ขึ้นกับจำนวนครั้งที่ settle
- ป้องกัน provider reservation เดิมถูกเรียกซ้ำอัตโนมัติ
- เพิ่ม compatibility exports สำหรับ persona/simulation/reward/lifecycle tests
- ป้องกัน `careFor()` แก้ไข state input เดิมโดยตรง

## ผลตรวจที่ทำแล้ว

- Backend production build: ผ่าน
- Frontend production build: ผ่าน
- Isolated companion-domain typecheck: ผ่าน
- `git diff --check`: ผ่าน
- Persona, simulation, reward, evolution และ reply-validation tests: ผ่านหลังเพิ่ม compatibility layer
- Commit และ push ขึ้น GitHub สำเร็จ

Commits สำคัญ:

- `4b803c5` — Phase 3–5 implementation
- `5159df6` — merge เข้า `main`
- `628692a` — restore companion domain test contracts
- `9d109b0` — preserve immutable care input state

## ยังไม่ทำ / ยังไม่ยืนยัน

### Verification ที่ยังค้าง

- Root `npm run typecheck` ยังไม่ผ่าน เนื่องจาก strict config ดึง legacy/test errors จำนวนมาก
- Full server test suite ยังมี failures ใน `server/test/companion.test.ts`
- Legacy v2 assertions ยังไม่ถูกปรับให้ตรงกับ lifecycle v3 เช่น unborn decay, schema version 2 และ XP-derived stage
- Route tests ที่ใช้ in-memory mocks ยังไม่รองรับ transaction/session behavior ครบ
- ยังไม่มี database-backed concurrency tests สำหรับ lease, receipt และ successor cap
- ยังไม่มี browser/UI tests สำหรับ StrictMode, tab visibility, two profiles และ draft recovery
- ยังไม่มี provider timeout/lost acknowledgment integration test
- ยังไม่มี manual smoke test บน production-like MongoDB replica set

### Migration และ database

- ยังไม่ได้รัน write migration
- `migrate:companions -- --dry-run` ยังไม่สำเร็จ เพราะเครื่อง local resolve MongoDB Atlas SRV ไม่ได้ (`EBADRESP`)
- ยังไม่ได้ตรวจ duplicate predecessor records ก่อนสร้าง unique index ในฐานข้อมูลจริง
- ยังไม่ได้ backup หรือ rehearsal rollback

### Deployment

- Push `feature/niti` สำเร็จ
- Merge เข้า local `main` และ push `origin/main` สำเร็จ
- Railway production deployment: ยังไม่มีหลักฐานยืนยัน
- Vercel production deployment: ยังไม่มีหลักฐานยืนยัน
- Repository ไม่มี deploy workflow ใน `.github/workflows`; มีเฉพาะ CI สำหรับ `main`
- ยังไม่ได้ยืนยัน deployed revision, health endpoint, authenticated companion flow หรือ CORS บน production

## ข้อควรระวังก่อน release

ห้ามถือว่า push สำเร็จเท่ากับ production deploy สำเร็จ ต้องตรวจ deployment provider และ
deployed commit โดยตรงก่อนใช้งานจริง

ห้าม run migration บน production ก่อนมี backup, dry-run count, replica-set transaction
support และ rollback rehearsal

ห้าม rollback ไป writer รุ่นเก่าที่ลบ lifecycle fields หรือทำให้ terminal companion กลับมา alive

## ขั้นตอนถัดไปที่แนะนำ

1. แยก legacy v2 tests ออกจาก v3 contract tests และปรับ test fixtures ให้ใช้ lifecycle schema เดียวกัน
2. เพิ่ม mock session/transaction หรือ database-backed test harness สำหรับ controller tests
3. แก้ root typecheck โดยแยก legacy package errors ออกจาก strict companion-domain check
4. รัน dry-run บน disposable MongoDB replica set ที่ DNS/network ใช้งานได้
5. ตรวจ Railway/Vercel deployment revision และ health/authenticated smoke flows
6. ค่อยประกาศ Phase 3–5 release เมื่อ verification evidence ถูกแนบครบ

