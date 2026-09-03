# Data Model

## Goal

ออกแบบ MongoDB schema ให้รองรับ desktop item ทุกประเภทโดยใช้ collection หลักเดียว

## User Model

```js
{
  username: String,
  passwordHash: String,
  displayName: String,
  createdAt: Date,
  updatedAt: Date
}
```

MVP มีเพียง 2 accounts

## Item Model

ใช้ collection `items`

```js
{
  name: String,

  type: "folder" | "image" | "video" | "link" | "note",

  parentId: ObjectId | null,

  position: {
    x: Number,
    y: Number
  },

  size: {
    width: Number,
    height: Number
  },

  content: String,

  url: String,

  asset: {
    publicId: String,
    url: String,
    secureUrl: String,
    thumbnailUrl: String,
    mimeType: String,
    bytes: Number,
    width: Number,
    height: Number,
    duration: Number
  },

  metadata: {
    title: String,
    description: String,
    siteName: String,
    favicon: String,
    previewImage: String,
    provider: String
  },

  createdBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- `parentId: null` = item อยู่บน desktop root
- `parentId: folderId` = item อยู่ใน folder
- Folder เองก็สามารถมี `parentId` ได้ เพื่อรองรับ nested folder
- position เป็นตำแหน่งภายใน parent ปัจจุบัน
- `content` ใช้สำหรับ note
- `url` ใช้สำหรับ link
- `asset` ใช้ image/video

## Indexes

สร้าง index:
- `parentId`
- `{ parentId: 1, type: 1 }`
- `createdBy`

## Validation

- folder ไม่ต้องมี asset/url/content
- image/video ต้องมี asset.url
- link ต้องมี url
- note ต้องมี content
- `x` และ `y` ห้ามเป็น NaN
- ห้าม parentId อ้างถึงตัวเอง

## Future-Proofing

ยังไม่ต้องทำ แต่ schema ควรต่อยอดได้:
- trash
- favorite
- tags
- shared permissions
- zIndex
- desktopId

## Acceptance Criteria

- สร้าง item ได้ทุก type
- query root items ด้วย `parentId: null`
- query folder children ด้วย `parentId: folderId`
- nested folder ทำงานได้
