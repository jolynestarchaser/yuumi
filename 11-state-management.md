# Zustand State Management

## Goal

แยก state ที่เกี่ยวข้องกับ desktop interactions ออกจาก component tree

## Suggested Stores

### authStore

```text
user
token
login()
logout()
restoreSession()
```

### desktopStore

```text
items
selectedItemIds
activeFolderId
loading

fetchItems(parentId)
createItem()
updateItem()
moveItem()
updatePosition()
deleteItem()
selectItem()
clearSelection()
```

### uiStore

```text
previewItem
contextMenu
openFolderWindows
wallpaper
```

## Rules

- server เป็น source of truth สำหรับ persisted data
- Zustand ใช้ optimistic UI
- ห้าม duplicate state ที่ derive ได้
- item map by id ถ้าเริ่มมีจำนวนเยอะ

## Fetching

เมื่อเปิด folder:
- fetch children ตาม parentId

MVP ไม่ต้อง preload tree ทั้งหมด

## Acceptance Criteria

- component ไม่ต้อง prop-drill item operations
- optimistic drag update ได้
- refresh fetch state ใหม่ได้
