# Video Upload & Player

## Goal

Video เป็น desktop item ที่ลากได้ เล่นได้ และโยนใส่ folder ได้

## Upload Flow

```text
video file
→ Express
→ Cloudinary
→ MongoDB item
```

## Endpoint

```http
POST /api/media/video
```

## MVP Format

เริ่มจาก:
- mp4
- webm หาก browser/storage รองรับ

## Video Card

```text
┌──────────────────────────┐
│ ⋮⋮ holiday.mp4           │ ← drag handle
├──────────────────────────┤
│                          │
│       video player       │
│                          │
├──────────────────────────┤
│ browser video controls   │
└──────────────────────────┘
```

## Critical Interaction Rule

Drag listeners ต้องอยู่ที่ drag handle

อย่า attach drag listeners บน `<video>`

## Playback

ใช้ native:

```jsx
<video
  src={item.asset.secureUrl}
  controls
  preload="metadata"
/>
```

## Thumbnail

ถ้ามี Cloudinary thumbnail:
- แสดง poster

## Move to Folder

video ใช้ item move API เดียวกับ item อื่น

## Acceptance Criteria

- upload video
- เล่น/pause
- seek timeline
- drag card ผ่าน handle
- drop เข้า folder
- refresh แล้ว video ยังอยู่
