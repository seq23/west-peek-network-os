export interface TokenEnv {
  TOKEN_ENCRYPTION_SECRET?: string;
}

export async function encryptTokenPayload(env: TokenEnv, payload: unknown) {
  if (!env.TOKEN_ENCRYPTION_SECRET) throw new Error('Missing TOKEN_ENCRYPTION_SECRET.');
  const key = await deriveAesKey(env.TOKEN_ENCRYPTION_SECRET);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    algorithm: 'AES-GCM',
    iv: base64UrlBytes(iv),
    ciphertext: base64UrlBytes(new Uint8Array(ciphertext))
  };
}

export async function decryptTokenPayload<T = unknown>(env: TokenEnv, ciphertext: string, iv: string): Promise<T> {
  if (!env.TOKEN_ENCRYPTION_SECRET) throw new Error('Missing TOKEN_ENCRYPTION_SECRET.');
  if (!ciphertext || !iv) throw new Error('Encrypted token payload is incomplete.');
  const key = await deriveAesKey(env.TOKEN_ENCRYPTION_SECRET);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlDecode(iv) },
    key,
    base64UrlDecode(ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveAesKey(secret: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function base64UrlBytes(input: Uint8Array) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
