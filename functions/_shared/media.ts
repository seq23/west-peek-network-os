export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export type MediaKind = 'business_card' | 'notes_screenshot' | 'voice_note';

export function getRequiredFile(form: FormData, key = 'file'): File {
  const value = form.get(key);
  if (!(value instanceof File)) throw new Error('file upload is required.');
  if (!value.name && value.size === 0) throw new Error('uploaded file is empty.');
  return value;
}

export function assertImageFile(file: File) {
  const type = normalizeMediaType(file.type, file.name);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`Image file must be ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB or smaller.`);
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (allowed.has(type)) return type;
  if (type === 'image/heic' || type === 'image/heif') {
    throw new Error('HEIC/HEIF upload reached the server unconverted. The browser should normalize iPhone HEIC/HEIF to JPEG before upload; retry from the app or export as JPEG if the browser cannot decode it.');
  }
  throw new Error(`Unsupported image type: ${type || 'unknown'}. Use JPG, PNG, WEBP, GIF, HEIC, or HEIF.`);
}

export function assertAudioFile(file: File) {
  const type = normalizeMediaType(file.type, file.name);
  if (file.size > MAX_AUDIO_BYTES) throw new Error(`Audio file must be ${Math.floor(MAX_AUDIO_BYTES / 1024 / 1024)}MB or smaller.`);
  const allowed = new Set(['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/aac', 'video/mp4']);
  if (!allowed.has(type)) throw new Error(`Unsupported audio type: ${type || 'unknown'}. Use M4A, MP3, WAV, WEBM, MP4 audio, or AAC.`);
  return type;
}

export function normalizeMediaType(type: string, name: string) {
  const lowerType = (type || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();
  if (lowerType) {
    if (lowerType === 'image/jpg') return 'image/jpeg';
    if (lowerType === 'audio/x-m4a') return 'audio/m4a';
    if (lowerType === 'audio/mp4a-latm') return 'audio/m4a';
    return lowerType;
  }
  if (/\.jpe?g$/.test(lowerName)) return 'image/jpeg';
  if (/\.png$/.test(lowerName)) return 'image/png';
  if (/\.webp$/.test(lowerName)) return 'image/webp';
  if (/\.gif$/.test(lowerName)) return 'image/gif';
  if (/\.heic$/.test(lowerName)) return 'image/heic';
  if (/\.heif$/.test(lowerName)) return 'image/heif';
  if (/\.m4a$/.test(lowerName)) return 'audio/m4a';
  if (/\.mp3$/.test(lowerName)) return 'audio/mpeg';
  if (/\.wav$/.test(lowerName)) return 'audio/wav';
  if (/\.webm$/.test(lowerName)) return 'audio/webm';
  if (/\.aac$/.test(lowerName)) return 'audio/aac';
  if (/\.mp4$/.test(lowerName)) return 'audio/mp4';
  return lowerType;
}

export async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function stringField(form: FormData, key: string, fallback = '') {
  return String(form.get(key) || fallback).trim();
}
