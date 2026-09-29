import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Loader2, Trash2, X, CheckCircle2, AlertCircle, Eye, Download } from 'lucide-react';
import { apiService } from '../services/api';
import { notifyUser } from '../utils/userFeedback';
import { useLanguage } from '../context/LanguageContext';
import type { FamilyMember, FamilyMemberFormValues } from '../types';

export type DocKind = 'identity' | 'residence';
export type DocStatus = 'empty' | 'uploading' | 'ready' | 'error';

export interface DocSlot {
  url: string;
  fileName: string;
  status: DocStatus;
  error?: string;
  progress?: boolean;
}

interface Props {
  tenantId: string;
  member?: FamilyMember | null;
  existingDocs?: Partial<Record<DocKind, DocSlot>>;
  onSaved: (member: FamilyMember) => void;
  onClose: () => void;
}

const MAX_MB = 8;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

const isImage = (mimeOrName: string) =>
  mimeOrName.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(mimeOrName);

export const FamilyMemberForm: React.FC<Props> = ({ tenantId, member, existingDocs, onSaved, onClose }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [name, setName] = useState(member?.name || '');
  const [relation, setRelation] = useState<FamilyMemberFormValues['relation']>(member?.relation || 'son');
  const [birthDate, setBirthDate] = useState(member?.birthDate || '');
  const [nationality, setNationality] = useState(member?.nationality || '');
  const [docs, setDocs] = useState<Record<DocKind, DocSlot>>({
    identity: existingDocs?.identity || { url: '', fileName: '', status: 'empty' },
    residence: existingDocs?.residence || { url: '', fileName: '', status: 'empty' },
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const identityRef = useRef<HTMLInputElement>(null);
  const residenceRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    const okType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!okType) return ar ? 'نوع الملف غير مدعوم. يرجى رفع صورة أو PDF.' : 'Unsupported file type. Upload an image or PDF.';
    if (file.size === 0) return ar ? 'الملف فارغ أو تالف. اختر ملفًا صالحًا.' : 'The file is empty or corrupted. Choose a valid file.';
    if (file.size > MAX_MB * 1024 * 1024) return ar ? `حجم الملف يجب ألا يتجاوز ${MAX_MB} ميجابايت.` : `File must not exceed ${MAX_MB} MB.`;
    return null;
  };

  const pickFile = async (kind: DocKind, file?: File) => {
    if (!file) return;
    const err = validate(file);
    if (err) {
      // Show the error in-form; keep everything the user already entered.
      setDocs(d => ({ ...d, [kind]: { ...d[kind], status: 'error', error: err } }));
      return;
    }
    // Stage the file locally first (no server round-trip until save); keep object URL for preview.
    const url = URL.createObjectURL(file);
    setDocs(d => ({ ...d, [kind]: { url, fileName: file.name, status: 'ready' } }));
    // Stash the raw file on the slot so save() can upload it.
    (slotFilesRef.current as any)[kind] = file;
  };

  const slotFilesRef = useRef<Partial<Record<DocKind, File>>>({});

  const clearSlot = (kind: DocKind) => {
    const slot = docs[kind];
    if (slot.url.startsWith('blob:')) { try { URL.revokeObjectURL(slot.url); } catch { /* noop */ } }
    delete (slotFilesRef.current as any)[kind];
    setDocs(d => ({ ...d, [kind]: { url: '', fileName: '', status: 'empty' } }));
  };

  const save = async () => {
    setFormError('');
    if (!name.trim()) {
      setFormError(ar ? 'يرجى إدخال الاسم الكامل لفرد الأسرة.' : 'Enter the family member’s full name.');
      return;
    }
    setSaving(true);
    try {
      const staged: { file: File; kind: DocKind }[] = [];
      (['identity', 'residence'] as DocKind[]).forEach(k => {
        const f = slotFilesRef.current[k];
        if (f) staged.push({ file: f, kind: k });
      });

      const values: FamilyMemberFormValues = {
        name: name.trim(),
        relation,
        ...(birthDate ? { birthDate } : {}),
        ...(nationality.trim() ? { nationality: nationality.trim() } : {}),
      };

      if (member) {
        // Edit: upload staged files first (form stays open with all data on failure),
        // then send the member update together with the new document references.
        const additions: { kind: DocKind; url: string; fileName: string; storageKey: string }[] = [];
        for (const { file, kind } of staged) {
          setDocs(d => ({ ...d, [kind]: { ...d[kind], status: 'uploading', error: undefined } }));
          try {
            const r = await apiService.uploadFamilyMemberDocument(member.id, file, kind);
            additions.push({ kind, url: r.url, fileName: r.fileName, storageKey: r.storageKey });
            setDocs(d => ({ ...d, [kind]: { url: r.url, fileName: r.fileName, status: 'ready' } }));
          } catch {
            const msg = kind === 'identity'
              ? (ar ? 'حدث خطأ أثناء رفع إثبات الهوية، حاول مرة أخرى.' : 'Failed to upload the identity document. Try again.')
              : (ar ? 'حدث خطأ أثناء رفع مستند الإقامة، حاول مرة أخرى.' : 'Failed to upload the residence document. Try again.');
            setDocs(d => ({ ...d, [kind]: { ...d[kind], status: 'error', error: msg } }));
            throw new Error(msg);
          }
        }
        const saved = await apiService.updateFamilyMember(member.id, values, additions.length ? { add: additions } : undefined);
        notifyUser({ kind: 'success', ar: 'تم حفظ فرد الأسرة بنجاح.', en: 'Family member saved.' });
        onSaved(saved);
      } else {
        const saved = await apiService.addFamilyMember(tenantId, values, staged.length ? staged : undefined);
        notifyUser({ kind: 'success', ar: 'تم حفظ فرد الأسرة بنجاح.', en: 'Family member saved.' });
        onSaved(saved);
      }
    } catch (e: any) {
      // Upload-stage errors are already shown on the slot; surface anything else in-form.
      if (!formError) setFormError(e?.message || (ar ? 'تعذر الحفظ. حاول مرة أخرى.' : 'Could not save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const renderSlot = (kind: DocKind, titleAr: string, titleEn: string) => {
    const slot = docs[kind];
    const inputRef = kind === 'identity' ? identityRef : residenceRef;
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="font-semibold text-slate-700 text-sm">{ar ? titleAr : titleEn}</label>
          {slot.status === 'ready' && slot.url && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />{ar ? 'مرفوع' : 'Uploaded'}
            </span>
          )}
          {slot.status === 'empty' && (
            <span className="text-[11px] text-slate-400">{ar ? 'غير مرفوع' : 'Not uploaded'}</span>
          )}
          {slot.status === 'uploading' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />{ar ? 'جارٍ الرفع…' : 'Uploading…'}
            </span>
          )}
          {slot.status === 'error' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" />{ar ? 'فشل الرفع' : 'Failed'}
            </span>
          )}
        </div>

        {slot.status === 'ready' && slot.url && (
          <div className="mb-2">
            {isImage(slot.fileName || slot.url) || slot.url.startsWith('blob:') ? (
              <img src={slot.url} alt={slot.fileName} className="w-full h-28 object-cover rounded-lg border border-slate-200" />
            ) : (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-2">
                <FileText className="w-4 h-4 text-[#29b4c4] shrink-0" />
                <span className="truncate flex-1 text-xs">{slot.fileName}</span>
                <button type="button" onClick={() => apiService.openMedia(slot.url).catch(() => notifyUser({ kind: 'error', ar: 'تعذر فتح الملف.', en: 'Could not open the file.' }))} className="p-1 text-[#29b4c4]" title={ar ? 'معاينة' : 'Preview'}><Eye className="w-4 h-4" /></button>
                <button type="button" onClick={() => apiService.downloadMedia(slot.url, slot.fileName).catch(() => notifyUser({ kind: 'error', ar: 'تعذر تنزيل الملف.', en: 'Could not download.' }))} className="p-1 text-slate-500" title={ar ? 'تنزيل' : 'Download'}><Download className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex items-center justify-between mt-1">
              <span className="truncate text-[11px] text-slate-500 flex-1">{slot.fileName}</span>
              <button type="button" onClick={() => clearSlot(kind)} className="p-1 text-rose-500" title={ar ? 'حذف' : 'Remove'}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {slot.status === 'error' && slot.error && (
          <div className="mb-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2">{slot.error}</div>
        )}

        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={e => pickFile(kind, e.target.files?.[0])} />
        <button type="button" disabled={slot.status === 'uploading' || saving} onClick={() => inputRef.current?.click()} className="w-full py-2 rounded-lg border border-dashed border-[#29b4c4]/60 bg-white text-[#157f8b] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-cyan-50 disabled:opacity-60">
          {slot.status === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : isImage(slot.fileName || '') ? <ImageIcon className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          {slot.status === 'uploading' ? (ar ? 'جارٍ الرفع…' : 'Uploading…') : slot.url ? (ar ? 'استبدال الملف' : 'Replace file') : (ar ? 'رفع ملف' : 'Upload file')}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-bold text-slate-900">{member ? (ar ? 'تعديل فرد الأسرة' : 'Edit Family Member') : (ar ? 'إضافة فرد من أفراد الأسرة' : 'Add Family Member')}</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600" aria-label={ar ? 'إغلاق' : 'Close'}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {formError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3">{formError}</div>
          )}

          <div>
            <h4 className="font-semibold text-slate-800 mb-2 text-sm">{ar ? 'بيانات فرد الأسرة' : 'Family Member Details'}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <span className="text-xs text-slate-600">{ar ? 'الاسم الكامل *' : 'Full name *'}</span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={ar ? 'مثال: أحمد محمد' : 'e.g. Ahmed Mohamed'} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">{ar ? 'صلة القرابة' : 'Relation'}</span>
                <select value={relation} onChange={e => setRelation(e.target.value as FamilyMemberFormValues['relation'])} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="spouse">{ar ? 'زوج / زوجة' : 'Spouse'}</option>
                  <option value="son">{ar ? 'ابن' : 'Son'}</option>
                  <option value="daughter">{ar ? 'ابنة' : 'Daughter'}</option>
                  <option value="father">{ar ? 'أب' : 'Father'}</option>
                  <option value="mother">{ar ? 'أم' : 'Mother'}</option>
                  <option value="brother">{ar ? 'أخ' : 'Brother'}</option>
                  <option value="sister">{ar ? 'أخت' : 'Sister'}</option>
                  <option value="other">{ar ? 'أخرى' : 'Other'}</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">{ar ? 'تاريخ الميلاد' : 'Date of birth'}</span>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-slate-600">{ar ? 'الجنسية' : 'Nationality'}</span>
                <input value={nationality} onChange={e => setNationality(e.target.value)} placeholder={ar ? 'مثال: يمني' : 'e.g. Yemeni'} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-2 text-sm">{ar ? 'مستندات فرد الأسرة' : 'Family Member Documents'}</h4>
            <div className="space-y-3">
              {renderSlot('identity', '📄 إثبات الهوية', '📄 Identity Document')}
              {renderSlot('residence', '📄 الإقامة', '📄 Residence Permit')}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{ar ? 'المسموح: صورة أو PDF حتى 8 ميجابايت. المستندات مرتبطة بهذا الفرد فقط.' : 'Allowed: image or PDF up to 8 MB. Documents belong to this member only.'}</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-2 rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold disabled:opacity-60">{ar ? 'إلغاء' : 'Cancel'}</button>
          <button type="button" onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-[#29b4c4] text-white text-sm font-bold hover:bg-[#1f9aa8] disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ فرد الأسرة' : 'Save Family Member')}
          </button>
        </div>
      </div>
    </div>
  );
};
