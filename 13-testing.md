# Testing

## Goal

มี test ขั้นต่ำสำหรับ flow สำคัญ

## Backend Tests

ควรทดสอบ:
- login success/fail
- create folder
- create note
- move item
- invalid ObjectId
- circular folder move
- link-preview invalid URL
- protected route

## Frontend Tests

เน้น behavior:
- render desktop item
- select item
- open folder
- preview image
- video drag handle ไม่ครอบ video controls

## Manual QA Checklist

### Desktop
- [ ] ลาก item
- [ ] refresh แล้วยังอยู่
- [ ] item ไม่หายออกนอก viewport ง่าย ๆ

### Folder
- [ ] create
- [ ] rename
- [ ] drag item เข้า
- [ ] nested folder
- [ ] move item กลับ desktop

### Image
- [ ] upload
- [ ] thumbnail
- [ ] preview

### Video
- [ ] upload
- [ ] play
- [ ] pause
- [ ] seek
- [ ] drag handle
- [ ] drop folder

### Link
- [ ] valid preview
- [ ] no OG fallback
- [ ] invalid URL
- [ ] blocked private URL

### Auth
- [ ] login
- [ ] refresh session
- [ ] logout
- [ ] unauthorized rejected
