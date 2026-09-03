# Desktop UI

## Goal

สร้าง desktop experience ที่ให้ความรู้สึกเหมือนโต๊ะทำงานน่ารัก ๆ และคล้าย macOS desktop

## Main Components

```text
DesktopPage
├── DesktopCanvas
├── DesktopItem
├── FolderItem
├── ImageItem
├── VideoItem
├── LinkItem
├── NoteItem
├── SelectionLayer
├── ContextMenu
├── PreviewModal
└── Dock / Toolbar
```

## DesktopCanvas

- position: relative
- overflow: hidden หรือ controlled
- item ใช้ absolute positioning
- wallpaper เป็น background layer
- รองรับ responsive layout

## DesktopItem

ทุก item ต้องมี:
- selected state
- label
- drag handle หรือ drag surface
- double-click action
- context menu
- focus state

## Visual Direction

- cute / cozy desk
- soft UI
- rounded cards
- ไม่ต้อง copy macOS แบบ pixel-perfect
- folder icon อาจเป็น custom illustrated folder
- image/video/link ควรแสดง thumbnail card

## Interactions

Single click:
- select

Double click:
- folder → open
- image → preview
- video → preview/player
- link → preview panel
- note → editor

Right click:
- rename
- delete
- open
- move to root (เมื่ออยู่ folder)

## Acceptance Criteria

- render item ตาม x/y
- select item ได้
- double-click ทำ action ตาม type
- wallpaper ไม่กิน pointer events ของ item
