# HTTPS & CORS Setup Guide

## 1. CORS Configuration

Your backend already uses the `cors` middleware and reads the allowed origin from the `.env` variable `CORS_ORIGIN`:

```
CORS_ORIGIN=http://localhost:3000
```

- For local development, this is correct if your frontend runs on port 3000.
- For production, set this to your real frontend URL, e.g.:
  - `CORS_ORIGIN=https://securevote.edu`

**To allow multiple origins (advanced):**
Edit `src/index.ts`:
```ts
app.use(
  cors({
    origin: [process.env.CORS_ORIGIN, 'https://your-other-domain.com'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
```

## 2. HTTPS Setup (Local & Production)

### Local Development
Browsers require HTTPS for WebAuthn except on `localhost`.
- For local dev, you can use `http://localhost` (no HTTPS needed).
- If you want HTTPS locally, use [mkcert](https://github.com/FiloSottile/mkcert) to generate a local CA and certs.

**Example (optional):**
1. Install mkcert and run:
   ```sh
   mkcert localhost
   ```
2. Place the generated `localhost.pem` and `localhost-key.pem` in your project root.
3. Edit `src/index.ts`:
   ```ts
   import https from 'https';
   import fs from 'fs';
   // ...
   if (process.env.LOCAL_HTTPS === 'true') {
     const key = fs.readFileSync('localhost-key.pem');
     const cert = fs.readFileSync('localhost.pem');
     https.createServer({ key, cert }, app).listen(PORT, ...);
   } else {
     app.listen(PORT, ...);
   }
   ```
4. Add to `.env`:
   ```
   LOCAL_HTTPS=true
   ```

### Production
- Deploy behind a reverse proxy (Nginx, Caddy, etc.) with SSL certificates (Let's Encrypt recommended).
- Set `CORS_ORIGIN` and `ORIGIN` in `.env` to your production domain (e.g. `https://securevote.edu`).
- Do **not** serve HTTPS directly from Node in production—let your proxy handle it.

## 3. Environment Variables Checklist

- `.env` for local:
  ```
  CORS_ORIGIN=http://localhost:3000
  ORIGIN=http://localhost:3000
  RP_ID=localhost
  ```
- `.env` for production:
  ```
  CORS_ORIGIN=https://securevote.edu
  ORIGIN=https://securevote.edu
  RP_ID=securevote.edu
  ```

## 4. Troubleshooting
- If you see CORS errors, check browser console and ensure `CORS_ORIGIN` matches your frontend URL exactly.
- For WebAuthn, HTTPS is required except on `localhost`.
- If using HTTPS locally, your browser must trust the local certificate (see mkcert docs).

---

**You are now ready for secure CORS and HTTPS in both local and production!**
