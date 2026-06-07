import { json, readJson } from '../../_shared/json';
import { allTriggers, canonicalTrigger, containsTrigger } from '../../_shared/triggers';

export async function onRequestPost({ request }: { request: Request }) {
  const body = await readJson<{ text?: string }>(request);
  const text = body.text || '';
  return json({ hasTrigger: containsTrigger(text), canonicalTrigger, acceptedTriggers: allTriggers });
}
