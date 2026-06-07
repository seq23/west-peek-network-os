export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) }
  });
}

export async function readJson<T>(request: Request): Promise<T> {
  try { return await request.json() as T; } catch { throw new Error('Request body must be valid JSON.'); }
}
