export type ExpiryTone = 'expired' | 'today' | 'soon' | 'valid' | 'unset';

export const EXPIRY_SOON_DAYS = 30;

export function daysUntil(date?: string | null): number | undefined {
  const parts = String(date || '').slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return undefined;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(parts[0], parts[1] - 1, parts[2]) - todayUtc) / 86400000);
}

export function expiryTone(days?: number): ExpiryTone {
  if (days === undefined) return 'unset';
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= EXPIRY_SOON_DAYS) return 'soon';
  return 'valid';
}

export function expiryLabel(days: number | undefined, language: 'ar' | 'en'): string {
  if (days === undefined) return language === 'ar' ? 'غير مسجل' : 'Not recorded';
  if (days < 0) return language === 'ar' ? `منتهية منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return language === 'ar' ? 'تنتهي اليوم' : 'Expires today';
  return language === 'ar' ? `متبقي ${days} يوم` : `${days} days left`;
}

export const EXPIRY_TONE_CLASS: Record<ExpiryTone, string> = {
  expired: 'bg-rose-100 text-rose-800 border-rose-200',
  today: 'bg-amber-100 text-amber-800 border-amber-200',
  soon: 'bg-amber-50 text-amber-800 border-amber-200',
  valid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  unset: 'bg-slate-100 text-slate-500 border-slate-200'
};

export function expiryBadgeClass(days?: number): string {
  return EXPIRY_TONE_CLASS[expiryTone(days)];
}

export const EXPIRY_ACCENT_CLASS: Record<ExpiryTone, string> = {
  expired: 'text-rose-600',
  today: 'text-amber-600',
  soon: 'text-amber-600',
  valid: 'text-emerald-600',
  unset: 'text-slate-400'
};

export interface ExpiringDocument {
  kind: 'iqama' | 'passport';
  date: string;
  days: number;
}

export function nearestExpiringDocument(staff: { iqamaExpiryDate?: string; passportExpiryDate?: string }): ExpiringDocument | undefined {
  const docs: ExpiringDocument[] = [];
  const iqamaDays = daysUntil(staff.iqamaExpiryDate);
  if (iqamaDays !== undefined) docs.push({ kind: 'iqama', date: String(staff.iqamaExpiryDate).slice(0, 10), days: iqamaDays });
  const passportDays = daysUntil(staff.passportExpiryDate);
  if (passportDays !== undefined) docs.push({ kind: 'passport', date: String(staff.passportExpiryDate).slice(0, 10), days: passportDays });
  if (!docs.length) return undefined;
  return docs.reduce((soonest, doc) => (doc.days < soonest.days ? doc : soonest));
}

export function expiryAlertDays(staff: { iqamaExpiryDate?: string; passportExpiryDate?: string }): number | undefined {
  const nearest = nearestExpiringDocument(staff);
  if (!nearest || nearest.days > EXPIRY_SOON_DAYS) return undefined;
  return nearest.days;
}

export function formatFileSize(bytes?: number): string {
  const size = Number(bytes || 0);
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
