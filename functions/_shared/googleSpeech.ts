import { signGoogleServiceAccountJwt } from './googlePrivateKey';

export interface GoogleSpeechEnv {
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_CLOUD_PROJECT_ID?: string;
  GOOGLE_SPEECH_LOCATION?: string;
}

const SPEECH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export function assertGoogleSpeechConfigured(env: GoogleSpeechEnv) {
  const missing = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLOUD_PROJECT_ID'].filter((key) => !env[key as keyof GoogleSpeechEnv]);
  if (missing.length) throw new Error(`Google Speech-to-Text runtime is not configured. Missing: ${missing.join(', ')}`);
}

export async function transcribeAudioWithGoogle(env: GoogleSpeechEnv, file: File): Promise<{ transcript: string; provider: string; model: string; confidence: 'low' | 'medium' | 'high'; language_code: string; duration_hint: string }> {
  assertGoogleSpeechConfigured(env);
  if (file.size > MAX_AUDIO_BYTES) throw new Error(`Audio file must be ${Math.floor(MAX_AUDIO_BYTES / 1024 / 1024)}MB or smaller.`);
  const token = await getServiceAccountToken(env);
  const content = base64UrlToStandard(base64UrlBytes(new Uint8Array(await file.arrayBuffer())));
  const location = env.GOOGLE_SPEECH_LOCATION || 'global';
  const projectId = env.GOOGLE_CLOUD_PROJECT_ID || '';
  const url = `https://speech.googleapis.com/v2/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/recognizers/_:recognize`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        autoDecodingConfig: {},
        languageCodes: ['en-US'],
        model: 'latest_long',
        features: { enableAutomaticPunctuation: true }
      },
      content
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Google Speech-to-Text request failed: ${response.status} ${text}`);
  const payload = JSON.parse(text) as { results?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }>; languageCode?: string }> };
  const alternatives = (payload.results || []).flatMap((result) => result.alternatives || []);
  const transcript = alternatives.map((alt) => alt.transcript || '').filter(Boolean).join('\n').trim();
  if (!transcript) throw new Error('Google Speech-to-Text returned no transcript.');
  const avgConfidence = alternatives.length ? alternatives.reduce((sum, alt) => sum + (typeof alt.confidence === 'number' ? alt.confidence : 0.65), 0) / alternatives.length : 0.65;
  return {
    transcript,
    provider: 'google_speech_to_text',
    model: 'latest_long',
    confidence: avgConfidence >= 0.82 ? 'high' : avgConfidence >= 0.55 ? 'medium' : 'low',
    language_code: payload.results?.[0]?.languageCode || 'en-US',
    duration_hint: `${Math.round(file.size / 1024)}KB uploaded`
  };
}

async function getServiceAccountToken(env: GoogleSpeechEnv): Promise<string> {
  assertGoogleSpeechConfigured(env);
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SPEECH_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const jwt = await signGoogleServiceAccountJwt(claim, env.GOOGLE_PRIVATE_KEY);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error('Google token exchange did not return access_token.');
  return payload.access_token;
}

function base64UrlToStandard(input: string) {
  const converted = input.replace(/-/g, '+').replace(/_/g, '/');
  return converted.padEnd(converted.length + (4 - converted.length % 4) % 4, '=');
}

function base64UrlBytes(input: Uint8Array) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
