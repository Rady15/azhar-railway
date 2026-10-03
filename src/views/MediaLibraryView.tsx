import React, { useState, useEffect, useCallback } from 'react';
import { apiService, mediaSrc } from '../services/api';
import {
  FileText, Download, Eye, Search, Loader2,
  AlertCircle, Paperclip, RefreshCw,
} from 'lucide-react';

type MediaRow = {
  id: string; entityType?: string; entityId?: string;
  category: string; fileName: string; mimeType: string;
  fileSize: number; createdAt: string; url: string;
};

const CATEGORY_AR: Record<string, string> = {
  'profile': 'صورة شخصية',
  'family_member_identity': 'هوية فرد أسرة',
  'family_member_residence': 'إقامة فرد أسرة',
  'tenant-identity': 'هوية المستأجر',
  'contract-document': 'مستند عقد',
  'manual-contract-document': 'مستند عقد يدوي',
  'medical-insurance': 'تأمين طبي',
  'announcement-image': 'صورة إعلان',
  'facility-image': 'صورة منشأة',
  'unit-image': 'صورة وحدة',
};

const fmtSize = (n?: number) =>
  !n && n !== 0 ? '—' : n < 1024 ? `${n} B`
  : n < 1048576 ? `${(n / 1024).toFixed(1)} KB`
  : `${(n / 1048576).toFixed(2)} MB`;

const isImage = (m: string) => /^image\//i.test(m || '');

export function MediaLibraryView() {
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const list = await (apiService as any).listMedia();
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل قائمة الملفات');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const view = async (row: MediaRow) => {
    setBusy(row.id);
    try { await (apiService as any).openMedia(row.url); }
    catch (e: any) { setError(`تعذر فتح "${row.fileName}": ${e?.message || 'خطأ'}`); }
    finally { setBusy(''); }
  };

  const download = async (row: MediaRow) => {
    setBusy(row.id);
    try { await (apiService as any).downloadMedia(row.url, row.fileName); }
    catch (e: any) { setError(`تعذر تحميل "${row.fileName}": ${e?.message || 'خطأ'}`); }
    finally { setBusy(''); }
  };

  const cats = Array.from(new Set(rows.map(r => r.category))).sort();
  const shown = rows.filter(r => {
    if (cat && r.category !== cat) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return (r.fileName||'').toLowerCase().includes(t)
        || (r.category||'').toLowerCase().includes(t)
        || (r.id||'').toLowerCase().includes(t)
        || (r.entityId||'').toLowerCase().includes(t);
  });

  const images = shown.filter(r => isImage(r.mimeType));
  const files  = shown.filter(r => !isImage(r.mimeType));

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border rounded-2xl p-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-cyan-600" /> مكتبة الملفات
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            كل الصور والمستندات المرفوعة — اضغط «عرض» لفتح أي ملف
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm border rounded-xl px-3 py-2 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white border rounded-xl p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو النوع أو المعرّف…"
            className="w-full border rounded-lg py-2 pr-9 pl-3 text-sm focus:outline-none focus:border-cyan-500" />
        </div>
        <select value={cat} onChange={e => setCat(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">كل الأنواع ({rows.length})</option>
          {cats.map(c => (
            <option key={c} value={c}>{CATEGORY_AR[c] || c} ({rows.filter(r => r.category === c).length})</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> جارٍ التحميل…
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-slate-500">
          <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{rows.length === 0 ? 'لا توجد ملفات مرفوعة بعد' : 'لا نتائج للبحث'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map(r => (
            <div key={r.id} className="bg-white border rounded-2xl overflow-hidden flex flex-col">
              <div className="h-40 bg-slate-100 grid place-items-center overflow-hidden">
                <img src={mediaSrc(r.url)} alt={r.fileName}
                     className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3 border-t">
                <p className="font-semibold text-sm truncate" title={r.fileName}>{r.fileName}</p>
                <p className="text-[11px] text-slate-500 mb-2">
                  {CATEGORY_AR[r.category] || r.category} · {fmtSize(r.fileSize)}
                </p>
                <Actions row={r} busy={busy === r.id} onView={view} onDownload={download} />
              </div>
            </div>
          ))}
          {files.map(r => (
            <div key={r.id} className="bg-white border rounded-2xl p-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl grid place-items-center shrink-0 bg-slate-100 text-slate-500">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" title={r.fileName}>{r.fileName}</p>
                <p className="text-xs text-slate-500">
                  {CATEGORY_AR[r.category] || r.category} · {fmtSize(r.fileSize)}
                </p>
                <Actions row={r} busy={busy === r.id} onView={view} onDownload={download} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">{shown.length} من {rows.length} ملف</p>
    </div>
  );
}

function Actions({ row, busy, onView, onDownload }: any) {
  return (
    <div className="flex gap-2">
      <button onClick={() => onView(row)} disabled={busy}
        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-cyan-600 text-white rounded-lg px-3 py-2 hover:bg-cyan-700 disabled:opacity-60">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} عرض
      </button>
      <button onClick={() => onDownload(row)} disabled={busy}
        className="flex items-center justify-center gap-1.5 text-xs font-semibold border rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-60">
        <Download className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
