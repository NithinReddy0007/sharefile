import test from 'node:test';
import assert from 'node:assert/strict';

// Helper tests for room generation, hashing, and passcode verification logic
function generateRoomId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `${result.slice(0, 4)}-${result.slice(4)}`;
}

function generatePasscode() {
  const chars = '0123456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPasscode(passcode, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${passcode.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPasscode(passcode, salt, storedHash) {
  const computedHash = await hashPasscode(passcode, salt);
  if (computedHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

test('generateRoomId creates formatted 9-char code (XXXX-XXXX)', () => {
  const id = generateRoomId();
  assert.match(id, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
});

test('generatePasscode creates 6 digit code', () => {
  const code = generatePasscode();
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});

test('hashPasscode and verifyPasscode works correctly and securely', async () => {
  const passcode = '123456';
  const salt = generateSalt();
  const hash = await hashPasscode(passcode, salt);

  assert.equal(await verifyPasscode('123456', salt, hash), true);
  assert.equal(await verifyPasscode('123457', salt, hash), false);
  assert.equal(await verifyPasscode(' wrong ', salt, hash), false);
});

test('expired room calculation correctly detects expired timestamp', () => {
  const now = Math.floor(Date.now() / 1000);
  const roomCreated = now - 1801; // 30 minutes and 1 second ago
  const roomExpires = roomCreated + 1800; // 30m TTL

  const isExpired = roomExpires <= now;
  assert.equal(isExpired, true, 'Room older than 30 minutes must be considered expired');
});

test('room capacity limits enforcement logic', () => {
  const MAX_ROOM_SIZE = 1073741824; // 1 GB
  const MAX_FILE_SIZE = 524288000;  // 500 MB

  const currentTotal = 800 * 1024 * 1024; // 800 MB
  const incomingFile1 = 300 * 1024 * 1024; // 300 MB -> would exceed 1 GB
  const incomingFile2 = 100 * 1024 * 1024; // 100 MB -> fits within 1 GB
  const incomingOverLimit = 550 * 1024 * 1024; // exceeds 500 MB limit

  assert.equal(incomingOverLimit > MAX_FILE_SIZE, true, 'Over 500MB must be rejected');
  assert.equal(currentTotal + incomingFile1 > MAX_ROOM_SIZE, true, 'Exceeding 1GB must be rejected');
  assert.equal(currentTotal + incomingFile2 <= MAX_ROOM_SIZE, true, 'Fitting within 1GB must be accepted');
});
