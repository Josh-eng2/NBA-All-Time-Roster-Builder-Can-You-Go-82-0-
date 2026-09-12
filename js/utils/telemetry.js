import { S } from '../logic/state.js';
export function telemetryContext() {
  const out = { app_version: '820-v36', run_id: S.gameId || 'menu', mode: S.mode || 'menu' };
  try {
    const query = new URLSearchParams(globalThis.location?.search || '');
    for (const [key, field] of [['sid', 'invite_id'], ['campaign', 'campaign']]) {
      const value = query.get(key);
      if (/^[a-zA-Z0-9_-]{1,64}$/.test(value || '')) out[field] = value;
    }
  } catch (_) {}
  return out;
}
