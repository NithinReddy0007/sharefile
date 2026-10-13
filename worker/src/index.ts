import { Env, RoomRecord, FileRecord } from './types';
import {
  generateRoomId,
  generatePasscode,
  generateSalt,
  hashPasscode,
  verifyPasscode
} from './crypto';

// In-memory or timestamp-based rate limiter per IP
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = ipRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

export function handleCors(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get('Origin') || '*';
  const allowed = env.ALLOWED_ORIGIN || '*';

  if (allowed === '*' || allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else {
    headers.set('Access-Control-Allow-Origin', allowed);
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Room-Passcode, Range');
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Disposition, ETag');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

export function jsonResponse(data: any, status = 200, corsHeaders?: Headers): Response {
  const headers = corsHeaders ? new Headers(corsHeaders) : new Headers();
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

/**
 * Clean up expired rooms and their R2 objects
 */
export async function cleanupExpiredRooms(env: Env): Promise<{ deletedRooms: number; deletedFiles: number }> {
  const now = Math.floor(Date.now() / 1000);

  // Find up to 50 expired or marked rooms to clean up per cycle
  const expiredRooms = await env.DB.prepare(
    `SELECT id FROM rooms WHERE expires_at <= ? OR status = 'expired' LIMIT 50`
  ).bind(now).all<RoomRecord>();

  let deletedRoomsCount = 0;
  let deletedFilesCount = 0;

  if (!expiredRooms.results || expiredRooms.results.length === 0) {
    return { deletedRooms: 0, deletedFiles: 0 };
  }

  for (const room of expiredRooms.results) {
    // 1. Get all files for this room
    const files = await env.DB.prepare(
      `SELECT id, storage_key FROM files WHERE room_id = ?`
    ).bind(room.id).all<{ id: string; storage_key: string }>();

    if (files.results && files.results.length > 0) {
      // Delete objects from R2
      const keys = files.results.map(f => f.storage_key);
      try {
        await env.BUCKET.delete(keys);
        deletedFilesCount += keys.length;
      } catch (err) {
        console.error(`Failed to delete R2 files for room ${room.id}:`, err);
      }
    }

    // 2. Delete database records
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM files WHERE room_id = ?`).bind(room.id),
      env.DB.prepare(`DELETE FROM rooms WHERE id = ?`).bind(room.id)
    ]);

    deletedRoomsCount++;
  }

  return { deletedRooms: deletedRoomsCount, deletedFiles: deletedFilesCount };
}

export default {
  /**
   * Cloudflare Cron Trigger (Scheduled cleanup)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(cleanupExpiredRooms(env));
  },

  /**
   * HTTP Fetch Handler
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = handleCors(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
    if (!checkRateLimit(ip, 120, 60_000)) {
      return jsonResponse({ success: false, error: 'Rate limit exceeded. Please wait a moment.' }, 429, corsHeaders);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, ''); // strip trailing slash

    try {
      // Health check & cleanup trigger route
      if (path === '' || path === '/api/health') {
        return jsonResponse({
          success: true,
          status: 'healthy',
          service: 'Qshare API',
          timestamp: Math.floor(Date.now() / 1000)
        }, 200, corsHeaders);
      }

      // Explicit cleanup trigger endpoint (can be called manually or by external webhooks)
      if (path === '/api/cleanup' && request.method === 'POST') {
        const result = await cleanupExpiredRooms(env);
        return jsonResponse({ success: true, ...result }, 200, corsHeaders);
      }

      // ==========================================
      // 1. CREATE ROOM: POST /api/rooms
      // ==========================================
      if (path === '/api/rooms' && request.method === 'POST') {
        const now = Math.floor(Date.now() / 1000);
        const ttl = Number(env.ROOM_TTL_SECONDS || 1800); // 30 minutes default
        const expiresAt = now + ttl;

        const roomId = generateRoomId();
        const passcode = generatePasscode();
        const salt = generateSalt();
        const hash = await hashPasscode(passcode, salt);

        await env.DB.prepare(
          `INSERT INTO rooms (id, passcode_hash, passcode_salt, created_at, expires_at, total_size_bytes, status)
           VALUES (?, ?, ?, ?, ?, 0, 'active')`
        ).bind(roomId, hash, salt, now, expiresAt).run();

        return jsonResponse({
          success: true,
          data: {
            roomId,
            passcode,
            createdAt: now,
            expiresAt,
            maxFileSizeBytes: Number(env.MAX_FILE_SIZE_BYTES || 524288000), // 500 MB
            maxRoomSizeBytes: Number(env.MAX_ROOM_SIZE_BYTES || 1073741824)  // 1 GB
          }
        }, 201, corsHeaders);
      }

      // Match /api/rooms/:roomId or sub-routes
      const roomMatch = path.match(/^\/api\/rooms\/([^/]+)(.*)$/);
      if (!roomMatch) {
        return jsonResponse({ success: false, error: 'Route not found' }, 404, corsHeaders);
      }

      const roomId = decodeURIComponent(roomMatch[1]).toUpperCase();
      const subPath = roomMatch[2]; // e.g. "", "/files", "/files/:fileId", "/files/:fileId/part"

      // Authorization: Check room existence & passcode
      const passcodeHeader = request.headers.get('X-Room-Passcode');
      const authHeader = request.headers.get('Authorization');
      const queryPasscode = url.searchParams.get('passcode');

      const clientPasscode = passcodeHeader || queryPasscode || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

      if (!clientPasscode) {
        return jsonResponse({ success: false, error: 'Missing room passcode' }, 401, corsHeaders);
      }

      // Fetch room
      const room = await env.DB.prepare(
        `SELECT * FROM rooms WHERE id = ?`
      ).bind(roomId).first<RoomRecord>();

      if (!room) {
        return jsonResponse({ success: false, error: 'Room not found' }, 404, corsHeaders);
      }

      const now = Math.floor(Date.now() / 1000);
      if (room.expires_at <= now || room.status !== 'active') {
        // Mark room as expired if not already
        if (room.status === 'active') {
          await env.DB.prepare(`UPDATE rooms SET status = 'expired' WHERE id = ?`).bind(roomId).run();
        }
        return jsonResponse({ success: false, error: 'Room has expired. Files are no longer accessible.' }, 410, corsHeaders);
      }

      const isAuthorized = await verifyPasscode(clientPasscode, room.passcode_salt, room.passcode_hash);
      if (!isAuthorized) {
        return jsonResponse({ success: false, error: 'Invalid room passcode' }, 403, corsHeaders);
      }

      const maxFileSizeBytes = Number(env.MAX_FILE_SIZE_BYTES || 524288000); // 500 MB
      const maxRoomSizeBytes = Number(env.MAX_ROOM_SIZE_BYTES || 1073741824); // 1 GB

      // ==========================================
      // 2. GET ROOM DETAILS: GET /api/rooms/:roomId
      // ==========================================
      if (subPath === '' && request.method === 'GET') {
        const files = await env.DB.prepare(
          `SELECT id, filename, size_bytes, content_type, status, uploaded_at, created_at 
           FROM files WHERE room_id = ? AND status = 'uploaded'`
        ).bind(roomId).all();

        return jsonResponse({
          success: true,
          data: {
            roomId: room.id,
            createdAt: room.created_at,
            expiresAt: room.expires_at,
            totalSizeBytes: room.total_size_bytes,
            maxFileSizeBytes,
            maxRoomSizeBytes,
            files: files.results || []
          }
        }, 200, corsHeaders);
      }

      // ==========================================
      // 3. INITIATE FILE UPLOAD: POST /api/rooms/:roomId/files
      // ==========================================
      if (subPath === '/files' && request.method === 'POST') {
        const body = await request.json() as { filename?: string; sizeBytes?: number; contentType?: string };
        const filename = (body.filename || 'unnamed-file').trim();
        const sizeBytes = Number(body.sizeBytes);
        const contentType = body.contentType || 'application/octet-stream';

        if (!sizeBytes || sizeBytes <= 0) {
          return jsonResponse({ success: false, error: 'Invalid file size' }, 400, corsHeaders);
        }

        if (sizeBytes > maxFileSizeBytes) {
          return jsonResponse({
            success: false,
            error: `File exceeds maximum allowed size of ${Math.round(maxFileSizeBytes / (1024 * 1024))}MB`
          }, 400, corsHeaders);
        }

        if (room.total_size_bytes + sizeBytes > maxRoomSizeBytes) {
          return jsonResponse({
            success: false,
            error: `Upload would exceed remaining room capacity (${Math.round((maxRoomSizeBytes - room.total_size_bytes) / (1024 * 1024))}MB remaining)`
          }, 400, corsHeaders);
        }

        const fileId = crypto.randomUUID();
        // Storage key isolates files by room: "rooms/{roomId}/{fileId}/{safeFilename}"
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageKey = `rooms/${roomId}/${fileId}_${safeName}`;

        let uploadId: string | null = null;
        // For files > 50MB, initialize R2 multipart upload
        if (sizeBytes > 50 * 1024 * 1024) {
          const multipart = await env.BUCKET.createMultipartUpload(storageKey, {
            httpMetadata: { contentType }
          });
          uploadId = multipart.uploadId;
        }

        await env.DB.prepare(
          `INSERT INTO files (id, room_id, filename, size_bytes, content_type, storage_key, status, upload_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        ).bind(fileId, roomId, filename, sizeBytes, contentType, storageKey, uploadId, now).run();

        return jsonResponse({
          success: true,
          data: {
            fileId,
            filename,
            sizeBytes,
            uploadId,
            storageKey,
            isMultipart: !!uploadId
          }
        }, 201, corsHeaders);
      }

      // ==========================================
      // 4. UPLOAD BODY / CHUNK
      // ==========================================
      const fileMatch = subPath.match(/^\/files\/([^/]+)(\/.*)?$/);
      if (fileMatch) {
        const fileId = fileMatch[1];
        const action = fileMatch[2] || '';

        const file = await env.DB.prepare(
          `SELECT * FROM files WHERE id = ? AND room_id = ?`
        ).bind(fileId, roomId).first<FileRecord>();

        if (!file) {
          return jsonResponse({ success: false, error: 'File record not found' }, 404, corsHeaders);
        }

        // Direct single-put body upload: PUT /api/rooms/:roomId/files/:fileId
        if (action === '' && request.method === 'PUT') {
          if (!request.body) {
            return jsonResponse({ success: false, error: 'Missing request body' }, 400, corsHeaders);
          }

          // Stream body directly into R2
          await env.BUCKET.put(file.storage_key, request.body, {
            httpMetadata: {
              contentType: file.content_type
            },
            customMetadata: {
              roomId,
              filename: file.filename
            }
          });

          // Mark file as uploaded and update room total size
          await env.DB.batch([
            env.DB.prepare(
              `UPDATE files SET status = 'uploaded', uploaded_at = ? WHERE id = ?`
            ).bind(now, fileId),
            env.DB.prepare(
              `UPDATE rooms SET total_size_bytes = total_size_bytes + ? WHERE id = ?`
            ).bind(file.size_bytes, roomId)
          ]);

          return jsonResponse({ success: true, message: 'File uploaded successfully' }, 200, corsHeaders);
        }

        // Upload single part for multipart upload: PUT /api/rooms/:roomId/files/:fileId/part?partNumber=X
        if (action === '/part' && request.method === 'PUT') {
          const partNumber = Number(url.searchParams.get('partNumber'));
          if (!partNumber || !file.upload_id) {
            return jsonResponse({ success: false, error: 'Invalid multipart upload or partNumber' }, 400, corsHeaders);
          }

          if (!request.body) {
            return jsonResponse({ success: false, error: 'Missing part body' }, 400, corsHeaders);
          }

          const multipart = env.BUCKET.resumeMultipartUpload(file.storage_key, file.upload_id);
          const uploadedPart = await multipart.uploadPart(partNumber, request.body);

          return jsonResponse({
            success: true,
            partNumber,
            etag: uploadedPart.etag
          }, 200, corsHeaders);
        }

        // Complete multipart upload: POST /api/rooms/:roomId/files/:fileId/complete
        if (action === '/complete' && request.method === 'POST') {
          if (!file.upload_id) {
            return jsonResponse({ success: false, error: 'File is not a multipart upload' }, 400, corsHeaders);
          }

          const body = await request.json() as { parts: { partNumber: number; etag: string }[] };
          if (!body.parts || !Array.isArray(body.parts)) {
            return jsonResponse({ success: false, error: 'Missing parts array' }, 400, corsHeaders);
          }

          const multipart = env.BUCKET.resumeMultipartUpload(file.storage_key, file.upload_id);
          await multipart.complete(body.parts);

          await env.DB.batch([
            env.DB.prepare(
              `UPDATE files SET status = 'uploaded', uploaded_at = ? WHERE id = ?`
            ).bind(now, fileId),
            env.DB.prepare(
              `UPDATE rooms SET total_size_bytes = total_size_bytes + ? WHERE id = ?`
            ).bind(file.size_bytes, roomId)
          ]);

          return jsonResponse({ success: true, message: 'Multipart file completed successfully' }, 200, corsHeaders);
        }

        // Abort multipart upload: POST /api/rooms/:roomId/files/:fileId/abort
        if (action === '/abort' && request.method === 'POST') {
          if (file.upload_id) {
            const multipart = env.BUCKET.resumeMultipartUpload(file.storage_key, file.upload_id);
            await multipart.abort();
          }
          await env.DB.prepare(`DELETE FROM files WHERE id = ?`).bind(fileId).run();
          return jsonResponse({ success: true, message: 'Upload aborted' }, 200, corsHeaders);
        }

        // ==========================================
        // 5. DOWNLOAD FILE: GET /api/rooms/:roomId/files/:fileId/download
        // ==========================================
        if (action === '/download' && request.method === 'GET') {
          if (file.status !== 'uploaded') {
            return jsonResponse({ success: false, error: 'File is not yet available for download' }, 400, corsHeaders);
          }

          // Support Range headers for resuming/chunked downloads
          const rangeHeader = request.headers.get('Range');
          let range: R2Range | undefined = undefined;

          if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
            if (match) {
              const start = parseInt(match[1], 10);
              const end = match[2] ? parseInt(match[2], 10) : undefined;
              range = {
                offset: start,
                length: end !== undefined ? end - start + 1 : undefined
              };
            }
          }

          const r2Object = await env.BUCKET.get(file.storage_key, {
            range
          });

          if (!r2Object) {
            return jsonResponse({ success: false, error: 'File not found in storage' }, 404, corsHeaders);
          }

          const responseHeaders = new Headers(corsHeaders);
          responseHeaders.set('Content-Type', file.content_type || 'application/octet-stream');
          // RFC 5987 encoded filename for safe unicode & spaces
          const encodedFilename = encodeURIComponent(file.filename);
          responseHeaders.set('Content-Disposition', `attachment; filename="${file.filename.replace(/"/g, '')}"; filename*=UTF-8''${encodedFilename}`);
          responseHeaders.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

          if ('range' in r2Object && r2Object.range) {
            const r = r2Object.range as { offset: number; length: number };
            responseHeaders.set('Content-Range', `bytes ${r.offset}-${r.offset + r.length - 1}/${file.size_bytes}`);
            responseHeaders.set('Content-Length', r.length.toString());
            return new Response(r2Object.body, {
              status: 206,
              headers: responseHeaders
            });
          }

          responseHeaders.set('Content-Length', r2Object.size.toString());
          return new Response(r2Object.body, {
            status: 200,
            headers: responseHeaders
          });
        }
      }

      return jsonResponse({ success: false, error: 'Endpoint not found' }, 404, corsHeaders);

    } catch (err: any) {
      console.error('Unhandled worker error:', err);
      return jsonResponse({
        success: false,
        error: err?.message || 'Internal server error'
      }, 500, corsHeaders);
    }
  }
};
