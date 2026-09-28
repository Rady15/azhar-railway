import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function FormError({ message, details }: { message?: string; details?: string[] }) {
  const { language } = useLanguage();
  if (!message && !(details && details.length)) return null;
  return (
    <div role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
        <div className="min-w-0">
          <div className="font-bold text-sm">{language === 'ar' ? 'تعذر حفظ البيانات' : 'Unable to save the data'}</div>
          {message && <div className="mt-1 text-xs font-semibold break-words">{message}</div>}
          {!!details?.length && <ul className="mt-2 list-disc ps-5 text-xs space-y-1">{details.map((x,i)=><li key={i}>{x}</li>)}</ul>}
          <div className="mt-2 text-[11px] text-rose-700">{language === 'ar' ? 'لم يتم إغلاق النموذج ولم يتم اعتماد التغيير. صحح البيانات ثم حاول مرة أخرى.' : 'The form remains open and the change was not committed. Correct the data and try again.'}</div>
        </div>
      </div>
    </div>
  );
}
