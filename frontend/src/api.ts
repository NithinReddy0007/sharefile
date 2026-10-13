import type { RoomInfo, RoomFile } from './types';

// Set VITE_API_BASE_URL to your Firebase Function URL, e.g.:
// https://<region>-<project-id>.cloudfunctions.net/api
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}

export function formatApiError(err: any): string {
  if (!isApiConfigured()) {
    return 'Backend API URL is not configured. Set VITE_API_BASE_URL to your Firebase Function URL.';
  }
  const message = err?.message || String(err);
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')) {
    return `Unable to reach the backend at "${API_BASE_URL}". Check that the Firebase Function is deployed and CORS is configured.`;
  }
  return message;
}

// ── helpers ────────────────────────────────────────────────────────────────

async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (netErr) {
    throw new Error(formatApiError(netErr));
  }
  let json: any;
  try { json = await res.json(); } catch {
    throw new Error(`Server returned status ${res.status} with invalid response`);
  }
  if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

// ── Room API ───────────────────────────────────────────────────────────────

export async function createRoom(): Promise<{
  roomId: string; passcode: string; createdAt: number; expiresAt: number;
  maxFileSizeBytes: number; maxRoomSizeBytes: number; maxFilesPerRoom: number; maxConcurrentUploads: number;
}> {
  if (!isApiConfigured()) throw new Error('Backend API URL is not configured.');
  const json = await apiFetch('/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  return json.data;
}

export async function getRoom(roomId: string, passcode: string): Promise<RoomInfo> {
  if (!isApiConfigured()) throw new Error('Backend API URL is not configured.');
  const cleanId = roomId.trim().toUpperCase();
  const json = await apiFetch(`/rooms/${encodeURIComponent(cleanId)}`, {
    headers: { 'X-Room-Passcode': passcode.trim() },
  });
  return json.data;
}

// ── Upload ─────────────────────────────────────────────────────────────────

export interface UploadProgressCallback {
  (loadedBytes: number, totalBytes: number, percent: number): void;
}

/**
 * Upload a file to the room.
 * 1. Ask the API for a signed GCS upload URL.
 * 2. PUT the file directly to that URL (browser → Firebase Storage, no size cap from a function).
 * 3. Confirm the upload with the API so it updates Firestore.
 */
export async function uploadFileToRoom(
  roomId: string,
  passcode: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<void> {
  if (!isApiConfigured()) throw new Error('Backend API URL is not configured.');

  const cleanId      = roomId.trim().toUpperCase();
  const cleanPasscode = passcode.trim();

  // Step 1 – get signed upload URL
  const initJson = await apiFetch(`/rooms/${encodeURIComponent(cleanId)}/files`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Room-Passcode': cleanPasscode },
    body:    JSON.stringify({ filename: file.name, sizeBytes: file.size, contentType: file.type || 'application/octet-stream' }),
  });

  const { fileId, signedUrl } = initJson.data;

  // Step 2 – upload directly to Firebase Storage via signed URL (XHR for progress)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
          onProgress(e.loaded, e.total, pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(file.size, file.size, 100);
        resolve();
      } else {
        reject(new Error(`Storage upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror  = () => reject(new Error('Network error while uploading to storage.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out.'));
    xhr.send(file);
  });

  // Step 3 – confirm upload so Firestore is updated
  await apiFetch(`/rooms/${encodeURIComponent(cleanId)}/files/${encodeURIComponent(fileId)}/confirm`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Room-Passcode': cleanPasscode },
  });
}

// ── Download ───────────────────────────────────────────────────────────────

/**
 * Download a file by fetching a signed read URL from the API, then streaming it.
 */
export async function downloadFile(
  roomId: string,
  passcode: string,
  file: RoomFile,
  onProgress?: (receivedBytes: number, totalBytes: number, percent: number) => void
): Promise<void> {
  if (!isApiConfigured()) throw new Error('Backend API URL is not configured.');

  const cleanId = roomId.trim().toUpperCase();

  const json = await apiFetch(
    `/rooms/${encodeURIComponent(cleanId)}/files/${encodeURIComponent(file.id)}/download`,
    { headers: { 'X-Room-Passcode': passcode.trim() } }
  );

  const { signedUrl, filename, sizeBytes } = json.data;

  // Stream the file and track progress
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`);

  const total = sizeBytes || file.size_bytes || 0;
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (onProgress && total > 0) {
        onProgress(received, total, Math.min(100, Math.round((received / total) * 100)));
      }
    }
  }

  const blob = new Blob(chunks);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename || file.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
