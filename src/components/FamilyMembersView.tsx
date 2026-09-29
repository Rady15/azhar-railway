import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Users, FileCheck, FileX } from 'lucide-react';
import { apiService } from '../services/api';
import { notifyUser } from '../utils/userFeedback';
import { useLanguage } from '../context/LanguageContext';
import { FamilyMemberForm, DocSlot } from './FamilyMemberForm';
import type { FamilyMember, Tenant } from '../types';

const RELATION_AR: Record<string, string> = {
  spouse: 'زوج / زوجة', son: 'ابن', daughter: 'ابنة', father: 'أب',
  mother: 'أم', brother: 'أخ', sister: 'أخت', other: 'أخرى',
};

interface Props {
  tenant: Tenant;
}

export const FamilyMembersView: React.FC<Props> = ({ tenant }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await apiService.getFamilyMembers(tenant.id));
    } catch {
      notifyUser({ kind: 'error', ar: 'تعذر تحميل بيانات الأسرة.', en: 'Could not load family members.' });
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => { load(); }, [load]);

  const remove = async (m: FamilyMember) => {
    if (!window.confirm(ar ? `حذف ${m.name} من أفراد الأسرة؟` : `Delete ${m.name}?`)) return;
    setDeletingId(m.id);
    try {
      await apiService.deleteFamilyMember(m.id);
      setMembers(prev => prev.filter(x => x.id !== m.id));
      notifyUser({ kind: 'success', ar: 'تم حذف فرد الأسرة.', en: 'Family member deleted.' });
    } catch {
      notifyUser({ kind: 'error', ar: 'تعذر الحذف. حاول مرة أخرى.', en: 'Could not delete. Try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  const onSaved = (saved: FamilyMember) => {
    setMembers(prev => {
      const i = prev.findIndex(x => x.id === saved.id);
      if (i >= 0) { const c = [...prev]; c[i] = saved; return c; }
      return [...prev, saved];
    });
    setFormOpen(false);
    setEditing(null);
  };

  // Existing docs for the edit form — resolved lazily from the member payload.
  const existingDocsFor = (m: FamilyMember | null): Partial<Record<'identity' | 'residence', DocSlot>> | undefined => {
    if (!m) return undefined;
    const out: Partial<Record<'identity' | 'residence', DocSlot>> = {};
    const id = (m as any).identityDocumentUrl || (m as any).identityUrl;
    const rs = (m as any).residenceDocumentUrl || (m as any).residenceUrl;
    if (id) out.identity = { url: id, fileName: (m as any).identityDocumentName || 'الهوية', status: 'ready' };
    if (rs) out.residence = { url: rs, fileName: (m as any).residenceDocumentName || 'الإقامة', status: 'ready' };
    return out;
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500 text-sm p-4"><Loader2 className="w-4 h-4 animate-spin" />{ar ? 'جارٍ تحميل بيانات الأسرة…' : 'Loading family members…'}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#29b4c4]" />
          {ar ? `أفراد الأسرة (${members.length})` : `Family Members (${members.length})`}
        </h4>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#29b4c4] text-white text-xs font-bold hover:bg-[#1f9aa8]"
        >
          <Plus className="w-3.5 h-3.5" />{ar ? 'إضافة فرد من أفراد الأسرة' : 'Add Family Member'}
        </button>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-slate-500 text-xs">
          {ar ? 'لا يوجد أفراد أسرة مسجلون. أضف فردًا مع مستنداته من الزر أعلاه.' : 'No family members yet. Add one with documents using the button above.'}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-100 text-[#157f8b] flex items-center justify-center font-bold text-sm shrink-0">
                {(m.name || '?').trim().charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-sm truncate">{m.name}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {RELATION_AR[m.relation] || m.relation}
                  {m.birthDate ? ` · ${m.birthDate}` : ''}
                  {m.nationality ? ` · ${m.nationality}` : ''}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {(m as any).identityDocumentUrl || (m as any).identityUrl
                    ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold"><FileCheck className="w-3 h-3" />{ar ? 'الهوية مرفوعة' : 'ID uploaded'}</span>
                    : <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><FileX className="w-3 h-3" />{ar ? 'الهوية غير مرفوعة' : 'No ID'}</span>}
                  {(m as any).residenceDocumentUrl || (m as any).residenceUrl
                    ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold"><FileCheck className="w-3 h-3" />{ar ? 'الإقامة مرفوعة' : 'Residence uploaded'}</span>
                    : <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><FileX className="w-3 h-3" />{ar ? 'الإقامة غير مرفوعة' : 'No residence'}</span>}
                </div>
              </div>
              <button type="button" onClick={() => { setEditing(m); setFormOpen(true); }} className="p-1.5 text-[#29b4c4] hover:bg-cyan-50 rounded-lg" title={ar ? 'تعديل' : 'Edit'}><Pencil className="w-4 h-4" /></button>
              <button type="button" disabled={deletingId === m.id} onClick={() => remove(m)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-60" title={ar ? 'حذف' : 'Delete'}>
                {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <FamilyMemberForm
          tenantId={tenant.id}
          member={editing}
          existingDocs={existingDocsFor(editing)}
          onSaved={onSaved}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
};
