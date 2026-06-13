export type ProviderMode = 'fixture' | 'local-adapter' | 'live-provider';
export function requireProviderMode(value: unknown): ProviderMode {
  const mode = String(value || '').trim();
  if (mode === 'fixture' || mode === 'local-adapter' || mode === 'live-provider') return mode;
  throw new Error(`Unsupported provider mode: ${mode || '(missing)'}`);
}
