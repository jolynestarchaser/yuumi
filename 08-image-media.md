# Image Upload & Preview

## Goal

อัปโหลดรูปและแสดง thumbnail/preview บน desktop

## Upload Flow

```text
user chooses image
→ frontend multipart/form-data
→ Express
→ Cloudinary
→ save item in MongoDB
→ return created item
```

## Endpoint

```http
POST /api/media/image
```

multipart fields:
- `file`
- `name`
- `parentId`
- `x`
- `y`

## Supported MVP Formats

- jpeg
- png
- webp
- gif

## Image Item UI

Desktop thumbnail:

```text
┌─────────────────┐
│                 │
│    thumbnail    │
│                 │
├─────────────────┤
│ image-name.jpg  │
└─────────────────┘
```

## Preview

Double-click:
- open modal / Quick Look
- show full image
- preserve aspect ratio

## Storage

MongoDB เก็บ metadata เท่านั้น
ห้ามเก็บ binary image ใน MongoDB

## Error Handling

- reject unsupported mime
- size limit
- upload fail ไม่สร้าง dangling item

## Acceptance Criteria

- upload รูปได้
- thumbnail แสดง
- drag ได้
- drop เข้า folder ได้
- preview full image ได้
