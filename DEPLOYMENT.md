# Deploying Yuu & Mi

This repository deploys as two services: the Vite frontend on Vercel and the Express/Socket.IO service on Railway. MongoDB Atlas stores shared state; Cloudinary stores uploaded media.

## 1. Deploy the API to Railway

1. Create a Railway project from this repository. Railway reads the root `railway.json`.
2. Add the following Railway service variables. Do not commit these values:

   ```text
   MONGODB_URI=<Atlas connection string>
   JWT_SECRET=<long random secret>
   CLIENT_ORIGIN=https://<your-vercel-domain>
   CLOUDINARY_CLOUD_NAME=<cloud name>
   CLOUDINARY_API_KEY=<API key>
   CLOUDINARY_API_SECRET=<API secret>
   ```

   Railway provides `PORT` automatically.
3. Generate the public Railway domain and verify `https://<api-domain>/api/health` returns `{"ok":true}`.
4. In MongoDB Atlas, permit the Railway service's network access and use a least-privileged database user.

## 2. Deploy the frontend to Vercel

1. Import the same repository into Vercel. The root `vercel.json` builds `client/` and publishes `client/dist`.
2. Add these Production environment variables:

   ```text
   VITE_API_URL=https://<api-domain>/api
   VITE_DESKTOP_PIN=<shared four-digit PIN>
   ```

3. Deploy, copy the Vercel URL, and set it as Railway's `CLIENT_ORIGIN`. Redeploy Railway after changing CORS.

## Production checklist

- Test `/api/health` on Railway.
- Open the Vercel URL in two browser sessions and confirm Socket.IO shows `live shared desktop`.
- Create and move an item, then refresh both sessions to confirm persistence.
- Upload an image and verify its Cloudinary URL loads.
- Confirm the browser console has no CORS or mixed-content errors.

## Rollback

Use Vercel's previous deployment promotion and Railway's deployment rollback. After either rollback, recheck `/api/health`, then create a temporary note and verify it appears in a second session.
