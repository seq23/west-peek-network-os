import { useState } from 'react';
import { Header, RouteGuide } from './App';
import type { EventRecord } from '../domain/types';

const acceptedImage = '.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/*';
const acceptedAudio = '.m4a,.mp3,.wav,.webm,.mp4,.aac,audio/*,video/mp4';

export function CaptureStudio({ events = [], onSaved }: { events?: EventRecord[]; onSaved?: () => void }) {
  const [result, setResult] = useState('No card/screenshot/voice upload has run in this browser session.');
  const [busy, setBusy] = useState(false);

  async function submitMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    setResult('Preparing upload...');
    try {
      const file = form.get('file');
      if (!(file instanceof File)) throw new Error('Choose a file first.');
      const captureType = String(form.get('capture_type') || 'business_card');
      const eventId = String(form.get('event_id') || '');
      const event = events.find((row) => row.event_id === eventId);
      if (event) {
        form.set('event_name', event.event_name);
        form.set('event_slug', event.event_slug);
      }
      const normalized = captureType === 'voice_note' ? file : await normalizeImageForUpload(file);
      if (normalized !== file) {
        form.set('file', normalized, normalized.name);
        form.set('client_normalized_from_heic', 'true');
      }
      setResult('Calling /api/intake/media/create...');
      const response = await fetch('/api/intake/media/create', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Media capture failed.');
      setResult(JSON.stringify(payload, null, 2));
      onSaved?.();
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Media capture failed.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Header eyebrow="Capture Studio" title="Add people from cards, screenshots, and voice notes" subtitle="Capture first, enrich later. Every upload creates an Intake Queue draft with human review required and no automatic send/add." />
    <RouteGuide purpose="Convert cards, screenshots, and voice notes into reviewable intake." primaryAction="Choose the source type, optionally tie it to an event, then upload." caution="Uploads create drafts; they do not create final contacts or send anything." />
    <div className="grid cols-2">
      <form className="card form" onSubmit={submitMedia}>
        <h2>Card or notes screenshot OCR</h2>
        <p className="muted">Upload a business card, badge, handwritten note, or Notes screenshot. iPhone HEIC/HEIF is accepted and the browser will try to normalize it to JPEG before upload.</p>
        <EventSelect events={events} />
        <Field label="Image type"><select name="capture_type" defaultValue="business_card"><option value="business_card">Business card / badge</option><option value="notes_screenshot">Notes screenshot / screenshot of names</option></select></Field>
        <Field label="Image"><input name="file" type="file" accept={acceptedImage} required /></Field>
        <Field label="What should we know?"><textarea name="context_note" placeholder="Met at conference. Interested in secondaries. Scooter owns." /></Field>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Processing...' : 'OCR card/screenshot to Intake Queue'}</button>
      </form>

      <form className="card form" onSubmit={submitMedia}>
        <h2>Voice note transcription</h2>
        <p className="muted">Upload an iPhone Voice Memo or audio note. Google Speech-to-Text transcribes it, then Claude structures the transcript into an Intake Queue draft.</p>
        <input type="hidden" name="capture_type" value="voice_note" />
        <EventSelect events={events} />
        <Field label="Audio"><input name="file" type="file" accept={acceptedAudio} required /></Field>
        <Field label="Optional context"><textarea name="context_note" placeholder="This was after the LP dinner / conference hallway / phone call." /></Field>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Processing...' : 'Transcribe voice note to Intake Queue'}</button>
      </form>
    </div>

    <div className="card" style={{ marginTop: 16 }}>
      <h2>Internal data trace</h2>
      <p className="muted">The response should include provider stages, confidence, pending_human_review, and execution_allowed false.</p>
      <pre>{result}</pre>
    </div>
  </>;
}

async function normalizeImageForUpload(file: File): Promise<File> {
  const lowerName = file.name.toLowerCase();
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
  if (!isHeic) return file;
  if (typeof createImageBitmap !== 'function') throw new Error('This browser cannot decode HEIC/HEIF here. Try from iPhone Safari/Photos, or export the image as JPEG.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const heic2any = await import('heic2any');
    const converted = await heic2any.default({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare HEIC image conversion.');
  context.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('HEIC conversion to JPEG failed.')), 'image/jpeg', 0.92));
  return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }

function EventSelect({ events }: { events: EventRecord[] }) {
  if (!events.length) return null;
  return <Field label="Tie to event, optional"><select name="event_id" defaultValue=""><option value="">No event</option>{events.filter((event) => event.status === 'active').map((event) => <option key={event.event_id} value={event.event_id}>{event.event_name}</option>)}</select></Field>;
}
