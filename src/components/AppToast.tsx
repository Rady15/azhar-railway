import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { FeedbackPayload } from '../utils/userFeedback';

type ToastItem = FeedbackPayload & { id: number };

export function AppToast() {
  const { language } = useLanguage();
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<FeedbackPayload>).detail;
      if (!detail) return;
      const id = Date.now() + Math.random();
      setItems(prev => [...prev.slice(-3), { ...detail, id }]);
      window.setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), detail.duration || 4500);
    };
    window.addEventListener('azhar:user-feedback', handler as EventListener);
    return () => window.removeEventListener('azhar:user-feedback', handler as EventListener);
  }, []);
  const icon = (kind: FeedbackPayload['kind']) => kind === 'success' ? <CheckCircle2 className="w-5 h-5" /> : kind === 'warning' ? <AlertTriangle className="w-5 h-5" /> : kind === 'info' ? <Info className="w-5 h-5" /> : <XCircle className="w-5 h-5" />;
  return <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] w-[min(92vw,520px)] space-y-2 pointer-events-none" dir={language === 'ar' ? 'rtl' : 'ltr'}>{items.map(item => <div key={item.id} role="status" aria-live="polite" className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur"><span className="mt-0.5 shrink-0">{icon(item.kind)}</span><div className="flex-1 text-sm leading-6">{language === 'ar' ? item.ar : item.en}</div><button onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))} className="opacity-60 hover:opacity-100" aria-label={language === 'ar' ? 'إغلاق الرسالة' : 'Close message'}><X className="w-4 h-4" /></button></div>)}</div>;
}
