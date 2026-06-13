export type ProviderMode = 'fixture' | 'local-adapter' | 'live-provider';

export function resolveProviderMode(value: unknown): ProviderMode {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'fixture' || mode === 'local-adapter' || mode === 'live-provider') return mode;
  throw new Error(`Unsupported provider mode: ${mode || '(empty)'}. Expected fixture, local-adapter, or live-provider.`);
}

export function assertProviderModeAllowed(input: {
  mode: ProviderMode;
  nodeEnv?: string;
  hostname?: string;
}) {
  const nodeEnv = String(input.nodeEnv || '').toLowerCase();
  const hostname = String(input.hostname || '').toLowerCase();
  const productionHost = hostname && !['localhost', '127.0.0.1'].includes(hostname) && !hostname.endsWith('.local');
  if ((input.mode === 'fixture' || input.mode === 'local-adapter') && (nodeEnv === 'production' || productionHost)) {
    throw new Error(`${input.mode} provider mode is forbidden in production runtime.`);
  }
}
