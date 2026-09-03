# Drag and Drop

## Goal

ทำให้ item ลากได้อิสระบน desktop และลากเข้า folder ได้

## Library

ใช้ `@dnd-kit/core`

## Required Behavior

### Free Drag

- ลาก item ไปตำแหน่งไหนก็ได้
- ระหว่างลาก UI อัปเดตแบบ local ก่อน
- ตอน drag end ค่อย persist ไป API
- ไม่ยิง API ทุก mouse move

### Drop on Folder

- folder เป็น droppable target
- item ทุก type ยกเว้นตัว folder เองสามารถ drop ได้
- folder ก็สามารถ drop เข้า folder อื่นได้ถ้าไม่เกิด cycle
- drop สำเร็จ → update `parentId`

### Video Special Rule

อย่าใช้ตัว `<video>` ทั้งก้อนเป็น drag activator

ใช้:
- title bar
- grip handle
- card background ที่ไม่ชน controls

เพื่อให้:
- play
- scrub timeline
- volume
- fullscreen

ทำงานได้ตามปกติ

## Optimistic Update

Flow:

```text
drag end
→ update Zustand immediately
→ PATCH API
→ success: keep
→ error: rollback
```

## Position

ตำแหน่งต้อง:
- x >= 0
- y >= 0
- จำกัดไม่ให้ item หายออกจาก canvas ทั้งชิ้น

## Accessibility

เพิ่ม fallback action:
- Move to folder ผ่าน context menu
- Move to desktop ผ่าน context menu

## Acceptance Criteria

- drag smooth
- refresh แล้วตำแหน่งอยู่
- drop เข้า folder ได้
- video controls ไม่ trigger drag
- API fail แล้ว rollback
