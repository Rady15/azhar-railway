import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck, FileX, Pencil, Trash2, Loader2, Users, Plus,
  Eye, Printer, Download,
} from 'lucide-react';
import { apiService } from '../services/api';
import { FamilyMemberForm } from './FamilyMemberForm';
import { useLanguage } from '../context/LanguageContext';
import { notifyUser } from '../utils/userFeedback';
import type { Tenant, FamilyMember } from '../types';

const RELATION: Record<string, [string, string]> = {
  spouse: ['زوج / زوجة', 'Spouse'], son: ['ابن', 'Son'], daughter: ['ابنة', 'Daughter'],
  father: ['أب', 'Father'], mother: ['أم', 'Mother'], brother: ['أخ', 'Brother'],
  sister: ['أخت', 'Sister'], other: ['أخرى', 'Other'],
};

interface Props { tenant: Tenant }

/** Row of view / print / download buttons for one protected document. */
function DocActions({ url, name, ar, busy }: {
  url: string; name: string; ar: boolean; busy: string;
}) {
  const { view, download, print } = useDocActions(ar);
  if (!url) return null;
  const isBusy = busy === url;
  const cls = "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold disabled:opacity-50";
  return (
    <div className="flex items-center gap-1 mt-1">
      <button type="button" disabled={isBusy} onClick={() => view(url)} className={`${cls} bg-cyan-50 text-[#157f8b] hover:bg-cyan-100`} title={ar ? 'عرض' : 'View'}>
        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}{ar ? 'عرض' : 'View'}
      </button>
      <button type="button" disabled={isBusy} onClick={() => print(url, name)} className={`${cls} bg-slate-100 text-slate-600 hover:bg-slate-200`} title={ar ? 'طباعة' : 'Print'}>
        <Printer className="w-3 h-3" />{ar ? 'طباعة' : 'Print'}
      </button>
      <button type="button" disabled={isBusy} onClick={() => download(url, name)} className={`${cls} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} title={ar ? 'تنزيل' : 'Download'}>
        <Download className="w-3 h-3" />{ar ? 'تنزيل' : 'Save'}
      </button>
    </div>
  );
}

/**
 * Protected files need the Authorization header, which <img> / window.open
 * cannot send. So every action goes through the api service, which attaches the
 * JWT. The result is turned into a blob URL before it is displayed, printed or
 * saved — that is why these work where a plain link does not.
 */
function useDocActions(ar: boolean) {
  const [busy, setBusy] = useState('');

  const view = async (url: string) => {
    setBusy(url);
    try { await apiService.openMedia(url); }
    catch (e: any) { notifyUser({ kind: 'error', ar: `تعذر عرض الملف: ${e?.message || ''}`, en: `Could not open file: ${e?.message || ''}` }); }
    finally { setBusy(''); }
  };

  const download = async (url: string, name?: string) => {
    setBusy(url);
    try { await apiService.downloadMedia(url, name || 'file'); }
    catch (e: any) { notifyUser({ kind: 'error', ar: `تعذر التنزيل: ${e?.message || ''}`, en: `Could not download: ${e?.message || ''}` }); }
    finally { setBusy(''); }
  };

  const print = async (url: string, name?: string) => {
    setBusy(url);
    let objectUrl = '';
    try {
      const blob: Blob = await apiService.getMediaBlob(url);
      objectUrl = URL.createObjectURL(blob);
      const w = window.open('', '_blank');
      if (!w) { window.location.href = objectUrl; return; }   // popup blocked
      w.opener = null;
      const isImg = (blob.type || '').startsWith('image/');
      w.document.write(
        `<!doctype html><html dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${name || 'document'}</title>` +
        `<style>@page{margin:10mm}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;` +
        `font-family:system-ui,Tahoma,sans-serif}img,embed{max-width:100%;max-height:100%;object-fit:contain}</style></head><body>` +
        `${isImg ? `<img src="${objectUrl}">` : `<embed src="${objectUrl}" type="${blob.type}">`}` +
        `<script>setTimeout(function(){window.print()},300)<\/script></body></html>`
      );
      w.document.close();
    } catch (e: any) {
      notifyUser({ kind: 'error', ar: `تعذر الطباعة: ${e?.message || ''}`, en: `Could not print: ${e?.message || ''}` });
    } finally {
      setTimeout(() => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, 60_000);
      setBusy('');
    }
  };

  return { busy, view, download, print };
}

export const FamilyMembersView: React.FC<Props> = ({ tenant }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { busy } = useDocActions(ar);

  const load = useCallback(async () => {
    setLoading(true);
    try { setMembers(await apiService.getFamilyMembers(tenant.id)); }
    catch { notifyUser({ kind: 'error', ar: 'تعذر تحميل بيانات الأسرة.', en: 'Could not load family members.' }); }
    finally { setLoading(false); }
  }, [tenant.id]);

  useEffect(() => { load(); }, [load]);

  const remove = async (m: FamilyMember) => {
    if (!window.confirm(ar ? `حذف ${m.name} من أفراد الأسرة؟` : `Delete ${m.name}?`)) return;
    setDeletingId(m.id);
    try { await apiService.deleteFamilyMember(m.id); setMembers(p => p.filter(x => x.id !== m.id)); }
    catch (e: any) { notifyUser({ kind: 'error', ar: `تعذر الحذف: ${e?.message || ''}`, en: `Delete failed: ${e?.message || ''}` }); }
    finally { setDeletingId(''); }
  };

  const idUrl  = (m: any) => m.identityDocumentUrl || m.identityUrl || '';
  const resUrl = (m: any) => m.residenceDocumentUrl || m.residenceUrl || '';
  const idName = (m: any, i: number) => m.identityDocumentName || m.identityName || `${ar ? 'هوية' : 'identity'}-${m.name || i}`;
  const resName= (m: any, i: number) => m.residenceDocumentName || m.residenceName || `${ar ? 'إقامة' : 'residence'}-${m.name || i}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#29b4c4]" />
          {ar ? `أفراد الأسرة (${members.length})` : `Family Members (${members.length})`}
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </h4>
        <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#29b4c4] text-white text-xs font-bold hover:bg-[#1f9aa8]">
          <Plus className="w-3.5 h-3.5" />{ar ? 'إضافة فرد من أفراد الأسرة' : 'Add Family Member'}
        </button>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-slate-500 text-xs">
          {ar ? 'لا يوجد أفراد أسرة مسجلون. أضف فردًا مع مستنداته من الزر أعلاه.' : 'No family members yet. Add one with documents using the button above.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs min-w-[720px]">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-start px-3 py-2 font-bold w-8">#</th>
                <th className="text-start px-3 py-2 font-bold">{ar ? 'الاسم' : 'Name'}</th>
                <th className="text-start px-3 py-2 font-bold">{ar ? 'صلة القرابة' : 'Relation'}</th>
                <th className="text-start px-3 py-2 font-bold">{ar ? 'عدد أفراد الأسرة' : 'Family Count'}</th>
                <th className="text-start px-3 py-2 font-bold">{ar ? 'المستندات' : 'Documents'}</th>
                <th className="text-end px-3 py-2 font-bold">{ar ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: any, i: number) => (
                <tr key={m.id} className="border-t border-slate-200 bg-white align-top">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-cyan-100 text-[#157f8b] flex items-center justify-center font-bold text-xs shrink-0">
                        {(m.name || '?').trim().charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{m.name}</div>
                        {(m.birthDate || m.nationality) && (
                          <div className="text-[10px] text-slate-500">
                            {m.birthDate || ''}{m.nationality ? ` · ${m.nationality}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {RELATION[m.relation] ? (ar ? RELATION[m.relation][0] : RELATION[m.relation][1]) : (m.relation || '—')}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-bold text-slate-700">
                      <Users className="w-3 h-3" />{m.familyCount ?? members.length}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-2">
                      <div>
                        {idUrl(m)
                          ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold"><FileCheck className="w-3 h-3" />{ar ? 'الهوية مرفوعة' : 'ID uploaded'}</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><FileX className="w-3 h-3" />{ar ? 'الهوية غير مرفوعة' : 'No ID'}</span>}
                        <DocActions url={idUrl(m)} name={idName(m, i)} ar={ar} busy={busy} />
                      </div>
                      <div>
                        {resUrl(m)
                          ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold"><FileCheck className="w-3 h-3" />{ar ? 'الإقامة مرفوعة' : 'Residence uploaded'}</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><FileX className="w-3 h-3" />{ar ? 'الإقامة غير مرفوعة' : 'No residence'}</span>}
                        <DocActions url={resUrl(m)} name={resName(m, i)} ar={ar} busy={busy} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => { setEditing(m); setFormOpen(true); }} className="p-1.5 text-[#29b4c4] hover:bg-cyan-50 rounded-lg" title={ar ? 'تعديل' : 'Edit'}><Pencil className="w-4 h-4" /></button>
                      <button type="button" disabled={deletingId === m.id} onClick={() => remove(m)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-60" title={ar ? 'حذف' : 'Delete'}>
                        {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <FamilyMemberForm
          tenantId={tenant.id}
          member={editing}
          onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
};