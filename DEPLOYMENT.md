# Deploying Yuu & Mi

This repository deploys as two services: the Vite frontend on Vercel and the Express/Socket.IO service on Railway. MongoDB Atlas stores shared state; Cloudinary stores uploaded media.

## 1. Deploy the API to Railway

1. Create a Railway project from this repository. Leave **Root Directory blank** and use `/railway.json` as the config file. The backend now imports types from `shared/`, so restricting the build context to `server/` would omit required files. Existing deployments with a `server` root must change this setting before deploying the migration. This follows Railway's [shared-monorepo setup](https://docs.railway.com/deployments/monorepo).
   The root config installs backend dependencies with `--include=dev`, runs `npm run build --prefix server`, and starts `node dist/server.js` through the backend start script. TypeScript must be installed during the build; it is not needed by the running server. Remove dashboard command overrides that still start `src/server.js`.
2. Add the following Railway service variables. Do not commit these values:

   ```text
   MONGODB_URI=<Atlas connection string>
   JWT_SECRET=<long random secret>
   DESKTOP_PIN=<shared four-digit PIN>
   CLIENT_ORIGIN=https://<your-vercel-domain>
   CLOUDINARY_CLOUD_NAME=<cloud name>
   CLOUDINARY_API_KEY=<API key>
   CLOUDINARY_API_SECRET=<API secret>
   ```

   Railway provides `PORT` automatically.
3. Generate the public Railway domain and verify `https://<api-domain>/api/health` returns `{"ok":true}`.
4. In MongoDB Atlas, permit the Railway service's network access and use a least-privileged database user.

## 2. Deploy the frontend to Vercel

1. Import the same repository into Vercel and set **Root Directory** to `client`. [Include source files outside the Root Directory](https://vercel.com/docs/monorepos/monorepo-faq) in the build so `shared/contracts.d.ts` is available. The `client/vercel.json` installs dependencies, type-checks the app, builds Vite, and publishes `dist`.
2. Add these Production environment variables:

   ```text
   VITE_API_URL=https://yuumi-production.up.railway.app/api
   ```

3. Deploy, copy the Vercel URL, and set it as Railway's `CLIENT_ORIGIN`. Redeploy Railway after changing CORS.

## Production checklist

- Test `/api/health` on Railway.
- Open the Vercel URL in two browser sessions and confirm Socket.IO shows `live shared desktop`.
- Create and move an item, then refresh both sessions to confirm persistence.
- Upload an image and verify its Cloudinary URL loads.
- Confirm the browser console has no CORS or mixed-content errors.

## Optional shared AI companion

Set `GEMINI_API_KEY` on the Railway backend only. Optional model overrides are
`GEMINI_CHAT_MODEL` (default `gemini-2.5-flash-lite`) and `GEMINI_IMAGE_MODEL`
(default `gemini-2.5-flash-image`). Portraits also use the existing Cloudinary variables.
Never put the Gemini key in Vercel frontend or `VITE_` variables. See
[the companion specification](19-shared-companion.md) for limits, memory behavior, and checks.

## Rollback procedure

Companion schema v3 requires a MongoDB replica set for transaction-backed mutations. Before rollout, back up the companion collections and rehearse `npm run migrate:companions -- --dry-run`; run the write migration only after reviewing the count. Deploy a v3-compatible server before or together with the lifecycle client. Do not roll back to a writer that strips lifecycle fields or changes terminal companions back to alive. For unrelated changes, use Vercel's previous deployment promotion and Railway's deployment rollback, then recheck `/api/health` and cross-session persistence.
