import React, { useState, useMemo } from 'react';
import { 
  MessageSquareWarning, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  XCircle,
  ArrowUpDown,
  Phone,
  Building2,
  FileText,
  Trash2,
  MessageSquare,
  Edit3
} from 'lucide-react';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmUi, promptUi } from '../utils/uiDialog';
import { MediaUploadField } from '../components/MediaUploadField';
import { printDocument } from '../utils/printDocument';
import { notifyUser } from '../utils/userFeedback';

interface ComplaintsViewProps {
  complaints: Complaint[];
  onAddComplaint: (complaint: Omit<Complaint, 'id'>) => void;
  onUpdateStatus: (id: string, status: ComplaintStatus, resolutionNotes?: string) => void;
  onDeleteComplaint?: (id: string) => void;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  complaints,
  onAddComplaint,
  onUpdateStatus,
  onDeleteComplaint
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [replyComplaint, setReplyComplaint] = useState<Complaint | null>(null);
  const [replyNotes, setReplyNotes] = useState('');
  const [replyStatus, setReplyStatus] = useState<ComplaintStatus>('In Progress');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  // Form state for new complaint
  const [newComplainant, setNewComplainant] = useState('');
  const [newBuilding, setNewBuilding] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState('إزعاج وضوضاء');
  const [newPriority, setNewPriority] = useState<ComplaintPriority>('Medium');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  const handleSort = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = 
      c.ticketNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complainantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedComplaints = useMemo(() => {
    if (!sortConfig) return filteredComplaints;
    return [...filteredComplaints].sort((a: any, b: any) => {
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
  }, [filteredComplaints, sortConfig]);

  const totalCount = complaints.length;
  const newCount = complaints.filter(c => c.status === 'New').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddComplaint({
      ticketNo: `CMP-2026-${Math.floor(100 + Math.random() * 900)}`,
      complainantName: newComplainant,
      buildingNumber: newBuilding,
      unitNumber: newUnit,
      phone: newPhone,
      category: newCategory,
      priority: newPriority,
      description: newDescription,
      status: 'New',
      createdAt: new Date().toISOString().split('T')[0],
      attachmentUrl: newAttachmentUrl || undefined, attachmentName: newAttachmentName || undefined
    });
    setNewComplainant('');
    setNewDescription(''); setNewAttachmentUrl(''); setNewAttachmentName('');
    setShowAddModal(false);
  };

  const handleOpenReply = (c: Complaint) => {
    setReplyComplaint(c);
    setReplyNotes(c.resolutionNotes || '');
    setReplyStatus(c.status);
  };

  const handleSaveReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyComplaint) {
      onUpdateStatus(replyComplaint.id, replyStatus, replyNotes);
      setReplyComplaint(null);
    }
  };

  const handleDelete = async (id: string, ticketNo: string) => {
    const ok = await confirmUi({ title: language === 'ar' ? 'حذف البلاغ' : 'Delete complaint', message: language === 'ar' ? `هل أنت متأكد من حذف البلاغ ${ticketNo}؟` : `Are you sure you want to delete ticket ${ticketNo}?`, confirmText: language === 'ar' ? 'حذف البلاغ' : 'Delete', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' });
    if (ok) onDeleteComplaint?.(id);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">
            <MessageSquareWarning className="w-4 h-4" />
            <span>{language === 'ar' ? 'إدارة بلاغات وسجل الشكاوى' : 'Complaints & Issues Register'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {language === 'ar' ? 'قسم الشكاوى والبلاغات' : 'Complaints Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'تسجيل، متابعة، تحديث حالات وإرسال الردود للسكان والمستأجرين في مجمع أزهار السكني.' : 'Track tenant complaints, update status, send resolution notes, and manage ticket lifecycle.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'تسجيل بلاغ / شكوى جديدة' : 'New Complaint Ticket'}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{language === 'ar' ? 'إجمالي البلاغات' : 'Total Complaints'}</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{language === 'ar' ? 'بلاغات جديدة' : 'New Tickets'}</span>
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-900 mt-1">{newCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{language === 'ar' ? 'قيد المعالجة' : 'In Progress'}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1">{inProgressCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{language === 'ar' ? 'تمت المعالجة' : 'Resolved'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث عن رقم البلاغ، اسم المشتكي، الوحدة، أو الوصف...' : 'Search ticket no, tenant, unit...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
          >
            <option value="all">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
            <option value="إزعاج وضوضاء">{language === 'ar' ? 'إزعاج وضوضاء' : 'Noise / Disturbance'}</option>
            <option value="نظافة ومرافق">{language === 'ar' ? 'نظافة ومرافق' : 'Cleanliness / Facilities'}</option>
            <option value="صيانة وتكييف">{language === 'ar' ? 'صيانة وتكييف' : 'Maintenance / AC'}</option>
            <option value="أخرى">{language === 'ar' ? 'أخرى' : 'Other'}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
          >
            <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="New">{language === 'ar' ? 'جديد' : 'New'}</option>
            <option value="In Progress">{language === 'ar' ? 'قيد المتابعة' : 'In Progress'}</option>
            <option value="Resolved">{language === 'ar' ? 'تم الحل' : 'Resolved'}</option>
            <option value="Closed">{language === 'ar' ? 'مغلق' : 'Closed'}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
              <tr>
                <th className="py-3 px-3 border-r border-blue-600/40 w-10 text-center">#</th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('ticketNo')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم البلاغ' : 'Ticket No'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('complainantName')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المشتكي / الساكن' : 'Tenant / Complainant'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('buildingNumber')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبنى / الوحدة' : 'Building / Unit'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('phone')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الجوال' : 'Phone'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'التصنيف' : 'Category'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('description')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'تفاصيل البلاغ والرد' : 'Description & Notes'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'التاريخ' : 'Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الحالة' : 'Status'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>{language === 'ar' ? 'الإجراءات' : 'Actions'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {sortedComplaints.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد شكاوى مطابقة للبحث.' : 'No complaints found.'}
                  </td>
                </tr>
              ) : (
                sortedComplaints.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-600 border-l border-slate-100">{c.ticketNo}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 border-l border-slate-100">{c.complainantName}</td>
                    <td className="py-3 px-3 border-l border-slate-100">
                      <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-900 border border-slate-200">
                        {c.buildingNumber} - {c.unitNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 border-l border-slate-100">{c.phone}</td>
                    <td className="py-3 px-3 border-l border-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-normal max-w-xs border-l border-slate-100">
                      <div className="font-semibold truncate" title={c.description}>{c.description}</div>
                      {c.resolutionNotes && (
                        <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 truncate" title={c.resolutionNotes}>
                          💬 {language === 'ar' ? 'الرد: ' : 'Reply: '}{c.resolutionNotes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 border-l border-slate-100">{c.createdAt}</td>
                    <td className="py-3 px-3 text-center border-l border-slate-100">
                      {c.status === 'New' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {language === 'ar' ? 'جديد' : 'New'}
                        </span>
                      )}
                      {c.status === 'In Progress' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {language === 'ar' ? 'قيد المتابعة' : 'In Progress'}
                        </span>
                      )}
                      {c.status === 'Resolved' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {language === 'ar' ? 'تم الحل' : 'Resolved'}
                        </span>
                      )}
                      {c.status === 'Closed' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                          {language === 'ar' ? 'مغلق' : 'Closed'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenReply(c)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                          title={language === 'ar' ? 'الرد وتعديل الحالة' : 'Reply & Status'}
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{language === 'ar' ? 'الرد/الحالة' : 'Reply/Status'}</span>
                        </button>

                        <button
                          onClick={() => printDocument({ language, title: language === 'ar' ? 'تذكرة شكوى' : 'Complaint Ticket', reference: c.ticketNo, subtitle: language === 'ar' ? 'بيانات الشكوى المسجلة بالنظام' : 'Registered complaint details', fields: [ { label: language === 'ar' ? 'رقم التذكرة' : 'Ticket No.', value: c.ticketNo }, { label: language === 'ar' ? 'الوحدة' : 'Unit', value: c.unitNumber }, { label: language === 'ar' ? 'مقدم الشكوى' : 'Complainant', value: c.complainantName }, { label: language === 'ar' ? 'الأولوية' : 'Priority', value: c.priority }, { label: language === 'ar' ? 'الحالة' : 'Status', value: c.status }, { label: language === 'ar' ? 'تاريخ البلاغ' : 'Date', value: c.createdAt }, { label: language === 'ar' ? 'التصنيف' : 'Category', value: c.category }, { label: language === 'ar' ? 'رقم الجوال' : 'Phone', value: c.phone }, { label: language === 'ar' ? 'التفاصيل' : 'Details', value: c.description, wide: true }, { label: language === 'ar' ? 'ملاحظات الحل' : 'Resolution Notes', value: c.resolutionNotes || '—', wide: true } ] })}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                          title={language === 'ar' ? 'طباعة البلاغ' : 'Print Ticket'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(c.id, c.ticketNo)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md transition-colors"
                          title={language === 'ar' ? 'حذف البلاغ' : 'Delete Ticket'}
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

      {/* Reply & Edit Status Modal */}
      {replyComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                {language === 'ar' ? `إرسال رد وتعديل حالة البلاغ (${replyComplaint.ticketNo})` : `Reply & Change Status (${replyComplaint.ticketNo})`}
              </h3>
              <button 
                onClick={() => setReplyComplaint(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReply} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">{replyComplaint.complainantName} - {language === 'ar' ? 'الوحدة' : 'Unit'} {replyComplaint.unitNumber}</div>
                <p className="text-slate-600 mt-1 text-[11px]">{replyComplaint.description}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'حالة البلاغ الجديدة' : 'New Complaint Status'}
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="New">{language === 'ar' ? 'جديد (New)' : 'New'}</option>
                  <option value="In Progress">{language === 'ar' ? 'قيد المتابعة والمعالجة (In Progress)' : 'In Progress'}</option>
                  <option value="Resolved">{language === 'ar' ? 'تم الحل والإنجاز (Resolved)' : 'Resolved'}</option>
                  <option value="Closed">{language === 'ar' ? 'مغلق (Closed)' : 'Closed'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'إرسال الرد أو ملاحظات الحل للساكن' : 'Send Reply / Resolution Notes'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={language === 'ar' ? 'اكتب تفاصيل الرد الموجه للساكن والإجراءات المتخذة...' : 'Write resolution notes or message to tenant...'}
                  value={replyNotes}
                  onChange={(e) => setReplyNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyComplaint(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'ar' ? 'حفظ وإرسال الرد' : 'Save & Send Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Complaint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-rose-600" />
                {language === 'ar' ? 'تسجيل بلاغ / شكوى جديدة' : 'New Complaint Ticket'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'اسم المشتكي / الساكن' : 'Complainant Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مهند رجب"
                  value={newComplainant}
                  onChange={(e) => setNewComplainant(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'المبنى' : 'Building'}</label>
                  <input
                    type="text"
                    required
                    value={newBuilding}
                    onChange={(e) => setNewBuilding(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الوحدة' : 'Unit'}</label>
                  <input
                    type="text"
                    required
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الجوال' : 'Phone'}</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="إزعاج وضوضاء">إزعاج وضوضاء</option>
                    <option value="نظافة ومرافق">نظافة ومرافق</option>
                    <option value="صيانة وتكييف">صيانة وتكييف</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'درجة الأهمية' : 'Priority'}</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as ComplaintPriority)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Low">منخفضة</option>
                    <option value="Medium">متوسطة</option>
                    <option value="High">عالية جداً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'تفاصيل البلاغ والشكوى' : 'Description'}</label>
                <textarea
                  required
                  rows={3}
                  placeholder={language === 'ar' ? 'اكتب تفاصيل الشكوى...' : 'Enter complaint details...'}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <MediaUploadField
                label={language === 'ar' ? 'صورة / مرفق الشكوى' : 'Complaint Photo / Attachment'}
                category="complaint-attachment" entityType="complaint"
                value={newAttachmentUrl} fileName={newAttachmentName}
                onUploaded={({url,fileName})=>{setNewAttachmentUrl(url);setNewAttachmentName(fileName);}}
                onClear={()=>{setNewAttachmentUrl('');setNewAttachmentName('');}}
              />

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'ar' ? 'حفظ البلاغ' : 'Save Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
