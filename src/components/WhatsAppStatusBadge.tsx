import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { getWhatsAppService, isWhatsAppConfigured, buildMaintenanceWhatsApp, buildComplaintWhatsApp } from '../services/whatsappService';
import { getWhatsAppStatus, getWhatsAppError, setWhatsAppStatus, type WhatsAppKind, type WhatsAppState } from '../utils/whatsappStatus';
import { notifyUser } from '../utils/userFeedback';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  kind: WhatsAppKind;
  record: any;
}

const serverStatus = (record: any): WhatsAppState | null => {
  const s = String(record?.whatsappStatus || '').toLowerCase();
  if (s === 'sent' || s === 'failed' || s === 'pending' || s === 'idle') return s;
  return null;
};

/** Admin visibility into WhatsApp delivery per request + retry without recreating. */
export const WhatsAppStatusBadge: React.FC<Props> = ({ kind, record }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const id = String(record?.id || '');
  // Server truth first (set at creation/retry), local store as fallback.
  const [status, setStatus] = useState<WhatsAppState>(() => serverStatus(record) || getWhatsAppStatus(kind, id));
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => setStatus(serverStatus(record) || getWhatsAppStatus(kind, id)), [kind, id, record]);

  useEffect(() => {
    refresh();
    window.addEventListener('azhar:whatsapp-status', refresh);
    return () => window.removeEventListener('azhar:whatsapp-status', refresh);
  }, [refresh]);

  const retry = async () => {
    setBusy(true);
    setWhatsAppStatus(kind, id, 'pending');
    try {
      // Server retry first: resends without creating a new request and returns
      // the updated record with the authoritative whatsappStatus.
      const updated = await apiService.retryWhatsApp(kind, id);
      if (updated) {
        const s = serverStatus(updated) || 'failed';
        setStatus(s);
        if (s === 'sent') notifyUser({ kind: 'success', ar: 'تم إرسال إشعار WhatsApp.', en: 'WhatsApp notification sent.' });
        else if (s === 'idle') notifyUser({ kind: 'warning', ar: 'خدمة WhatsApp غير مهيأة على الخادم.', en: 'WhatsApp is not configured on the server.' });
        else notifyUser({ kind: 'error', ar: `فشل الإرسال: ${(updated as any)?.whatsappError || ''}`, en: `Send failed: ${(updated as any)?.whatsappError || ''}` });
        return;
      }
    } catch { /* fall through to client fallback */ }
    // Fallback: direct client send (older deployments without the retry endpoint).
    const svc = getWhatsAppService();
    if (!svc) {
      setWhatsAppStatus(kind, id, 'failed', 'no retry endpoint and WhatsApp not configured');
      notifyUser({ kind: 'warning', ar: 'خدمة WhatsApp غير مهيأة. أضف بيانات الاتصال في Environment Variables أولاً.', en: 'WhatsApp is not configured. Set the environment variables first.' });
      setBusy(false);
      return;
    }
    try {
      const body = kind === 'maintenance' ? buildMaintenanceWhatsApp(record) : buildComplaintWhatsApp(record);
      const result = await svc.send({ to: (svc as any)['config']?.recipientPhone || '', body });
      setWhatsAppStatus(kind, id, result.status, result.errorMessage);
      if (result.status === 'sent') notifyUser({ kind: 'success', ar: 'تم إرسال إشعار WhatsApp.', en: 'WhatsApp notification sent.' });
      else notifyUser({ kind: 'error', ar: `فشل الإرسال: ${result.errorMessage || ''}`, en: `Send failed: ${result.errorMessage || ''}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setWhatsAppStatus(kind, id, 'failed', msg);
      notifyUser({ kind: 'error', ar: 'فشل إرسال WhatsApp.', en: 'WhatsApp send failed.' });
    } finally {
      setBusy(false);
    }
  };

  if (!id) return null;

  if (!isWhatsAppConfigured() && status === 'idle') {
    return (
      <span title={ar ? 'WhatsApp غير مهيأ' : 'WhatsApp not configured'} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
        <span>⚪</span> WA
      </span>
    );
  }

  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span>🟢</span> WA
      </span>
    );
  }

  if (status === 'pending' || busy) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>🟡</span>} WA
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1" title={getWhatsAppError(kind, id)}>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <span>🔴</span> WA
        </span>
        <button type="button" onClick={retry} disabled={busy} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#157f8b] border border-cyan-300 hover:bg-cyan-50 disabled:opacity-60" title={ar ? 'إعادة محاولة إرسال WhatsApp' : 'Retry WhatsApp'}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          {ar ? 'إعادة' : 'Retry'}
        </button>
      </span>
    );
  }

  // idle + configured: nothing sent yet for this record (e.g. created before the feature).
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
        <span>⚪</span> WA
      </span>
      <button type="button" onClick={retry} disabled={busy} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#157f8b] border border-cyan-300 hover:bg-cyan-50 disabled:opacity-60" title={ar ? 'إرسال إشعار WhatsApp' : 'Send WhatsApp'}>
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {ar ? 'إرسال' : 'Send'}
      </button>
    </span>
  );
};
