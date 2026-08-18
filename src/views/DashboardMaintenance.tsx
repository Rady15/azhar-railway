import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  UserCheck, 
  Printer, 
  Building2, 
  AlertCircle,
  FileText,
  ArrowUpDown,
  Trash2,
  UserPlus,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { MaintenanceRequest, MaintenanceStatus, StaffMember } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmUi, promptUi } from '../utils/uiDialog';
import { MediaUploadField } from '../components/MediaUploadField';
import { printDocument } from '../utils/printDocument';
import { notifyUser } from '../utils/userFeedback';

interface DashboardMaintenanceProps {
  maintenanceRequests: MaintenanceRequest[];
  onAddRequest: (req: Omit<MaintenanceRequest, 'id'>) => void;
  onUpdateStatus: (id: string, newStatus: MaintenanceStatus) => void;
  onDeleteRequest?: (id: string) => void;
  onAssignStaff?: (requestId: string, staffId: string, staffName: string) => void;
  onUpdateNotes?: (requestId: string, notes: string) => void;
  selectedCompoundId: string;
  staffMembers?: StaffMember[];
}

export const DashboardMaintenance: React.FC<DashboardMaintenanceProps> = ({
  maintenanceRequests,
  onAddRequest,
  onUpdateStatus,
  onDeleteRequest,
  onAssignStaff,
  onUpdateNotes,
  selectedCompoundId,
  staffMembers = []
}) => {
  const { language } = useLanguage();
  const [compoundFilter, setCompoundFilter] = useState<string>(selectedCompoundId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRequest, setEditRequest] = useState<MaintenanceRequest | null>(null);
  const [editStatus, setEditStatus] = useState<MaintenanceStatus>('In Progress');
  const [editStaffId, setEditStaffId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  // New Request Form state
  const [newBuilding, setNewBuilding] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newAssignedStaffId, setNewAssignedStaffId] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  const filteredRequests = maintenanceRequests.filter(req => {
    if (compoundFilter !== 'all' && req.compoundId !== compoundFilter) return false;
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    return true;
  });

  const sortedRequests = useMemo(() => {
    if (!sortConfig) return filteredRequests;
    return [...filteredRequests].sort((a: any, b: any) => {
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
  }, [filteredRequests, sortConfig]);

  // Calculate live counts matching AZ System
  const newCount = maintenanceRequests.filter(r => ['New','Open'].includes(String(r.status))).length;
  const supervisorCount = maintenanceRequests.filter(r => String(r.status) === 'Awaiting Supervisor Approval').length;
  const managerCount = maintenanceRequests.filter(r => String(r.status) === 'Awaiting Manager Approval').length;
  const progressCount = maintenanceRequests.filter(r => ['In Progress','InProgress'].includes(String(r.status))).length;
  const doneCount = maintenanceRequests.filter(r => ['Done','Completed','Closed'].includes(String(r.status))).length;
  const totalCount = newCount + supervisorCount + managerCount + progressCount + doneCount;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedStaff = staffMembers.find(s => s.id === newAssignedStaffId);
    onAddRequest({
      rvNo: `MNT-2026-00${maintenanceRequests.length + 1}`,
      compoundId: compoundFilter === '2' ? '2' : '1',
      compoundName: compoundFilter === '2' ? 'Meadow Park Garden' : 'Azhar Residence',
      buildingNumber: newBuilding,
      unitNumber: newUnit,
      responsibleName: newResponsible,
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      workActivity: newActivity,
      totalAmount: parseFloat(newAmount) || 0,
      status: 'New',
      daysToEnd: 7,
      assignedStaffId: assignedStaff ? assignedStaff.id : undefined,
      assignedStaffName: assignedStaff ? assignedStaff.name : undefined,
      attachmentUrl: newAttachmentUrl || undefined, attachmentName: newAttachmentName || undefined
    });
    setShowAddModal(false);
    setNewBuilding(''); setNewUnit(''); setNewResponsible(''); setNewAmount(''); setNewAssignedStaffId(''); setNewActivity(''); setNewAttachmentUrl(''); setNewAttachmentName('');
  };

  const handleOpenEdit = (req: MaintenanceRequest) => {
    setEditRequest(req);
    setEditStatus(req.status);
    setEditStaffId(req.assignedStaffId || '');
    setEditNotes(req.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editRequest) {
      if (editStatus !== editRequest.status) {
        onUpdateStatus(editRequest.id, editStatus);
      }
      if (onAssignStaff && editStaffId) {
        const selectedStaff = staffMembers.find(s => s.id === editStaffId);
        if (selectedStaff) {
          onAssignStaff(editRequest.id, selectedStaff.id, selectedStaff.name);
        }
      }
      if (onUpdateNotes && editNotes !== editRequest.notes) {
        onUpdateNotes(editRequest.id, editNotes);
      }
      setEditRequest(null);
    }
  };

  const handleDelete = async (id: string, rvNo: string) => {
    const ok = await confirmUi({ title: language === 'ar' ? 'حذف طلب الصيانة' : 'Delete maintenance ticket', message: language === 'ar' ? `هل أنت متأكد من حذف طلب الصيانة ${rvNo}؟ لا يمكن التراجع عن هذه العملية.` : `Delete maintenance ticket ${rvNo}? This action cannot be undone.`, confirmText: language === 'ar' ? 'حذف الطلب' : 'Delete ticket', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' });
    if (ok) onDeleteRequest?.(id);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
            <Wrench className="w-4 h-4" />
            <span>{language === 'ar' ? 'تشغيل وإدارة الصيانة' : 'Facility Operations'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {language === 'ar' ? 'لوحة متابعة بلاغات ومحاضر الصيانة' : 'Dashboard of Maintenance'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'تتبع تذاكر الصيانة، مراحل الموافقة، إسناد المهام لفريق العمل، والحذف والردود.' : 'Track maintenance tickets, approval workflows, assign requests to staff members, edit status and delete.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'طلب صيانة جديد' : 'New Maintenance Request'}
        </button>
      </div>

      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setStatusFilter(statusFilter === 'New' ? 'all' : 'New')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'New' 
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' 
              : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{language === 'ar' ? 'طلبات جديدة' : 'New Requests'}</span>
            <AlertCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold mt-1">{newCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'Awaiting Supervisor Approval' ? 'all' : 'Awaiting Supervisor Approval')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Awaiting Supervisor Approval' 
              ? 'bg-amber-500 text-white border-amber-500 shadow-lg scale-105' 
              : 'bg-white border-slate-200 hover:border-amber-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{language === 'ar' ? 'موافقة المشرف' : 'Supervisor Approval'}</span>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold mt-1">{supervisorCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'Awaiting Manager Approval' ? 'all' : 'Awaiting Manager Approval')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Awaiting Manager Approval' 
              ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-105' 
              : 'bg-white border-slate-200 hover:border-purple-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{language === 'ar' ? 'موافقة المدير' : 'Manager Approval'}</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-extrabold mt-1">{managerCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'all' : 'In Progress')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'In Progress' 
              ? 'bg-cyan-600 text-white border-cyan-600 shadow-lg scale-105' 
              : 'bg-white border-slate-200 hover:border-cyan-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</span>
            <Clock className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-xl font-extrabold mt-1">{progressCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'Done' ? 'all' : 'Done')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Done' 
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105' 
              : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{language === 'ar' ? 'مكتملة' : 'Done / Completed'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold mt-1">{doneCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('all')}
          className="p-3.5 rounded-2xl border border-slate-300 bg-slate-900 text-white shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Tickets'}</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold mt-1">{totalCount}</div>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
              <tr>
                <th className="py-3 px-3 border-r border-blue-600/40 w-10 text-center">#</th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('rvNo')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم الطلب' : 'RV.No'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('buildingNumber')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبنى / الوحدة' : 'Building/Unit'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('workActivity')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'بيان النشاط / الأعمال' : 'Work Activity'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('assignedStaffName')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المختص المسند إليه' : 'Assigned Staff'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-left font-mono" onClick={() => handleSort('totalAmount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('startDate')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الحالة' : 'Status'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>{language === 'ar' ? 'الإجراءات وتنسيق العمل' : 'Actions'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {sortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد طلبات صيانة مطابقة للبحث.' : 'No maintenance requests found.'}
                  </td>
                </tr>
              ) : (
                sortedRequests.map((req, idx) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1a7f8b] border-l border-slate-100">{req.rvNo}</td>
                    <td className="py-3 px-3 border-l border-slate-100">
                      <span className="font-bold text-slate-800">{req.buildingNumber}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-900 border border-slate-200 mr-1.5">
                        {req.unitNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-normal max-w-xs border-l border-slate-100">
                      <div className="font-semibold truncate" title={req.workActivity}>{req.workActivity}</div>
                      {req.notes && (
                        <div className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1 truncate">
                          📝 {req.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 border-l border-slate-100">
                      {req.assignedStaffName || (req as any).assignedToName ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          {req.assignedStaffName || (req as any).assignedToName}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] italic">
                          {language === 'ar' ? 'غير مسند' : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-slate-900 border-l border-slate-100">
                      {req.totalAmount.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 border-l border-slate-100">{req.startDate}</td>
                    <td className="py-3 px-3 text-center border-l border-slate-100">
                      {req.status === 'New' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {language === 'ar' ? 'جديد' : 'New'}
                        </span>
                      )}
                      {req.status === 'Awaiting Supervisor Approval' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {language === 'ar' ? 'موافقة المشرف' : 'Supv. Approval'}
                        </span>
                      )}
                      {req.status === 'Awaiting Manager Approval' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          {language === 'ar' ? 'موافقة المدير' : 'Manager Approval'}
                        </span>
                      )}
                      {req.status === 'In Progress' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                          {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
                        </span>
                      )}
                      {req.status === 'Done' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {language === 'ar' ? 'مكتمل' : 'Done'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(req)}
                          className="px-2.5 py-1 bg-[#29b4c4] hover:bg-[#229ca9] text-white rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                          title={language === 'ar' ? 'تعديل وتحديد الفني' : 'Edit & Assign'}
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>{language === 'ar' ? 'إسناد/تعديل' : 'Assign/Edit'}</span>
                        </button>

                        <button
                          onClick={() => printDocument({ language, title: language === 'ar' ? 'إذن طلب صيانة' : 'Maintenance Work Order', reference: req.rvNo, subtitle: language === 'ar' ? 'بيانات طلب الصيانة المسجلة بالنظام' : 'Maintenance request details', fields: [ { label: language === 'ar' ? 'رقم الطلب' : 'Request No.', value: req.rvNo }, { label: language === 'ar' ? 'الوحدة' : 'Unit', value: req.unitNumber }, { label: language === 'ar' ? 'المسؤول' : 'Responsible', value: req.responsibleName }, { label: language === 'ar' ? 'نوع العمل' : 'Work Activity', value: req.workActivity }, { label: language === 'ar' ? 'الحالة' : 'Status', value: req.status }, { label: language === 'ar' ? 'الفني / المسؤول' : 'Assigned To', value: req.assignedStaffName || req.assignedStaffId || '—' }, { label: language === 'ar' ? 'تاريخ الطلب' : 'Request Date', value: req.startDate }, { label: language === 'ar' ? 'قيمة الأعمال' : 'Work Amount', value: `${Number(req.totalAmount || 0).toLocaleString()} SAR` }, { label: language === 'ar' ? 'تاريخ الانتهاء المستهدف' : 'Target End Date', value: req.targetEndDate }, { label: language === 'ar' ? 'ملاحظات' : 'Notes', value: req.notes || '—', wide: true } ] })}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                          title={language === 'ar' ? 'طباعة الإذن' : 'Print Ticket'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(req.id, req.rvNo)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md transition-colors"
                          title={language === 'ar' ? 'حذف طلب الصيانة' : 'Delete Request'}
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

      {/* Edit & Assign Staff Modal */}
      {editRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#29b4c4]" />
                {language === 'ar' ? `إسناد وتحديث طلب الصيانة (${editRequest.rvNo})` : `Assign & Edit Maintenance (${editRequest.rvNo})`}
              </h3>
              <button 
                onClick={() => setEditRequest(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">{language === 'ar' ? 'المبنى' : 'Building'} {editRequest.buildingNumber} - {language === 'ar' ? 'الوحدة' : 'Unit'} {editRequest.unitNumber}</div>
                <p className="text-slate-600 mt-1 text-[11px]">{editRequest.workActivity}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'إسناد الطلب إلى الفني / الموظف المختص' : 'Assign to Staff Member'}
                </label>
                <select
                  value={editStaffId}
                  onChange={(e) => setEditStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="">{language === 'ar' ? '-- اختر فني من فريق العمل --' : '-- Select Staff Member --'}</option>
                  {staffMembers.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role}) - {staff.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'تحديث حالة طلب الصيانة' : 'Update Ticket Status'}
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MaintenanceStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="New">جديد (New)</option>
                  <option value="Awaiting Supervisor Approval">موافقة المشرف (Awaiting Supervisor)</option>
                  <option value="Awaiting Manager Approval">موافقة المدير (Awaiting Manager)</option>
                  <option value="In Progress">قيد التنفيذ (In Progress)</option>
                  <option value="Done">مكتمل وتم الإنجاز (Done)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'ملاحظات الصيانة والردود الفنية' : 'Technical Notes & Response'}
                </label>
                <textarea
                  rows={3}
                  placeholder={language === 'ar' ? 'اكتب التقرير الفني أو رد الصيانة...' : 'Technical notes or response...'}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRequest(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'ar' ? 'حفظ وإسناد الطلب' : 'Save & Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#29b4c4]" />
                {language === 'ar' ? 'طلب صيانة جديد' : 'New Maintenance Request'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'ar' ? 'رقم المبنى' : 'Building Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newBuilding}
                    onChange={(e) => setNewBuilding(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'المهندس / الشخص المسؤول' : 'Responsible Engineer/Person'}
                </label>
                <input
                  type="text"
                  required
                  value={newResponsible}
                  onChange={(e) => setNewResponsible(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'إسناد مبدئي إلى الفني المختص' : 'Initial Assigned Staff'}
                </label>
                <select
                  value={newAssignedStaffId}
                  onChange={(e) => setNewAssignedStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="">{language === 'ar' ? '-- بدون إسناد حالياً --' : '-- Unassigned --'}</option>
                  {staffMembers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'بيان النشاط / وصف المشكلة' : 'Work Activity / Issue Description'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={language === 'ar' ? 'اكتب تفاصيل طلب الصيانة المطلوب...' : 'Describe the maintenance requirement...'}
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'المبلغ التقديري (ر.س)' : 'Estimated Cost Amount (SAR)'}
                </label>
                <input
                  type="number"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <MediaUploadField
                label={language === 'ar' ? 'صورة / مرفق طلب الصيانة' : 'Maintenance Photo / Attachment'}
                category="maintenance-attachment" entityType="maintenance"
                value={newAttachmentUrl} fileName={newAttachmentName}
                onUploaded={({url,fileName})=>{setNewAttachmentUrl(url);setNewAttachmentName(fileName);}}
                onClear={()=>{setNewAttachmentUrl('');setNewAttachmentName('');}}
              />

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'ar' ? 'إرسال الطلب' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
