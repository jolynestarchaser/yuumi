# Codex Master Prompt

ใช้ prompt นี้เมื่อต้องการให้ Codex ทำโปรเจกต์ตามสเปกทั้งหมด

---

You are implementing a private two-user desktop-style web app.

Read every Markdown spec in this repository before changing code.

## Product Summary

The app is a cute digital desktop / media board where two users share one desktop.

Users can create and organize:
- folders
- images
- videos
- website links
- notes

Items are freely positioned like desktop icons/cards, not rendered as a normal list.

Users must be able to:
- drag items around
- persist item positions
- drag items into folders
- open folders
- create nested folders
- preview images
- preview website links
- upload and play videos
- drag video cards without breaking native video controls

## Stack

Frontend:
- React
- Vite
- Tailwind CSS
- dnd-kit
- Zustand

Backend:
- Node.js
- Express
- MongoDB
- Mongoose

Storage:
- Cloudinary

Auth:
- JWT
- bcrypt

## Implementation Rules

1. Follow the Markdown specs as the source of truth.
2. Do not introduce Next.js.
3. Do not add Redux.
4. Realtime is limited to Socket.IO synchronization for the shared desktop: item/window positions, locks, commits, and presence. Do not add chat, notifications, or unrelated realtime features.
5. Do not store binary image/video files in MongoDB.
6. Keep all persisted file-like objects in one `items` collection.
7. Use `parentId: null` for desktop-root items.
8. Use optimistic UI for drag/move operations.
9. Persist position only at drag end, not every pointer move.
10. Video controls must remain fully usable; use a dedicated drag handle.
11. Link metadata fetching must include SSRF protection.
12. Validate all backend inputs.
13. Keep components modular and avoid large monolithic files.
14. After each implementation phase, run tests/build/lint and fix failures before proceeding.

## Work Order

Implement in this order:
1. project setup
2. database models
3. backend CRUD
4. authentication
5. desktop canvas
6. drag and drop
7. folders
8. image upload/preview
9. link preview
10. video upload/player
11. Zustand state cleanup
12. shortcuts/polish
13. tests
14. production configuration

For each phase:
- inspect existing code first
- implement the smallest complete working slice
- do not rewrite unrelated code
- report files changed
- report commands run
- report remaining known issues
