# Deployment Guide

This project is prepared for:

- Netlify: Angular frontend
- Render: Node/Express backend
- Aiven: MySQL database

Local development still works with the existing commands and local `.env` file.

## Local Development

Start the backend:

```powershell
cd backend
npm install
npm run dev
```

Start the frontend:

```powershell
cd frontend
npm install
npm start
```

Local defaults:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- API base URL: `http://localhost:3000/api`

## Aiven MySQL

1. Create an Aiven MySQL service.
2. Create the production database, for example `jdf_veterans_affairs_portal`.
3. Import [database/jdf_portal_schema.sql](database/jdf_portal_schema.sql).
4. If the database was created from an older schema, apply files in [database/migrations](database/migrations).
5. Use Aiven's host, port, username, password, and database name in Render environment variables.

Recommended Render database variables for Aiven:

```text
DB_HOST=<Aiven host>
DB_PORT=<Aiven port>
DB_NAME=jdf_veterans_affairs_portal
DB_USER=<Aiven user>
DB_PASSWORD=<Aiven password>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

## Render Backend

Create a Render Web Service from the repository and point it to the backend.

Settings:

```text
Root Directory: backend
Build Command: npm ci
Start Command: npm start
Health Check Path: /api/health
```

Required environment variables:

```text
NODE_ENV=production
APP_BASE_URL=https://<render-backend-name>.onrender.com
FRONTEND_URL=https://<netlify-site-name>.netlify.app
CORS_ALLOWED_ORIGINS=https://<netlify-site-name>.netlify.app,http://localhost:4200

DB_HOST=<Aiven host>
DB_PORT=<Aiven port>
DB_NAME=jdf_veterans_affairs_portal
DB_USER=<Aiven user>
DB_PASSWORD=<Aiven password>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

JWT_ACCESS_SECRET=<long random value>
JWT_REFRESH_SECRET=<different long random value>
SESSION_SECRET=<different long random value>
LOOKUP_HASH_PEPPER=<long random value>
DATA_ENCRYPTION_KEY=<32-byte base64 key or 64-character hex key>
DATA_ENCRYPTION_KEY_VERSION=1
MAIN_ADMIN_BOOTSTRAP_KEY=<temporary first-admin key>

ALLOW_STAFF_SELF_SIGNUP=true
REQUIRE_IDENTITY_VERIFICATION_FOR_ISSUANCE=true
```

Generate a base64 encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep `DATA_ENCRYPTION_KEY` stable after launch. Changing it will prevent existing encrypted data from being decrypted.

## Netlify Frontend

Create a Netlify site from this repository.

Settings:

```text
Base directory: frontend
Build command: npm run build:netlify
Publish directory: frontend/dist/frontend
```

Environment variables:

```text
API_BASE_URL=https://<render-backend-name>.onrender.com/api
NODE_VERSION=18
```

The repository root has [netlify.toml](netlify.toml), including the Angular SPA redirect rule and frontend base directory.

## Uploads on Render

The backend currently stores uploads on local disk under `backend/uploads` or the configured upload paths. This is acceptable for local testing, but Render's filesystem is not a durable file store across redeploys.

Before production use, move uploads to durable object storage such as S3, Cloudflare R2, or Aiven-compatible object storage if available.

## Deployment Order

1. Create Aiven MySQL.
2. Import the schema.
3. Deploy backend to Render with Aiven variables.
4. Confirm `https://<render-backend>/api/health` returns `status: ok`.
5. Deploy frontend to Netlify with `API_BASE_URL` pointing to Render.
6. Update Render `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` with the final Netlify domain.
7. Create the first Main Admin using `MAIN_ADMIN_BOOTSTRAP_KEY`.
