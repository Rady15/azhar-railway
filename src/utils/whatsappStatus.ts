export type WhatsAppKind = 'maintenance' | 'complaint';
export type WhatsAppState = 'pending' | 'sent' | 'failed' | 'idle';

interface Entry {
  status: Exclude<WhatsAppState, 'idle'>;
  error?: string;
  at: string;
}

const KEY = 'azhar_whatsapp_status_v1';

function readAll(): Record<string, Entry> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, Entry>) {
  try {
    // Cap growth: keep the newest 500 entries.
    const keys = Object.keys(map);
    if (keys.length > 500) {
      const sorted = keys.sort((a, b) => String(map[a]?.at || '').localeCompare(String(map[b]?.at || '')));
      for (const k of sorted.slice(0, keys.length - 500)) delete map[k];
    }
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable - status is best-effort */
  }
  window.dispatchEvent(new CustomEvent('azhar:whatsapp-status'));
}

const key = (kind: WhatsAppKind, id: string) => `${kind}:${id}`;

export function getWhatsAppStatus(kind: WhatsAppKind, id: string): WhatsAppState {
  if (!id) return 'idle';
  return readAll()[key(kind, id)]?.status || 'idle';
}

export function getWhatsAppError(kind: WhatsAppKind, id: string): string {
  return readAll()[key(kind, id)]?.error || '';
}

export function setWhatsAppStatus(kind: WhatsAppKind, id: string, status: Exclude<WhatsAppState, 'idle'>, error?: string) {
  if (!id) return;
  const all = readAll();
  all[key(kind, id)] = { status, error: error || '', at: new Date().toISOString() };
  writeAll(all);
}
