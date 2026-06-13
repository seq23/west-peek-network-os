import { expect, test } from '@playwright/test';
import { GOOGLE_PRIVATE_KEY_INVALID_FORMAT, GooglePrivateKeyFormatError, normalizeGooglePrivateKey, signGoogleServiceAccountJwt } from '../../functions/_shared/googlePrivateKey';

const PKCS8_BEGIN = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
const PKCS8_END = ['-----END', 'PRIVATE KEY-----'].join(' ');
const PUBLIC_BEGIN = ['-----BEGIN', 'PUBLIC KEY-----'].join(' ');
const PUBLIC_END = ['-----END', 'PUBLIC KEY-----'].join(' ');
const RSA_BEGIN = ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ');
const RSA_END = ['-----END RSA', 'PRIVATE KEY-----'].join(' ');

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function makePem() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
  const body = toBase64(pkcs8).match(/.{1,64}/g)?.join('\n') || '';
  return `${PKCS8_BEGIN}\n${body}\n${PKCS8_END}`;
}

test.describe('Google private key parsing contract', () => {
  test('accepts PEM, escaped-newline PEM, quoted PEM, and service-account JSON private_key values', async () => {
    const pem = await makePem();
    const escaped = pem.replace(/\n/g, '\\n');
    const quoted = JSON.stringify(escaped);
    const serviceAccountJson = JSON.stringify({ type: 'service_account', client_email: 'svc@example.iam.gserviceaccount.com', private_key: escaped });

    for (const [label, value] of [['pem', pem], ['escaped', escaped], ['quoted', quoted], ['serviceAccountJson', serviceAccountJson]] as const) {
      let normalized = '';
      try { normalized = normalizeGooglePrivateKey(value); } catch (error) { throw new Error(`${label}: ${(error as Error).message}`); }
      expect(normalized).toContain(PKCS8_BEGIN);
      expect(normalized).toContain(PKCS8_END);
      const jwt = await signGoogleServiceAccountJwt({ iss: 'svc@example.iam.gserviceaccount.com', aud: 'https://oauth2.googleapis.com/token', iat: 1, exp: 2 }, value);
      expect(jwt.split('.')).toHaveLength(3);
    }
  });

  test('rejects malformed invalid base64, public keys, RSA private keys, and JSON without private_key with controlled error', async () => {
    const badValues = [
      '',
      `${PKCS8_BEGIN}\nnot valid!!!\n${PKCS8_END}`,
      `${PUBLIC_BEGIN}\nQUJD\n${PUBLIC_END}`,
      `${RSA_BEGIN}\nQUJD\n${RSA_END}`,
      JSON.stringify({ type: 'service_account' })
    ];

    for (const value of badValues) {
      expect(() => normalizeGooglePrivateKey(value)).toThrow(GooglePrivateKeyFormatError);
      try {
        normalizeGooglePrivateKey(value);
      } catch (error) {
        expect((error as Error).message).toContain(GOOGLE_PRIVATE_KEY_INVALID_FORMAT);
      }
      expect(() => normalizeGooglePrivateKey(value)).not.toThrow(/atob\(\) called/i);
    }
  });
});
