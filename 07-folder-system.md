# Folder System

## Goal

สร้าง folder hierarchy แบบ desktop file manager

## Behavior

Folder:
- create
- rename
- open
- accept drop
- contain child items
- nest folder

## Opening Folder

MVP เลือกหนึ่ง pattern:

### Recommended
เปิดเป็น floating window/modal

```text
┌───────────────────────────┐
│ Design                 ×  │
├───────────────────────────┤
│ image   link   folder     │
│ video   note              │
└───────────────────────────┘
```

ภายในใช้ component เดิม:

```jsx
<FileCanvas parentId={folderId} />
```

## Navigation

Folder window ควรมี:
- title
- back/up
- close
- breadcrumb ถ้ามี nested folder

## Circular Nesting Protection

ห้าม:
- folder ย้ายเข้าตัวเอง
- folder A → B ถ้า B อยู่ภายใน A อยู่แล้ว

backend ต้องเป็น source of truth

## Creating Folder

Right click desktop:
- New Folder

Default name:
`New Folder`

สร้างตำแหน่งใกล้ pointer

## Acceptance Criteria

- สร้าง folder
- เปิด folder
- child item แสดงถูกต้อง
- nested folder ทำงาน
- ป้องกัน circular hierarchy
