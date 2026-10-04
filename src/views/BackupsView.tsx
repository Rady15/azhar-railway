import React, { useState, useEffect, useCallback } from 'react';
import {
  DatabaseBackup, Loader2, RefreshCw, HardDriveDownload,
  AlertTriangle, CheckCircle2, Info, RotateCcw, Eye,
  Download, FileCode2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const fmtSize = (n?: number) =>
  !n ? '—' : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export function BackupsView() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  // MUST be stable across renders. An inline arrow here gives a new identity
  // on every render, which invalidates the useCallback below and sends
  // useEffect into an endless fetch loop.
  const t = useCallback((x: string, y: string) => (ar ? x : y), [ar]);

  const [rows, setRows] = useState<any[]>([]);
  const [dir, setDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string } | null>(null);
  const [preview, setPreview] = useState<{ id: string; counts: Record<string, number> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiService.listBackups();
      setRows(r.backups || []);
      setDir(r.backupDir || '');
    } catch (e: any) {
      setMsg({ kind: 'bad', text: e?.message || t('تعذر تحميل النسخ', 'Could not load backups') });
    } finally { setLoading(false); }
  }, [ar]);

  useEffect(() => { load(); }, [load]);

  const takeBackup = async () => {
    setBusy('create'); setMsg(null);
    try {
      await apiService.createBackup();
      setMsg({ kind: 'ok', text: t('تم إنشاء نسخة احتياطية بنجاح', 'Backup created successfully') });
      await load();
    } catch (e: any) {
      setMsg({ kind: 'bad', text: `${t('فشل إنشاء النسخة', 'Backup failed')}: ${e?.message || ''}` });
    } finally { setBusy(''); }
  };

  const inspect = async (row: any) => {
    setBusy(row.id); setMsg(null);
    try {
      const r = await apiService.inspectBackup(row.id);
      setPreview({ id: row.id, counts: r.counts || {} });
    } catch (e: any) {
      setMsg({ kind: 'bad', text: e?.message || t('تعذر قراءة المحتوى', 'Could not read contents') });
    } finally { setBusy(''); }
  };

  const save = async (row: any, kind: 'dump' | 'sql') => {
    setBusy(row.id); setMsg(null);
    try {
      await apiService.downloadBackup(row.id, kind);
      setMsg({ kind: 'ok', text: t(`تم تحميل النسخة إلى جهازك`, 'Backup downloaded to this device') });
    } catch (e: any) {
      setMsg({ kind: 'bad', text: `${t('فشل التحميل', 'Download failed')}: ${e?.message || ''}` });
    } finally { setBusy(''); }
  };

  const restore = async (row: any) => {
    const ok = window.confirm(
      ar
        ? `⚠️ سيتم استبدال كل البيانات الحالية بمحتوى النسخة:\n\n${row.id}\n\nهل أنت متأكد؟`
        : `⚠️ This will REPLACE all current data with:\n\n${row.id}\n\nAre you sure?`
    );
    if (!ok) return;
    const typed = window.prompt(
      ar ? 'اكتب RESTORE للتأكيد' : 'Type RESTORE to confirm');
    if (typed !== 'RESTORE') return;

    setBusy(row.id); setMsg(null);
    try {
      const r = await apiService.restoreBackup(row.id);
      setMsg({ kind: 'ok', text: r.message || t('تم الاسترجاع', 'Restore complete') });
      setPreview(null);
      await load();
    } catch (e: any) {
      setMsg({ kind: 'bad', text: `${t('فشل الاسترجاع', 'Restore failed')}: ${e?.message || ''}` });
    } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4" dir={ar ? 'rtl' : 'ltr'}>

      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border rounded-2xl p-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5 text-cyan-600" />
            {t('النسخ الاحتياطي والاسترجاع', 'Backup & Restore')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('نسخة كاملة من قاعدة البيانات — افتراضياً كل يوم ٣:٣٠ صباحاً',
               'Full database snapshot — daily at 03:30 by default')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm border rounded-xl px-3 py-2 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={takeBackup} disabled={busy === 'create'}
            className="flex items-center gap-2 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl px-4 py-2 disabled:opacity-60"
          >
            {busy === 'create'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <HardDriveDownload className="w-4 h-4" />}
            {t('نسخة احتياطية الآن', 'Back up now')}
          </button>
        </div>
      </div>

      {dir && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t('مجلد الحفظ:', 'Backup folder:')} <code className="font-mono">{dir}</code></span>
        </div>
      )}

      {msg && (
        <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
          msg.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : msg.kind === 'bad' ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
          {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1 whitespace-pre-wrap">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold">×</button>
        </div>
      )}

      {/* list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> {t('جارٍ التحميل…', 'Loading…')}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-slate-500">
          <DatabaseBackup className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('لا توجد نسخ احتياطية بعد', 'No backups yet')}</p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-start px-3 py-2 font-bold">{t('النسخة', 'Backup')}</th>
                <th className="text-start px-3 py-2 font-bold">{t('التاريخ', 'Created')}</th>
                <th className="text-start px-3 py-2 font-bold text-center">{t('الحجم', 'Size')}</th>
                <th className="text-start px-3 py-2 font-bold text-center">{t('جداول', 'Tables')}</th>
                <th className="text-start px-3 py-2 font-bold text-center">{t('صفوف', 'Rows')}</th>
                <th className="text-end px-3 py-2 font-bold">{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    <span className="font-mono text-[11px]">{r.id}</span>
                    {i === 0 && (
                      <span className="ms-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                        {t('الأحدث', 'latest')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2 text-center font-mono">{fmtSize(r.sizeBytes)}</td>
                  <td className="px-3 py-2 text-center">{r.tables || '—'}</td>
                  <td className="px-3 py-2 text-center">{r.rowTotal ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => inspect(r)} disabled={busy === r.id}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-50"
                        title={t('عرض المحتوى', 'Inspect')}>
                        {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => save(r, 'dump')} disabled={busy === r.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-700 text-[11px] font-bold disabled:opacity-50"
                        title={t('تحميل على هذا الجهاز', 'Download to this device')}>
                        <Download className="w-3.5 h-3.5" />
                        {t('تحميل', 'Save')}
                      </button>
                      <button onClick={() => save(r, 'sql')} disabled={busy === r.id}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50"
                        title={t('تحميل SQL للقراءة', 'Download readable SQL')}>
                        <FileCode2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => restore(r)} disabled={busy === r.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[11px] font-bold disabled:opacity-50"
                        title={t('استرجاع', 'Restore')}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t('استرجاع', 'Restore')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* contents preview */}
      {preview && (
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-600" />
              {t('محتوى النسخة', 'Backup contents')} — <span className="font-mono text-xs">{preview.id}</span>
            </h3>
            <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {Object.entries(preview.counts)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([tbl, n]) => (
                <div key={tbl} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                  <span className="font-mono text-[11px] truncate">{tbl}</span>
                  <span className="text-[11px] font-bold text-slate-700 shrink-0">{n}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          {t(
            'الاسترجاع يستبدل كل البيانات الحالية. النظام يأخذ نسخة أمان تلقائياً قبل التنفيذ، وتُحذف النسخ الأقدم من ١٤ يوماً.',
            'Restore replaces all current data. A safety snapshot is taken automatically first, and backups older than 14 days are pruned.'
          )}
        </span>
      </div>
    </div>
  );
}

export default BackupsView;