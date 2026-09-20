# Running Yuu & Mi Locally

## Prerequisites

- Node.js 22 (matching all package manifests and `.nvmrc`)
- A MongoDB Atlas connection string
- A Cloudinary account for image and video uploads

### Project-local Node 22 on Windows

If another Node version is installed globally, install the official Node 22
Windows archive in this repository's ignored `.tools/node22` directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-node22.ps1
scripts\node22.cmd npm run dev
```

The installer checks the archive against Node's official SHA256 manifest. It
does not change the system Node installation or PATH. Use `scripts\node22.cmd`
before any Node/npm command to run this project with Node 22, for example
`scripts\node22.cmd npm install --prefix server`. Nested npm scripts inherit
the runtime. Existing NVM users can instead use `.nvmrc` to select Node 22.

Runtime installation does not establish application correctness. Validation
has deliberately not been rerun during the current no-tests work.

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
npm run seed -- yuu choose-a-strong-password "Yuu"
npm run seed -- mi choose-a-strong-password "Mi"
cd ..
```

## Start the Project

```powershell
npm start
```

This starts the Vite frontend at `http://localhost:5173` and the Express API at `http://localhost:5000`. Verify the API with `http://localhost:5000/api/health`; it returns `{ "ok": true }`.

## TypeScript checks and production build

From the repository root:

```powershell
npm run typecheck
npm test
npm run build
npm start --prefix server
```

The backend runs from `server/dist/server.js` in production. Development uses
`tsx watch`; tests use Node's built-in runner with the `tsx` loader.
See [the migration notes](20-typescript-migration.md) for the incremental typing policy.

For a database-free companion UI preview, run `npm run preview:companion --prefix server`
and open `http://127.0.0.1:5179`. Any four-digit PIN works in this isolated fixture;
it uses in-memory state and makes no Gemini calls. Never deploy the fixture.
