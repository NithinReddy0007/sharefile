# idea.md - Qshare Project Living Blueprint & Source of Truth

## 1. Product Overview & Goals
**Qshare** is a lightweight, zero-account temporary file sharing web application.
- **Core Mission**: Allow users to share files quickly and securely without registration, logins, or ads.
- **Access Pattern**: Senders receive a unique Room ID (e.g. `QK7M-89P2`) and a 6-digit numeric passcode. Receivers access the files using these credentials.
- **Strict Ephemerality**: Rooms and their files expire exactly 30 minutes from creation. No room extension is permitted.
- **Storage Limits**:
  - Max single file size: 500 MB.
  - Max combined room size: 1 GB.
  - Rate limiting per IP to mitigate abuse.

---

## 2. Technology Stack & Architecture

### Frontend
- **Framework**: React 19 + TypeScript + Vite.
- **Styling**: Plain CSS (clean, responsive, subtle borders, muted blue accents, no gradients or heavy animations).
- **Icons**: `lucide-react`.
- **ZIP Bundler**: `fflate` for client-side streaming archive creation on "Download All".
- **Hosting**: GitHub Pages via GitHub Actions (`.github/workflows/deploy-frontend.yml`).
- **Base Path**: Configurable via `VITE_BASE_PATH` (defaults to `/sharefile/` on GitHub Actions and `/` on local development).
- **API URL**: Configurable via `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8787`).

### Backend & Storage
- **Compute**: Cloudflare Workers (TypeScript).
- **Metadata Database**: Cloudflare D1 (SQLite-compatible distributed database).
- **File Storage**: Cloudflare R2 (S3-compatible object storage).
- **Tooling**: Wrangler CLI.
- **Scheduled Tasks**: Cloudflare Worker Cron Triggers (`*/10 * * * *`) for automated garbage collection of expired rooms.

---

## 3. Database Schema (Cloudflare D1)

### `rooms` Table
- `id TEXT PRIMARY KEY`: Alphanumeric room code (e.g., `ABCD-EFGH`).
- `passcode_hash TEXT NOT NULL`: SHA-256 hashed passcode with per-room salt.
- `passcode_salt TEXT NOT NULL`: 16-byte random hex salt.
- `created_at INTEGER NOT NULL`: Unix timestamp (seconds).
- `expires_at INTEGER NOT NULL`: Unix timestamp (`created_at + 1800`).
- `total_size_bytes INTEGER NOT NULL DEFAULT 0`: Aggregated file size in room.
- `status TEXT NOT NULL DEFAULT 'active'`: State (`active`, `expired`, `deleted`).

### `files` Table
- `id TEXT PRIMARY KEY`: UUID v4 file identifier.
- `room_id TEXT NOT NULL REFERENCES rooms(id)`: Room foreign key.
- `filename TEXT NOT NULL`: Original filename (sanitized for safe storage).
- `size_bytes INTEGER NOT NULL`: Size in bytes.
- `content_type TEXT NOT NULL`: MIME type.
- `storage_key TEXT NOT NULL`: R2 key (`rooms/{roomId}/{fileId}_{filename}`).
- `status TEXT NOT NULL DEFAULT 'pending'`: `pending`, `uploaded`, or `deleted`.
- `upload_id TEXT`: Cloudflare R2 multipart upload ID (if large file > 50MB).
- `uploaded_at INTEGER`: Upload completion timestamp.
- `created_at INTEGER NOT NULL`: Creation timestamp.

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Healthcheck and timestamp | None |
| `POST` | `/api/rooms` | Creates new temporary room (returns ID, passcode, TTL) | None |
| `GET` | `/api/rooms/:roomId` | Retrieves room metadata & uploaded files list | `X-Room-Passcode` |
| `POST` | `/api/rooms/:roomId/files` | Initiates upload (pre-allocates R2 key / multipart) | `X-Room-Passcode` |
| `PUT` | `/api/rooms/:roomId/files/:fileId` | Streams file body directly to R2 | `X-Room-Passcode` |
| `PUT` | `/api/rooms/:roomId/files/:fileId/part` | Uploads multipart chunk for large files | `X-Room-Passcode` |
| `POST` | `/api/rooms/:roomId/files/:fileId/complete`| Finalizes multipart upload in R2 & D1 | `X-Room-Passcode` |
| `POST` | `/api/rooms/:roomId/files/:fileId/abort` | Aborts pending multipart upload | `X-Room-Passcode` |
| `GET` | `/api/rooms/:roomId/files/:fileId/download`| Streams file download with Range header support | `X-Room-Passcode` |
| `POST` | `/api/cleanup` | Manual/webhook trigger for expired room cleanup | None |

---

## 5. Workflow Implementation

### Send Files
1. User clicks **Send Files**.
2. Frontend calls `POST /api/rooms`.
3. Backend securely generates a room ID and a 6-digit passcode, hashes it with a cryptographic salt, and stores it in D1 with a 30-minute expiration.
4. Room ID and Passcode are presented with one-click copy buttons and a full credential share button.
5. User selects or drags files into the upload area.
6. Frontend validates individual size (<= 500 MB) and combined remaining room capacity (<= 1 GB).
7. Files are uploaded directly to the backend stream:
   - For files <= 50 MB: Single streaming `PUT` with fine-grained XHR upload progress.
   - For files > 50 MB (up to 500 MB): Multipart chunking (10 MB chunks) uploaded sequentially to prevent memory exhaustion.
8. Real-time countdown timer displays remaining room lifetime.

### Receive Files
1. User clicks **Receive Files**.
2. Inputs `Room ID` and `Passcode`.
3. Frontend issues `GET /api/rooms/:roomId` with `X-Room-Passcode` header.
4. Backend re-checks expiration timestamp against `Math.floor(Date.now() / 1000)`. If expired, returns `410 Gone`.
5. Backend verifies constant-time hash comparison of passcode.
6. On success, displays file list, sizes, and individual download buttons.
7. **Download All** uses `fflate` in a sequential stream to build a `.zip` archive on the fly without reading all files simultaneously into RAM.

### Cleanup & Room Expiration
- Immediate access denial upon reaching `expires_at`.
- Cloudflare Cron Trigger runs every 10 minutes (`*/10 * * * *`).
- Queries rooms with `expires_at <= now()`.
- Deletes all related R2 objects using `env.BUCKET.delete(keys)`.
- Removes database rows in an atomic D1 batch transaction.

---

## 6. Directory Structure
```
sharefile/
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml      # Automated GitHub Pages CI/CD
├── frontend/
│   ├── src/
│   │   ├── api.ts                   # Typed API client with upload/download logic
│   │   ├── App.tsx                  # Root layout & view router
│   │   ├── ExpirationCountdown.tsx  # Live countdown badge
│   │   ├── index.css                # Clean, responsive styles
│   │   ├── main.tsx                 # Vite React entrypoint
│   │   ├── ReceiveView.tsx          # Receive files workflow
│   │   ├── SendView.tsx             # Send files workflow
│   │   ├── types.ts                 # Frontend interfaces
│   │   └── utils.ts                 # Byte formatting & ZIP streamer
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts               # Vite configuration with GitHub Pages base
├── worker/
│   ├── migrations/
│   │   └── 0001_initial_schema.sql  # D1 SQLite schema
│   ├── src/
│   │   ├── crypto.ts                # Cryptographic hashing & ID generators
│   │   ├── index.ts                 # Worker entrypoint, HTTP router & Cron handler
│   │   └── types.ts                 # Backend D1/R2 interfaces
│   ├── test/
│   │   └── logic.test.js            # Node test runner suite
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml                # Cloudflare Worker, D1 & R2 bindings
├── .env.example
├── .gitignore
├── idea.md                          # Living blueprint (this document)
├── package.json                     # Workspace scripts
└── README.md                        # Setup and deployment manual
```

---

## 7. Verification & Tests Run
- **Frontend Typecheck & Production Build**: `npm --prefix frontend run build` succeeded without error (`dist/` generated).
- **Backend Typecheck**: Worker TypeScript compilation verified with `tsc --project worker/tsconfig.json --noEmit` (0 errors).
- **Unit Tests**: `node --test worker/test/logic.test.js` executed 5/5 passing tests:
  - Formatted Room ID generation (`XXXX-XXXX`)
  - 6-digit numeric Passcode generation
  - SHA-256 salted constant-time passcode verification
  - Expiration detection logic (> 30 minutes)
  - Room capacity & individual file size enforcement

---

## 8. Future Roadmap & Security Hardening
- **Client-Side Zero-Knowledge Encryption**: Derive an AES-GCM-256 key in the browser from the room passcode and encrypt file bytes prior to uploading.
- **Turnstile Captcha**: Add Cloudflare Turnstile integration on `POST /api/rooms` to prevent automated room creation spam.
- **Signed Direct S3 URLs**: For high concurrency, generate pre-signed R2 S3 URLs using `@aws-sdk/s3-request-presigner` via Cloudflare Worker for direct browser-to-R2 data transfers.
