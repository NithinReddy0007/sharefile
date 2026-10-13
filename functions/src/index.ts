import * as functions from 'firebase-functions/v2/https';
import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';

admin.initializeApp();

const db     = admin.firestore();
const bucket = admin.storage().bucket();

// ── Config ──────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MiB
const MAX_ROOM_SIZE_BYTES = 500 * 1024 * 1024; // 500 MiB
const MAX_FILES_PER_ROOM  = 20;
const ROOM_TTL_SECONDS    = 1800;              // 30 min
const SIGNED_URL_TTL_MS   = 15 * 60 * 1000;   // 15 min

// ── Crypto helpers ────────────────────────────────────────────────────────
function generateRoomId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(8);
  let result  = '';
  for (let i = 0; i < 8; i++) result += chars[bytes[i] % chars.length];
  return `${result.slice(0, 4)}-${result.slice(4)}`;
}

function generatePasscode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function hashPasscode(passcode: string, salt: string): Promise<string> {
  return crypto.createHash('sha256').update(`${salt}:${passcode.trim()}`).digest('hex');
}

async function verifyPasscode(passcode: string, salt: string, storedHash: string): Promise<boolean> {
  const computed = await hashPasscode(passcode, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

// ── CORS ──────────────────────────────────────────────────────────────────
function setCors(res: Response, req: Request): void {
  const origin  = req.headers.origin as string | undefined;
  const allowed = [
    'https://nithinreddy0007.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  res.set('Access-Control-Allow-Origin', origin && allowed.includes(origin) ? origin : '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Room-Passcode');
}

// ── Auth helper ───────────────────────────────────────────────────────────
async function requireRoom(roomId: string, passcode: string, res: Response): Promise<FirebaseFirestore.DocumentData | null> {
  const doc = await db.collection('rooms').doc(roomId).get();
  if (!doc.exists) {
    res.status(404).json({ success: false, error: 'Room not found' });
    return null;
  }

  const room = doc.data()!;
  const now  = Math.floor(Date.now() / 1000);

  if (room.expiresAt <= now || room.status !== 'active') {
    if (room.status === 'active') await doc.ref.update({ status: 'expired' });
    res.status(410).json({ success: false, error: 'Room has expired. Files are no longer accessible.' });
    return null;
  }

  const ok = await verifyPasscode(passcode, room.passcodeSalt, room.passcodeHash);
  if (!ok) {
    res.status(403).json({ success: false, error: 'Invalid room passcode' });
    return null;
  }

  return { id: doc.id, ...room };
}

// ── Main HTTP function ────────────────────────────────────────────────────
export const api = functions.onRequest(
  { cors: false, memory: '256MiB', timeoutSeconds: 120 },
  async (req: Request, res: Response): Promise<void> => {
    setCors(res, req);

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Max-Age', '86400');
      res.status(204).send('');
      return;
    }

    const path = (req.path || '/').replace(/\/+$/, '') || '/';

    try {

      // ── Health check ───────────────────────────────────────────────
      if (path === '/' || path === '/health') {
        res.json({ success: true, status: 'healthy', service: 'Qshare API (Firebase)' });
        return;
      }

      // ── POST /rooms  →  Create room ─────────────────────────────
      if (path === '/rooms' && req.method === 'POST') {
        const now       = Math.floor(Date.now() / 1000);
        const roomId    = generateRoomId();
        const passcode  = generatePasscode();
        const salt      = generateSalt();
        const hash      = await hashPasscode(passcode, salt);

        await db.collection('rooms').doc(roomId).set({
          passcodeHash:   hash,
          passcodeSalt:   salt,
          createdAt:      now,
          expiresAt:      now + ROOM_TTL_SECONDS,
          totalSizeBytes: 0,
          status:         'active',
        });

        res.status(201).json({
          success: true,
          data: {
            roomId,
            passcode,
            createdAt:            now,
            expiresAt:            now + ROOM_TTL_SECONDS,
            maxFileSizeBytes:     MAX_FILE_SIZE_BYTES,
            maxRoomSizeBytes:     MAX_ROOM_SIZE_BYTES,
            maxFilesPerRoom:      MAX_FILES_PER_ROOM,
            maxConcurrentUploads: 3,
          },
        });
        return;
      }

      // ── /rooms/:roomId sub-routes ────────────────────────────────
      const roomMatch = path.match(/^\/rooms\/([^/]+)(\/.*)?$/);
      if (!roomMatch) {
        res.status(404).json({ success: false, error: 'Route not found' });
        return;
      }

      const roomId  = decodeURIComponent(roomMatch[1]).toUpperCase();
      const subPath = roomMatch[2] || '';
      const passcode = (req.headers['x-room-passcode'] as string) || (req.query.passcode as string) || '';

      if (!passcode) {
        res.status(401).json({ success: false, error: 'Missing room passcode' });
        return;
      }

      const room = await requireRoom(roomId, passcode, res);
      if (!room) return;

      // ── GET /rooms/:roomId  →  Room details ──────────────────────
      if (subPath === '' && req.method === 'GET') {
        const snap  = await db.collection('rooms').doc(roomId)
          .collection('files').where('status', '==', 'uploaded').get();
        const files = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        res.json({
          success: true,
          data: {
            roomId:               room.id,
            createdAt:            room.createdAt,
            expiresAt:            room.expiresAt,
            totalSizeBytes:       room.totalSizeBytes,
            maxFileSizeBytes:     MAX_FILE_SIZE_BYTES,
            maxRoomSizeBytes:     MAX_ROOM_SIZE_BYTES,
            maxFilesPerRoom:      MAX_FILES_PER_ROOM,
            maxConcurrentUploads: 3,
            files,
          },
        });
        return;
      }

      // ── POST /rooms/:roomId/files  →  Get signed upload URL ──────
      if (subPath === '/files' && req.method === 'POST') {
        const { filename = 'file', sizeBytes, contentType = 'application/octet-stream' } = req.body || {};
        const size = Number(sizeBytes);

        if (!size || isNaN(size) || size <= 0) {
          res.status(400).json({ success: false, error: 'Invalid file size' });
          return;
        }
        if (size > MAX_FILE_SIZE_BYTES) {
          res.status(400).json({ success: false, error: `File exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MiB limit` });
          return;
        }

        const countSnap = await db.collection('rooms').doc(roomId)
          .collection('files').where('status', 'in', ['uploaded', 'pending']).count().get();
        if (countSnap.data().count >= MAX_FILES_PER_ROOM) {
          res.status(400).json({ success: false, error: `Room reached the ${MAX_FILES_PER_ROOM} file limit` });
          return;
        }

        if (room.totalSizeBytes + size > MAX_ROOM_SIZE_BYTES) {
          res.status(400).json({ success: false, error: 'Upload would exceed room capacity' });
          return;
        }

        const fileId      = crypto.randomUUID();
        const safeName    = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `rooms/${roomId}/${fileId}_${safeName}`;
        const now         = Math.floor(Date.now() / 1000);

        const [signedUrl] = await bucket.file(storagePath).getSignedUrl({
          version:     'v4',
          action:      'write',
          expires:     Date.now() + SIGNED_URL_TTL_MS,
          contentType: String(contentType),
        });

        await db.collection('rooms').doc(roomId).collection('files').doc(fileId).set({
          filename:    String(filename),
          sizeBytes:   size,
          contentType: String(contentType),
          storagePath,
          status:      'pending',
          createdAt:   now,
          uploadedAt:  null,
        });

        res.status(201).json({ success: true, data: { fileId, signedUrl, storagePath } });
        return;
      }

      // ── POST /rooms/:roomId/files/:fileId/confirm  →  Mark uploaded ─
      const confirmMatch = subPath.match(/^\/files\/([^/]+)\/confirm$/);
      if (confirmMatch && req.method === 'POST') {
        const fileId  = confirmMatch[1];
        const fileRef = db.collection('rooms').doc(roomId).collection('files').doc(fileId);
        const fileDoc = await fileRef.get();

        if (!fileDoc.exists) {
          res.status(404).json({ success: false, error: 'File not found' });
          return;
        }

        const fileData = fileDoc.data()!;
        const now      = Math.floor(Date.now() / 1000);

        await db.runTransaction(async (tx) => {
          tx.update(fileRef, { status: 'uploaded', uploadedAt: now });
          tx.update(db.collection('rooms').doc(roomId), {
            totalSizeBytes: admin.firestore.FieldValue.increment(fileData.sizeBytes),
          });
        });

        res.json({ success: true, message: 'File confirmed' });
        return;
      }

      // ── GET /rooms/:roomId/files/:fileId/download  →  Signed read URL ─
      const downloadMatch = subPath.match(/^\/files\/([^/]+)\/download$/);
      if (downloadMatch && req.method === 'GET') {
        const fileId  = downloadMatch[1];
        const fileDoc = await db.collection('rooms').doc(roomId).collection('files').doc(fileId).get();

        if (!fileDoc.exists || fileDoc.data()?.status !== 'uploaded') {
          res.status(404).json({ success: false, error: 'File not available' });
          return;
        }

        const fd = fileDoc.data()!;
        const [signedUrl] = await bucket.file(fd.storagePath).getSignedUrl({
          version:             'v4',
          action:              'read',
          expires:             Date.now() + SIGNED_URL_TTL_MS,
          responseDisposition: `attachment; filename="${String(fd.filename).replace(/"/g, '')}"`,
        });

        res.json({ success: true, data: { signedUrl, filename: fd.filename, sizeBytes: fd.sizeBytes } });
        return;
      }

      // ── DELETE /rooms/:roomId/files/:fileId  →  Remove file ──────
      const fileMatch = subPath.match(/^\/files\/([^/]+)$/);
      if (fileMatch && req.method === 'DELETE') {
        const fileId  = fileMatch[1];
        const fileRef = db.collection('rooms').doc(roomId).collection('files').doc(fileId);
        const fileDoc = await fileRef.get();

        if (!fileDoc.exists) {
          res.status(404).json({ success: false, error: 'File not found' });
          return;
        }

        const { storagePath, sizeBytes } = fileDoc.data()!;
        try { await bucket.file(storagePath).delete(); } catch { /* ignore */ }

        await db.runTransaction(async (tx) => {
          tx.delete(fileRef);
          tx.update(db.collection('rooms').doc(roomId), {
            totalSizeBytes: admin.firestore.FieldValue.increment(-sizeBytes),
          });
        });

        res.json({ success: true, message: 'File deleted' });
        return;
      }

      res.status(404).json({ success: false, error: 'Endpoint not found' });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('Unhandled error:', err);
      res.status(500).json({ success: false, error: message });
    }
  }
);

// ── Scheduled cleanup (every 10 minutes) ─────────────────────────────────
export const cleanup = scheduler.onSchedule('every 10 minutes', async () => {
  const now  = Math.floor(Date.now() / 1000);
  const snap = await db.collection('rooms')
    .where('expiresAt', '<=', now)
    .where('status', '==', 'active')
    .limit(50)
    .get();

  const tasks = snap.docs.map(async (roomDoc) => {
    const filesSnap = await roomDoc.ref.collection('files').get();
    await Promise.all(
      filesSnap.docs.map(async (f) => {
        try { await bucket.file(f.data().storagePath).delete(); } catch { /* ignore */ }
        await f.ref.delete();
      })
    );
    await roomDoc.ref.update({ status: 'expired' });
  });

  await Promise.all(tasks);
  console.log(`Cleanup: marked ${snap.size} rooms as expired`);
});
