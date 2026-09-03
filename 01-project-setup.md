# Project Setup

## Goal

สร้างโครงสร้างโปรเจกต์ MERN สำหรับ Cute Desktop App

## Folder Structure

```text
cute-desktop/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.js
│   ├── server.js
│   └── package.json
└── README.md
```

## Frontend Dependencies

ติดตั้ง:
- react
- react-dom
- react-router-dom
- @dnd-kit/core
- @dnd-kit/utilities
- zustand
- axios
- tailwindcss

## Backend Dependencies

ติดตั้ง:
- express
- mongoose
- cors
- dotenv
- bcrypt
- jsonwebtoken
- multer
- cloudinary

Dev:
- nodemon

## Environment Variables

### client/.env

```env
VITE_API_URL=http://localhost:5000/api
```

### server/.env

```env
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_ORIGIN=http://localhost:5173

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Acceptance Criteria

- `npm run dev` ที่ client เปิด Vite ได้
- server เปิดที่ port 5000
- `GET /api/health` คืน `{ "ok": true }`
- client เรียก health endpoint สำเร็จ
- MongoDB connect สำเร็จ
- มี centralized error middleware

## Do Not Build Yet

- ไม่ทำ realtime
- ไม่ทำ upload
- ไม่ทำ drag/drop
- ไม่ทำ auth UI ในขั้นนี้
