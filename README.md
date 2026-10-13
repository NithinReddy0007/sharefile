# Qshare

> Lightweight, zero-account temporary file-sharing web app built with React, Vite, TypeScript, and Firebase (Functions + Firestore + Storage).

---

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite. Hosted on GitHub Pages.
- **Backend API**: Firebase Cloud Functions (Node.js) — room creation, passcode auth, signed URL generation, scheduled cleanup.
- **Database**: Firestore — room metadata, file metadata, expiration timestamps.
- **Storage**: Firebase Storage — uploaded file objects, accessed via short-lived signed URLs.

Files upload **directly from the browser to Firebase Storage** via signed URLs (no data flows through the Function), so uploads are fast and not bottlenecked by function memory.

---

## Local Development

### 1. Prerequisites
- Node.js v18+ / npm v9+
- Firebase CLI: `npm install -g firebase-tools`

### 2. Install dependencies
```bash
# Frontend
npm --prefix frontend install

# Firebase Functions
npm --prefix functions install
```

### 3. Configure environment
```bash
cp .env.example frontend/.env
```
Edit `frontend/.env` and set:
```env
# Replace <project-id> with your actual Firebase project ID
VITE_API_BASE_URL=http://127.0.0.1:5001/<project-id>/us-central1/api
```

### 4. Start emulators + frontend

Terminal 1 – Firebase emulators:
```bash
firebase emulators:start --only functions,firestore,storage
```

Terminal 2 – Vite frontend:
```bash
npm --prefix frontend run dev
```

Open `http://localhost:5173`.

---

## Firebase Deployment

### 1. Create a Firebase project
Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.

### 2. Log in and select project
```bash
firebase login
firebase use --add   # pick your project
```

### 3. Enable required services in the Firebase console
- **Firestore** → Create database (production mode)
- **Storage** → Get started
- **Functions** → (requires Blaze pay-as-you-go plan)

### 4. Deploy everything
```bash
firebase deploy
```
This deploys Functions, Firestore rules, and Storage rules in one step.

### 5. Get your Function URL
After deploy you'll see something like:
```
Function URL (api): https://us-central1-<project-id>.cloudfunctions.net/api
```
Set that as `VITE_API_BASE_URL` in your GitHub repository variables.

---

## GitHub Pages Deployment

The repository includes `.github/workflows/deploy.yml` for automatic builds on push to `main`.

In GitHub → Settings → Secrets and variables → Actions → **Variables**:
- `VITE_API_BASE_URL` = `https://us-central1-<project-id>.cloudfunctions.net/api`

---

## Scheduled Cleanup

Rooms expire 30 minutes after creation. The `cleanup` Cloud Function runs on a schedule every 10 minutes, marks expired rooms, and deletes their Storage files from Firestore.

---

## Firebase Free Tier Limits (Spark plan)

| Resource | Free allowance |
|---|---|
| Cloud Functions invocations | 2M / month |
| Firestore reads | 50K / day |
| Firestore writes | 20K / day |
| Storage stored data | 5 GB |
| Storage download | 1 GB / day |

> **Note**: Scheduled Cloud Functions (Cloud Scheduler) require the **Blaze** (pay-as-you-go) plan. All other services work on the free Spark plan.
