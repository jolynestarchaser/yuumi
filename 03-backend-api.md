# Backend API

## Goal

สร้าง REST API สำหรับ item CRUD และ desktop operations

## Base URL

```text
/api
```

## Health

```http
GET /api/health
```

## Items

### Get items in current folder

```http
GET /api/items?parentId=root
GET /api/items?parentId=<folderId>
```

`root` แปลงเป็น `parentId: null`

### Get one item

```http
GET /api/items/:id
```

### Create item

```http
POST /api/items
```

ตัวอย่าง:

```json
{
  "name": "Design",
  "type": "folder",
  "parentId": null,
  "position": { "x": 120, "y": 90 }
}
```

### Update generic fields

```http
PATCH /api/items/:id
```

### Update position

```http
PATCH /api/items/:id/position
```

Body:

```json
{
  "x": 320,
  "y": 180
}
```

### Move item to folder

```http
PATCH /api/items/:id/move
```

Body:

```json
{
  "parentId": "folder-id",
  "position": {
    "x": 40,
    "y": 50
  }
}
```

ใช้ `null` เมื่อต้องการย้ายกลับ desktop

### Delete

```http
DELETE /api/items/:id
```

สำหรับ MVP delete จริงได้ก่อน

## Response Shape

สำเร็จ:

```json
{
  "success": true,
  "data": {}
}
```

ผิดพลาด:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

## Rules

- ทุก route ยกเว้น health ต้อง auth
- validate ObjectId
- folder move ต้องป้องกัน circular nesting
- update position ต้อง clamp ค่า minimum เป็น 0

## Acceptance Criteria

- CRUD ครบ
- ย้าย item เข้า folder ได้
- ย้ายกลับ root ได้
- response format สม่ำเสมอ
- error middleware ทำงาน
