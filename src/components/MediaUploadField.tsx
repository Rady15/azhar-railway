import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import { notifyUser } from '../utils/userFeedback';

interface Props {
  label: string;
  category: string;
  entityType?: string;
  entityId?: string;
  value?: string;
  fileName?: string;
  accept?: string;
  imageOnly?: boolean;
  onUploaded: (value: { url: string; fileName: string; id: string }) => void;
  onClear?: () => void;
}

export const MediaUploadField: React.FC<Props> = ({ label, category, entityType, entityId, value, fileName, accept = 'image/jpeg,image/png,image/webp,application/pdf', imageOnly, onUploaded, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    const allowed = imageOnly ? file.type.startsWith('image/') : (file.type.startsWith('image/') || file.type === 'application/pdf');
    if (!allowed) { notifyUser({ kind:'warning', ar:'نوع الملف غير مدعوم. اختر صورة أو PDF.', en:'Unsupported file type. Choose an image or PDF.' }); return; }
    const max = category === 'profile' ? 3 : 8;
    if (file.size > max * 1024 * 1024) { notifyUser({ kind:'warning', ar:`حجم الملف يجب ألا يتجاوز ${max} ميجابايت.`, en:`File size must not exceed ${max} MB.` }); return; }
    setBusy(true);
    try {
      const result = await apiService.uploadMedia(file, category, entityType, entityId);
      onUploaded({ url: result.url, fileName: result.fileName, id: result.id });
      notifyUser({ kind:'success', ar:'تم رفع الملف بنجاح.', en:'File uploaded successfully.' });
    } catch (e) {
      notifyUser({ kind:'error', ar:'تعذر رفع الملف. حاول مرة أخرى.', en:'Could not upload the file. Please try again.' });
    } finally { setBusy(false); }
  };
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center justify-between gap-2 mb-2">
      <label className="font-semibold text-slate-700">{label}</label>
      {value && <span className="text-[10px] text-emerald-700 font-bold">تم الرفع</span>}
    </div>
    {value && imageOnly && <img src={value} alt={fileName || label} className="w-full h-28 object-cover rounded-lg border border-slate-200 mb-2" />}
    {value && !imageOnly && <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-2 mb-2 min-w-0"><FileText className="w-4 h-4 text-[#29b4c4] shrink-0"/><span className="truncate flex-1">{fileName || 'المستند المرفوع'}</span><button type="button" onClick={()=>apiService.openMedia(value)} className="p-1 text-[#29b4c4]" title="عرض الملف"><ExternalLink className="w-4 h-4"/></button>{onClear && <button type="button" onClick={onClear} className="p-1 text-rose-500" title="إزالة"><Trash2 className="w-4 h-4"/></button>}</div>}
    <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e=>upload(e.target.files?.[0])}/>
    <button type="button" disabled={busy} onClick={()=>inputRef.current?.click()} className="w-full py-2 rounded-lg border border-dashed border-[#29b4c4]/60 bg-white text-[#157f8b] font-semibold flex items-center justify-center gap-2 hover:bg-cyan-50 disabled:opacity-60">
      {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : imageOnly ? <ImageIcon className="w-4 h-4"/> : <Upload className="w-4 h-4"/>}
      {busy ? 'جاري الرفع...' : value ? 'استبدال الملف' : 'رفع ملف'}
    </button>
  </div>;
};
