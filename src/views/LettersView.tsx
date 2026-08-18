import React, { useState, useMemo } from 'react';
import {
  Mail,
  Plus,
  Search,
  Users,
  Send,
  Eye,
  FileText,
  Trash2,
  Edit3,
  ArrowUpDown,
  CalendarClock,
  UserCheck,
  X
} from 'lucide-react';
import { Letter, Tenant, StaffMember } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmUi, promptUi } from '../utils/uiDialog';

interface LettersViewProps {
  letters: Letter[];
  tenants?: Tenant[];
  staffMembers?: StaffMember[];
  onAddLetter: (letter: Omit<Letter, 'id' | 'sentById' | 'sentByName' | 'sentAt'>) => void;
  onUpdateLetter: (letter: Letter) => void;
  onDeleteLetter: (id: string) => void;
}

interface LetterForm {
  title: string;
  content: string;
  recipientType: string;
  recipientName: string;
}

const RECIPIENT_TYPES = ['AllTenants', 'SpecificTenant', 'Staff', 'Other'];

const recipientLabel = (type: string, language: 'ar' | 'en'): string => {
  switch (type) {
    case 'AllTenants': return language === 'ar' ? 'جميع المستأجرين' : 'All Tenants';
    case 'SpecificTenant': return language === 'ar' ? 'مستأجر محدد' : 'Specific Tenant';
    case 'Staff': return language === 'ar' ? 'فريق العمل' : 'Staff';
    default: return language === 'ar' ? 'أخرى' : 'Other';
  }
};

export const LettersView: React.FC<LettersViewProps> = ({
  letters,
  tenants = [],
  staffMembers = [],
  onAddLetter,
  onUpdateLetter,
  onDeleteLetter
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [viewingLetter, setViewingLetter] = useState<Letter | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  const [form, setForm] = useState<LetterForm>({
    title: '',
    content: '',
    recipientType: 'AllTenants',
    recipientName: ''
  });

  const openAddModal = () => {
    setEditingLetter(null);
    setForm({ title: '', content: '', recipientType: 'AllTenants', recipientName: '' });
    setShowFormModal(true);
  };

  const openEditModal = (l: Letter) => {
    setEditingLetter(l);
    setForm({
      title: l.title,
      content: l.content,
      recipientType: l.recipientType || 'AllTenants',
      recipientName: l.recipientName === 'All Tenants' ? '' : (l.recipientName || '')
    });
    setShowFormModal(true);
  };

  const handleSort = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  const filteredLetters = letters.filter(l => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.recipientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.sentByName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRecipient = recipientFilter === 'all' || l.recipientType === recipientFilter;
    return matchesSearch && matchesRecipient;
  });

  const sortedLetters = useMemo(() => {
    if (!sortConfig) return filteredLetters;
    return [...filteredLetters].sort((a: any, b: any) => {
      let aVal = a[sortConfig.field];
      let bVal = b[sortConfig.field];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal, 'ar', { numeric: true })
          : bVal.localeCompare(aVal, 'ar', { numeric: true });
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredLetters, sortConfig]);

  const totalCount = letters.length;
  const allTenantsCount = letters.filter(l => l.recipientType === 'AllTenants').length;
  const staffCount = letters.filter(l => l.recipientType === 'Staff').length;
  const specificCount = letters.filter(l => l.recipientType === 'SpecificTenant').length;

  const formatDate = (value: string) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value.slice(0, 10);
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipientName = form.recipientType === 'AllTenants'
      ? (language === 'ar' ? 'جميع المستأجرين' : 'All Tenants')
      : form.recipientName;

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      recipientType: form.recipientType,
      recipientName
    };

    if (editingLetter) {
      onUpdateLetter({
        ...editingLetter,
        title: payload.title,
        content: payload.content,
        recipientType: payload.recipientType,
        recipientName: payload.recipientName
      });
    } else {
      onAddLetter(payload);
    }
    setShowFormModal(false);
    setEditingLetter(null);
  };

  const handleDelete = async (l: Letter) => {
    const ok = await confirmUi({ title: language === 'ar' ? 'حذف الخطاب' : 'Delete letter', message: language === 'ar' ? `هل أنت متأكد من حذف الخطاب «${l.title}»؟` : `Are you sure you want to delete the letter "${l.title}"?`, confirmText: language === 'ar' ? 'حذف' : 'Delete', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' });
    if (ok) onDeleteLetter(l.id);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-700 uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4" />
            <span>{language === 'ar' ? 'إدارة الخطابات والمراسلات' : 'Letters & Correspondence'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {language === 'ar' ? 'قسم الخطابات الرسمية' : 'Letters Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'إرسال وتحرير وحذف الخطابات الرسمية الموجهة للمستأجرين وفريق العمل في مجمع أزهار السكني.'
              : 'Compose, edit and manage official letters sent to tenants and staff of Azhar Residence.'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#1f9bad] text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'إرسال خطاب جديد' : 'New Letter'}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{language === 'ar' ? 'إجمالي الخطابات' : 'Total Letters'}</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-cyan-200 bg-cyan-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">{language === 'ar' ? 'لجميع المستأجرين' : 'All Tenants'}</span>
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-xl font-extrabold text-cyan-900 mt-1">{allTenantsCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{language === 'ar' ? 'لفريق العمل' : 'To Staff'}</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">{staffCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-violet-200 bg-violet-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">{language === 'ar' ? 'لمستأجر محدد' : 'Specific Tenant'}</span>
            <Send className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-xl font-extrabold text-violet-900 mt-1">{specificCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث عن عنوان الخطاب، النص، المستلم، أو المرسل...' : 'Search title, content, recipient or sender...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <select
          value={recipientFilter}
          onChange={(e) => setRecipientFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
        >
          <option value="all">{language === 'ar' ? 'جميع المستلمين' : 'All Recipients'}</option>
          {RECIPIENT_TYPES.map(t => (
            <option key={t} value={t}>{recipientLabel(t, language)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b3038] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-slate-700 select-none">
              <tr>
                <th className="py-3 px-3 border-r border-slate-600/40 w-10 text-center">#</th>
                <th className="py-3 px-3 border-r border-slate-600/40" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-300">
                    <span>{language === 'ar' ? 'عنوان الخطاب' : 'Title'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-600/40" onClick={() => handleSort('recipientType')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-300">
                    <span>{language === 'ar' ? 'المستلم' : 'Recipient'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-600/40" onClick={() => handleSort('content')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-300">
                    <span>{language === 'ar' ? 'نص الخطاب' : 'Content'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-600/40" onClick={() => handleSort('sentByName')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-300">
                    <span>{language === 'ar' ? 'المرسل' : 'Sender'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-600/40" onClick={() => handleSort('sentAt')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-300">
                    <span>{language === 'ar' ? 'تاريخ الإرسال' : 'Sent Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>{language === 'ar' ? 'الإجراءات' : 'Actions'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {sortedLetters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد خطابات مطابقة.' : 'No letters found.'}
                  </td>
                </tr>
              ) : (
                sortedLetters.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 border-l border-slate-100 max-w-[220px]">
                      <div className="truncate" title={l.title}>{l.title}</div>
                    </td>
                    <td className="py-3 px-3 border-l border-slate-100">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                        {recipientLabel(l.recipientType, language)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-normal max-w-xs border-l border-slate-100">
                      <div className="truncate" title={l.content}>{l.content}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 border-l border-slate-100">{l.sentByName || '—'}</td>
                    <td className="py-3 px-3 font-mono text-slate-500 border-l border-slate-100">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="w-3 h-3 text-slate-400" />
                        {formatDate(l.sentAt)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingLetter(l)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                          title={language === 'ar' ? 'عرض الخطاب' : 'View Letter'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditModal(l)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors"
                          title={language === 'ar' ? 'تعديل الخطاب' : 'Edit Letter'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(l)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md transition-colors"
                          title={language === 'ar' ? 'حذف الخطاب' : 'Delete Letter'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Letter Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#29b4c4]" />
                {editingLetter
                  ? (language === 'ar' ? 'تعديل الخطاب' : 'Edit Letter')
                  : (language === 'ar' ? 'إرسال خطاب جديد' : 'New Letter')}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'عنوان الخطاب *' : 'Letter Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: إشعار تجديد العقد' : 'e.g. Contract Renewal Notice'}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'المستلم *' : 'Recipient *'}
                </label>
                <select
                  value={form.recipientType}
                  onChange={(e) => setForm({ ...form, recipientType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#29b4c4]/30"
                >
                  {RECIPIENT_TYPES.map(t => (
                    <option key={t} value={t}>{recipientLabel(t, language)}</option>
                  ))}
                </select>
              </div>

              {(form.recipientType === 'SpecificTenant' || form.recipientType === 'Staff') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'ar' ? 'اسم المستلم *' : 'Recipient Name *'}
                  </label>
                  <select
                    required
                    value={form.recipientName}
                    onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#29b4c4]/30"
                  >
                    <option value="" disabled>
                      {language === 'ar' ? '— اختر من القائمة —' : '— Select —'}
                    </option>
                    {form.recipientType === 'SpecificTenant' && tenants
                      .map(t => ({ value: `${t.fullNameArabic || t.name}${t.unitNumber ? ` (${t.unitNumber})` : ''}`, label: `${t.fullNameArabic || t.name}${t.unitNumber ? ` - وحدة ${t.unitNumber}` : ''}` }))
                      .filter((opt, idx, arr) => arr.findIndex(o => o.value === opt.value) === idx)
                      .map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {language === 'ar' ? opt.label : opt.value}
                        </option>
                      ))}
                    {form.recipientType === 'Staff' && staffMembers
                      .map(s => ({ value: `${s.name}${s.empCode ? ` (${s.empCode})` : ''}`, label: `${s.name} (${s.empCode})` }))
                      .filter((opt, idx, arr) => arr.findIndex(o => o.value === opt.value) === idx)
                      .map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    {form.recipientName && (
                      <option value={form.recipientName}>{form.recipientName}</option>
                    )}
                  </select>
                </div>
              )}

              {form.recipientType === 'Other' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'ar' ? 'اسم المستلم *' : 'Recipient Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'ar' ? 'مثال: شركة الصيانة' : 'e.g. Maintenance Company'}
                    value={form.recipientName}
                    onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]/30"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'نص الخطاب *' : 'Letter Content *'}
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder={language === 'ar' ? 'اكتب نص الخطاب الموجه للمستلم...' : 'Write the letter body...'}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]/30"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#1f9bad] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {editingLetter
                    ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                    : (language === 'ar' ? 'إرسال الخطاب' : 'Send Letter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Letter Modal */}
      {viewingLetter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#2b3038] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="text-base font-bold truncate">{viewingLetter.title}</h3>
              </div>
              <button onClick={() => setViewingLetter(null)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#29b4c4]" />
                  <div>
                    <p className="font-bold text-slate-900">
                      {language === 'ar' ? 'المرسل: ' : 'Sender: '}{viewingLetter.sentByName || '—'}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDate(viewingLetter.sentAt)}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                  {recipientLabel(viewingLetter.recipientType, language)}
                </span>
              </div>

              {(viewingLetter.recipientName && viewingLetter.recipientType !== 'AllTenants') && (
                <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
                  <Users className="w-4 h-4 text-violet-600" />
                  <span className="font-bold text-slate-900">{viewingLetter.recipientName}</span>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed text-slate-700">
                {viewingLetter.content}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setViewingLetter(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
                <button
                  onClick={() => { const l = viewingLetter; setViewingLetter(null); openEditModal(l); }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  {language === 'ar' ? 'تعديل الخطاب' : 'Edit Letter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
