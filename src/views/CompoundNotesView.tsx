import React, { useEffect, useState } from 'react';
import { BookOpen, Edit3, Plus, Save, Trash2, X, Search, StickyNote } from 'lucide-react';
import { apiService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

type Compound = { id: string; name: string; code: string };
type Note = { id:string; compoundId:string; compoundName:string; title?:string; content:string; createdAt?:string; updatedAt?:string };

const COMPOUNDS: Compound[] = [
  { id:'1', name:'Azhar Residence', code:'AZHAR' },
  { id:'2', name:'Meadow Park Garden', code:'MEADOW' },
  { id:'4', name:'Daar Residence', code:'DAAR' },
];

export const CompoundNotesView: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const [compoundId, setCompoundId] = useState(COMPOUNDS[0].id);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const compound = COMPOUNDS.find(c => c.id === compoundId) || COMPOUNDS[0];
  const compoundLabel = (c: Compound) => isRtl ? (c.id==='1' ? 'أزهار ريزيدنس' : c.id==='2' ? 'ميدو بارك جاردن' : 'دار ريزيدنس') : c.name;

  const loadNotes = async () => {
    setLoading(true);
    try { setNotes(await apiService.getCompoundNotes(compoundId)); }
    catch (e) { console.error(e); setNotes([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadNotes(); }, [compoundId]);

  const startNew = () => { setEditing({id:'',compoundId,compoundName:compound.name,title:'',content:''}); setTitle(''); setContent(''); };
  const startEdit = (n: Note) => { setEditing(n); setTitle(n.title || ''); setContent(n.content || ''); };
  const cancel = () => { setEditing(null); setTitle(''); setContent(''); };

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      if (editing?.id) {
        const updated = await apiService.updateCompoundNote(editing.id, {title, content});
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      } else {
        const created = await apiService.addCompoundNote({compoundId, compoundName:compound.name, title, content});
        setNotes(prev => [created, ...prev]);
      }
      cancel();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const remove = async (id:string) => {
    if (!window.confirm(t('هل تريد حذف هذه الملاحظة؟', 'Delete this note?'))) return;
    try { await apiService.deleteCompoundNote(id); setNotes(prev => prev.filter(n => n.id !== id)); }
    catch (e) { console.error(e); }
  };

  const visible = notes.filter(n => `${n.title || ''} ${n.content || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-600 text-xs font-bold mb-1">
            <StickyNote className="w-4 h-4" /> {t('ملاحظات الإدارة الخاصة', 'Private Admin Notes')}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('ملاحظات الكمبوند', 'Compound Notes')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('سجّل أي معلومات أو تعليمات أو ملاحظات تخص كل كمبوند، وتظل هذه الملاحظات متاحة للإدارة فقط.', 'Record any information, instructions, or notes for each compound. These notes are private to management.')}</p>
        </div>
        <button onClick={startNew} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#29b4c4] text-white font-semibold shadow-sm hover:opacity-90">
          <Plus className="w-4 h-4" /> {t('إضافة ملاحظة', 'Add Note')}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
            {COMPOUNDS.map(c => (
              <button key={c.id} onClick={() => setCompoundId(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${compoundId===c.id ? 'bg-[#29b4c4] text-white border-[#29b4c4]' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'}`}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="relative md:ms-auto md:w-72">
            <Search className={`absolute top-2.5 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('بحث في الملاحظات...', 'Search notes...')}
              className={`w-full border border-slate-200 rounded-xl py-2 text-sm outline-none focus:border-cyan-400 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} />
          </div>
        </div>
      </div>

      {editing && (
        <div className="bg-white border border-cyan-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800">{editing.id ? t('تعديل الملاحظة', 'Edit Note') : t('ملاحظة جديدة', 'New Note')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('الكمبوند: ', 'Compound: ')}{compoundLabel(compound)}</p>
            </div>
            <button onClick={cancel} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid gap-3">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={t('عنوان اختياري', 'Optional title')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400" />
            <textarea value={content} onChange={e=>setContent(e.target.value)} rows={7} autoFocus
              placeholder={t('اكتب أي شيء يخص الكمبوند هنا...', 'Write anything related to this compound...')}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-cyan-400 resize-y" />
            <div className="flex justify-end gap-2">
              <button onClick={cancel} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600">{t('إلغاء', 'Cancel')}</button>
              <button disabled={saving || !content.trim()} onClick={save} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">{t('جاري تحميل الملاحظات...', 'Loading notes...')}</div> :
         visible.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>{t('لا توجد ملاحظات لهذا الكمبوند.', 'No notes for this compound yet.')}</p></div> :
         visible.map(n => (
          <article key={n.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {n.title && <h3 className="font-bold text-slate-800 mb-1">{n.title}</h3>}
                <p className="text-sm text-slate-600 whitespace-pre-wrap break-words leading-7">{n.content}</p>
                <p className="text-[11px] text-slate-400 mt-3">{n.updatedAt ? new Date(n.updatedAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US') : ''}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={()=>startEdit(n)} className="p-2 rounded-lg text-slate-500 hover:bg-cyan-50 hover:text-cyan-600"><Edit3 className="w-4 h-4" /></button>
                <button onClick={()=>remove(n.id)} className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </article>
         ))}
      </div>
    </div>
  );
};
