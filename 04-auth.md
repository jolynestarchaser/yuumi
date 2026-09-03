# Authentication

## Goal

ระบบ login แบบง่ายสำหรับ 2 users

## Requirements

- ไม่มี public registration ใน MVP
- สร้าง user ผ่าน seed script หรือ admin seed
- password hash ด้วย bcrypt
- login แล้วได้รับ JWT
- frontend เก็บ auth state
- protected route ต้อง verify JWT

## Endpoints

```http
POST /api/auth/login
GET /api/auth/me
```

### Login Body

```json
{
  "username": "user1",
  "password": "..."
}
```

### Login Response

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "...",
      "username": "user1",
      "displayName": "..."
    }
  }
}
```

## Frontend

สร้าง:
- `LoginPage`
- `useAuthStore`
- axios interceptor แนบ Bearer token
- `ProtectedRoute`

## Shared Desktop

MVP ให้ 2 users เห็น items ชุดเดียวกัน

`createdBy` มีไว้ audit ว่าใครสร้าง item

อย่ากรอง item ตาม createdBy

## Acceptance Criteria

- login ถูกต้องเข้า desktop ได้
- token ผิดถูก reject
- refresh แล้วยังรักษา session
- logout ได้
