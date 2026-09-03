# Running Yuu & Mi Locally

## Prerequisites

- Node.js 20 or later
- A MongoDB Atlas connection string
- A Cloudinary account for image and video uploads

## Install Dependencies

From the repository root, install the root runner and both applications:

```powershell
npm install
npm install --prefix client
npm install --prefix server
```

## Configure Environment Variables

Create local environment files from the supplied examples:

```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

Set `MONGODB_URI`, `JWT_SECRET`, and the Cloudinary variables in `server/.env`. The default `client/.env` points to `http://localhost:5000/api`.

## Seed the Two Users

Public registration is intentionally disabled. Create the shared-desktop accounts with:

```powershell
cd server
node src/scripts/seed.js yuu choose-a-strong-password "Yuu"
node src/scripts/seed.js mi choose-a-strong-password "Mi"
cd ..
```

## Start the Project

```powershell
npm start
```

This starts the Vite frontend at `http://localhost:5173` and the Express API at `http://localhost:5000`. Verify the API with `http://localhost:5000/api/health`; it returns `{ "ok": true }`.
