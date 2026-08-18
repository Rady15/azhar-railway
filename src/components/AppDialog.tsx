import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { DialogRequest } from '../utils/uiDialog';

export function AppDialog() {
  const { language } = useLanguage();
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DialogRequest>).detail;
      if (!detail) return;
      setValue(detail.defaultValue ?? '');
      setDialog(detail);
      setTimeout(() => inputRef.current?.focus(), 60);
    };
    window.addEventListener('azhar:ui-dialog', handler as EventListener);
    return () => window.removeEventListener('azhar:ui-dialog', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter' && dialog.kind === 'confirm') submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, value]);

  const close = (confirmed: boolean) => {
    if (!dialog) return;
    const current = dialog;
    setDialog(null);
    current.resolve(current.kind === 'confirm' ? confirmed : null);
  };

  const submit = () => {
    if (!dialog) return;
    const current = dialog;
    setDialog(null);
    current.resolve(current.kind === 'confirm' ? true : value);
  };

  if (!dialog) return null;
  const danger = dialog.tone === 'danger';
  const warning = dialog.tone === 'warning';
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'} onMouseDown={e => { if (e.target === e.currentTarget) close(false); }}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_28px_90px_rgba(15,23,42,.28)]">
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5">
          <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${danger ? 'bg-rose-50 text-rose-600' : warning ? 'bg-amber-50 text-amber-600' : 'bg-cyan-50 text-cyan-700'}`}>
            {danger || warning ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900">{dialog.title || (language === 'ar' ? 'تأكيد العملية' : 'Confirm action')}</h2>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{dialog.message}</p>
          </div>
          <button onClick={() => close(false)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={language === 'ar' ? 'إغلاق' : 'Close'}><X className="h-4 w-4" /></button>
        </div>
        {dialog.kind === 'prompt' && (
          <div className="px-6 py-5">
            {dialog.inputLabel && <label className="mb-2 block text-xs font-bold text-slate-600">{dialog.inputLabel}</label>}
            <input ref={inputRef} type={dialog.inputType || 'text'} value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10" />
          </div>
        )}
        <div className="flex gap-3 bg-slate-50 px-6 py-4">
          <button onClick={() => close(false)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">{dialog.cancelText || (language === 'ar' ? 'إلغاء' : 'Cancel')}</button>
          <button onClick={submit} className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${danger ? 'bg-rose-600 hover:bg-rose-700' : warning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-cyan-600 hover:bg-cyan-700'}`}>{dialog.confirmText || (language === 'ar' ? 'تأكيد' : 'Confirm')}</button>
        </div>
      </div>
    </div>
  );
}
