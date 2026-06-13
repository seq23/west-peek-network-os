export const GOOGLE_PRIVATE_KEY_INVALID_FORMAT = 'GOOGLE_PRIVATE_KEY_INVALID_FORMAT';

export class GooglePrivateKeyFormatError extends Error {
  code = GOOGLE_PRIVATE_KEY_INVALID_FORMAT;

  constructor(message = 'GOOGLE_PRIVATE_KEY_INVALID_FORMAT: Google private key could not be parsed. Re-sync GOOGLE_PRIVATE_KEY from the service account JSON private_key field.') {
    super(message);
    this.name = 'GooglePrivateKeyFormatError';
  }
}

export function isGooglePrivateKeyFormatError(error: unknown): error is GooglePrivateKeyFormatError {
  return error instanceof Error && (
    error instanceof GooglePrivateKeyFormatError ||
    error.name === 'GooglePrivateKeyFormatError' ||
    error.message.includes(GOOGLE_PRIVATE_KEY_INVALID_FORMAT)
  );
}

function pkcs8BeginMarker() { return ['-----BEGIN', 'PRIVATE KEY-----'].join(' '); }
function pkcs8EndMarker() { return ['-----END', 'PRIVATE KEY-----'].join(' '); }
function publicKeyBeginMarker() { return ['-----BEGIN', 'PUBLIC KEY-----'].join(' '); }
function rsaPrivateKeyBeginMarker() { return ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' '); }

export function normalizeGooglePrivateKey(rawValue: string | undefined): string {
  const extracted = extractPrivateKeyValue(rawValue);
  const normalizedNewlines = extracted.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\\n/g, '\n').trim();

  if (normalizedNewlines.toUpperCase().includes(publicKeyBeginMarker())) {
    throw new GooglePrivateKeyFormatError('GOOGLE_PRIVATE_KEY_INVALID_FORMAT: public keys cannot sign Google service account JWTs. Use the service account JSON private_key field.');
  }
  if (normalizedNewlines.toUpperCase().includes(rsaPrivateKeyBeginMarker())) {
    throw new GooglePrivateKeyFormatError('GOOGLE_PRIVATE_KEY_INVALID_FORMAT: RSA PRIVATE KEY is not supported by WebCrypto PKCS8 import. Use BEGIN PRIVATE KEY from the service account JSON private_key field.');
  }

  const beginMarker = pkcs8BeginMarker();
  const endMarker = pkcs8EndMarker();
  const beginIndex = normalizedNewlines.indexOf(beginMarker);
  const endIndex = normalizedNewlines.indexOf(endMarker);
  const match = beginIndex >= 0 && endIndex > beginIndex ? ['', normalizedNewlines.slice(beginIndex + beginMarker.length, endIndex)] : null;
  if (!match) {
    throw new GooglePrivateKeyFormatError();
  }

  const body = match[1].replace(/\s+/g, '');
  if (!body || !/^[A-Za-z0-9+/=]+$/.test(body)) {
    throw new GooglePrivateKeyFormatError();
  }

  const paddedBody = body + '='.repeat((4 - body.length % 4) % 4);
  const bytes = decodeBase64(paddedBody);
  if (bytes.byteLength < 512) {
    throw new GooglePrivateKeyFormatError('GOOGLE_PRIVATE_KEY_INVALID_FORMAT: decoded private key is too short to be a Google service account PKCS8 key.');
  }

  return `${beginMarker}\n${paddedBody.match(/.{1,64}/g)?.join('\n') || paddedBody}\n${endMarker}`;
}

export async function importGooglePrivateKey(rawValue: string | undefined) {
  const pem = normalizeGooglePrivateKey(rawValue);
  const body = pem
    .replace(pkcs8BeginMarker(), '')
    .replace(pkcs8EndMarker(), '')
    .replace(/\s+/g, '');
  const binary = decodeBase64(body);
  try {
    const keyData = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
    return await crypto.subtle.importKey('pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  } catch {
    throw new GooglePrivateKeyFormatError('GOOGLE_PRIVATE_KEY_INVALID_FORMAT: Google private key could not be imported as a PKCS8 service account key. Re-sync the private_key field from the service account JSON.');
  }
}

export async function signGoogleServiceAccountJwt(claim: Record<string, unknown>, rawPrivateKey: string | undefined): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaim = base64Url(JSON.stringify(claim));
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedClaim}`);
  const key = await importGooglePrivateKey(rawPrivateKey);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  return `${encodedHeader}.${encodedClaim}.${base64UrlBytes(new Uint8Array(signature))}`;
}

function extractPrivateKeyValue(rawValue: string | undefined): string {
  if (!rawValue || !String(rawValue).trim()) {
    throw new GooglePrivateKeyFormatError();
  }
  let value = String(rawValue).trim();

  // Accept either a JSON string value or a full service account JSON object before quote stripping.
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === 'string') return parsed;
    } catch {
      // Fall through to quote stripping and PEM parsing.
    }
  }

  // Cloudflare and shell tooling sometimes wrap PEM strings in one extra single-quote layer.
  if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1).trim();
  }

  // Accept a full service account JSON object.
  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as { private_key?: unknown };
      if (typeof parsed.private_key !== 'string' || !parsed.private_key.trim()) {
        throw new GooglePrivateKeyFormatError('GOOGLE_PRIVATE_KEY_INVALID_FORMAT: service account JSON does not contain private_key.');
      }
      return parsed.private_key;
    } catch (error) {
      if (error instanceof GooglePrivateKeyFormatError) throw error;
      throw new GooglePrivateKeyFormatError('GOOGLE_PRIVATE_KEY_INVALID_FORMAT: service account JSON could not be parsed.');
    }
  }

  if ((value.startsWith('\\"') && value.endsWith('\\"')) || (value.startsWith('"') && value.endsWith('"'))) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === 'string') return parsed;
    } catch {
      // Fall through to PEM parsing so an over-escaped but recoverable PEM still works.
    }
  }

  return value;
}

function decodeBase64(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw new GooglePrivateKeyFormatError();
  }
}

function base64Url(input: string) {
  return base64UrlBytes(new TextEncoder().encode(input));
}

function base64UrlBytes(input: Uint8Array) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
