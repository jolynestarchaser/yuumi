# Cute Desktop App — Codex Specs

เว็บ private desktop สำหรับผู้ใช้ 2 คน ใช้เก็บและจัดวาง Folder, Image, Video, Link และ Note บนพื้นหลังแบบโต๊ะน่ารัก ๆ

## Stack

### Frontend
- React
- Vite
- Tailwind CSS
- dnd-kit
- Zustand

### Backend
- Node.js
- Express
- MongoDB Atlas
- Mongoose

### Storage
- Cloudinary สำหรับ image/video

### Auth
- JWT
- bcrypt

## หลักการสำคัญ

- Desktop เป็นพื้นที่แบบ free-position ไม่ใช่ grid list
- ทุก item สามารถลากย้ายตำแหน่งได้
- Folder รับ item ด้วย drag-and-drop ได้
- Image และ Video ต้องมี preview
- Link ต้องมี rich preview จาก metadata
- Video ต้องเล่นได้โดยไม่ชนกับ drag interaction
- Refresh แล้วตำแหน่งและโครงสร้าง folder ต้องอยู่เหมือนเดิม
- MVP ใช้กัน 2 คน
- ยังไม่ต้องทำ realtime ในเวอร์ชันแรก

## ลำดับแนะนำให้ Codex ทำ

1. `01-project-setup.md`
2. `02-data-model.md`
3. `03-backend-api.md`
4. `04-auth.md`
5. `05-desktop-ui.md`
6. `06-drag-drop.md`
7. `07-folder-system.md`
8. `08-image-media.md`
9. `09-link-preview.md`
10. `10-video-player.md`
11. `11-state-management.md`
12. `12-polish-shortcuts.md`
13. `13-testing.md`
14. `14-deployment.md`

## Definition of Done สำหรับ MVP

ผู้ใช้สามารถ:
- login ได้
- เห็น desktop wallpaper
- สร้าง folder
- เพิ่ม note/link/image/video
- ลาก item ไปวางตำแหน่งต่าง ๆ
- ลาก item เข้า folder
- เปิด folder และเห็น item ภายใน
- preview image
- preview link
- play video
- refresh แล้ว state ยังอยู่
- user 2 คนมองเห็นข้อมูล shared desktop เดียวกัน
