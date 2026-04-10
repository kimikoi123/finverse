import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Device keys are 32 random bytes from a CSPRNG — high-entropy secrets that
// are NOT user-chosen. Rainbow tables and dictionary attacks don't apply, so
// a fast hash (SHA-256) is cryptographically sufficient. We use timing-safe
// comparison to defeat timing side-channels on the equality check.

export function generateDeviceKey(): string {
  return toBase64Url(randomBytes(32));
}

export function hashDeviceKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function verifyDeviceKey(key: string, storedHashHex: string): boolean {
  const incoming = createHash('sha256').update(key).digest();
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHashHex, 'hex');
  } catch {
    return false;
  }
  if (stored.length !== incoming.length) return false;
  return timingSafeEqual(stored, incoming);
}

// Short-lived pairing tokens use base32 (Crockford-style, no ambiguous
// characters like 0/O or 1/I/L) so they can be read aloud or typed on a
// phone without confusion.
const CROCKFORD_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generatePairToken(length = 6): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CROCKFORD_ALPHABET[bytes[i]! % CROCKFORD_ALPHABET.length];
  }
  return out;
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
