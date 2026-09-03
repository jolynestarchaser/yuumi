# Deployment

## Goal

Deploy MVP แบบง่ายและ maintain ได้

## Frontend

Vercel

Build:
```bash
npm run build
```

Environment:
```env
VITE_API_URL=https://your-api.example.com/api
```

## Backend

ใช้ Render หรือ Railway

Environment:
```env
PORT=
MONGODB_URI=
JWT_SECRET=
CLIENT_ORIGIN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Database

MongoDB Atlas

## Storage

Cloudinary

## Production Requirements

- CORS allow frontend origin เท่านั้น
- HTTPS
- JWT secret แข็งแรง
- upload size limit
- rate limit auth/link-preview
- sanitize/validate inputs
- private IP blocking สำหรับ link preview

## Health Check

```http
GET /api/health
```

## Acceptance Criteria

- user ทั้งสอง login จาก production URL ได้
- CRUD ทำงาน
- upload image/video ได้
- link preview ได้
- refresh และ relogin แล้ว data ยังอยู่
