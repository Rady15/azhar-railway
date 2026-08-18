import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Phone, 
  Printer, 
  CheckCircle2, 
  Clock, 
  UserX,
  ArrowUpDown,
  Briefcase,
  DollarSign,
  MessageCircle,
  Users,
  CheckSquare,
  ListTodo,
  AlertCircle,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';
import { StaffMember, StaffStatus, MaintenanceRequest } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmUi, promptUi } from '../utils/uiDialog';

interface StaffViewProps {
  staffMembers: StaffMember[];
  maintenanceRequests?: MaintenanceRequest[];
  onAddStaff: (staff: Omit<StaffMember, 'id'>) => void;
  onUpdateStaffStatus: (id: string, status: StaffStatus) => void;
  onUpdateStaff?: (staff: StaffMember) => void;
  onDeleteStaff?: (id: string) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  staffMembers,
  maintenanceRequests = [],
  onAddStaff,
  onUpdateStaffStatus,
  onUpdateStaff,
  onDeleteStaff
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaffTasks, setSelectedStaffTasks] = useState<{ staffName: string; tasks: MaintenanceRequest[] } | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  // Form state
  const [newCode, setNewCode] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newSalary, setNewSalary] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const openAdd = () => { resetForm(); setEditingStaff(null); setShowAddModal(true); };

  const closeModal = () => { setShowAddModal(false); setEditingStaff(null); resetForm(); };

  const resetForm = () => {
    setNewCode('');
    setNewUsername('');
    setNewName('');
    setNewRole('');
    setNewMobile('');
    setNewEmail('');
    setNewNationalId('');
    setNewSalary(0);
    setNewPassword('');
    setNewNotes('');
  };

  const openEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setNewCode(s.empCode || '');
    setNewUsername((s as any).username || s.empCode || '');
    setNewName(s.name || '');
    setNewRole(s.role || '');
    setNewMobile(s.mobile || '');
    setNewEmail(s.email || '');
    setNewNationalId(s.nationalId || '');
    setNewSalary(s.salary || 0);
    setNewPassword('');
    setNewNotes(s.notes || '');
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

  const getStaffTasks = (staff: StaffMember) => {
    const assigned = maintenanceRequests.filter(r => 
      r.assignedStaffId === staff.id || 
      (r.assignedStaffName && r.assignedStaffName.trim() === staff.name.trim())
    );
    const inProgress = assigned.filter(r => r.status !== 'Done');
    const completed = assigned.filter(r => r.status === 'Done');

    return {
      assignedCount: assigned.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      allTasks: assigned
    };
  };

  const filteredStaff = staffMembers.filter(s => {
    const matchesSearch = 
      s.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mobile.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nationalId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedStaff = useMemo(() => {
    if (!sortConfig) return filteredStaff;
    return [...filteredStaff].sort((a: any, b: any) => {
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
  }, [filteredStaff, sortConfig]);

  const totalCount = staffMembers.length;
  const activeCount = staffMembers.filter(s => s.status === 'Active').length;
  const leaveCount = staffMembers.filter(s => s.status === 'On Leave').length;
  const totalSalaries = staffMembers.reduce((sum, s) => sum + (s.salary || 0), 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddStaff({
      empCode: newCode,
      username: newUsername || newCode,
      name: newName,
      role: newRole,
      mobile: newMobile,
      email: newEmail,
      whatsapp: `966${newMobile.replace(/^0/, '')}`,
      nationalId: newNationalId,
      status: 'Active',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: Number(newSalary),
      password: newPassword,
      notes: newNotes
    });
    resetForm();
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !onUpdateStaff) return;
    onUpdateStaff({
      ...editingStaff,
      empCode: newCode,
      username: newUsername || newCode,
      name: newName,
      role: newRole,
      mobile: newMobile,
      email: newEmail,
      whatsapp: `966${newMobile.replace(/^0/, '')}`,
      nationalId: newNationalId,
      salary: Number(newSalary),
      password: newPassword,
      notes: newNotes
    });
    setEditingStaff(null);
    resetForm();
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    const ok = await confirmUi({ title: language === 'ar' ? 'حذف الموظف' : 'Delete staff member', message: language === 'ar' ? `هل أنت متأكد من حذف الموظف ${name}؟` : `Are you sure you want to delete staff member ${name}?`, confirmText: language === 'ar' ? 'حذف الموظف' : 'Delete', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' });
    if (ok) onDeleteStaff?.(id);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>{language === 'ar' ? 'فريق العمل والمهام الموكلة' : 'Staff & Task Operations'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {language === 'ar' ? 'سجل فريق العمل والمهام التشغيلية' : 'Staff & Tasks Directory'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'متابعة طاقم العمل، المهام الموكلة، المهام الجاري العمل عليها، المهام المنتهية، وتحديث حالة الموظف.' : 'Track team personnel, assigned tasks, in-progress work, completed tasks, and active statuses.'}
          </p>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'إضافة موظف / فني جديد' : 'Add Staff Member'}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{language === 'ar' ? 'إجمالي الكادر' : 'Total Staff'}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{language === 'ar' ? 'على رأس العمل' : 'Active Staff'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">{activeCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{language === 'ar' ? 'في إجازة' : 'On Leave'}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1">{leaveCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{language === 'ar' ? 'إجمالي الرواتب الشهري' : 'Monthly Payroll'}</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-900 mt-1 font-mono">{totalSalaries.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث عن الرقم الوظيفي، الاسم، الوظيفة، الجوال، الهوية...' : 'Search staff code, name, role, mobile...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
          >
            <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="Active">{language === 'ar' ? 'على رأس العمل' : 'Active'}</option>
            <option value="On Leave">{language === 'ar' ? 'في إجازة' : 'On Leave'}</option>
            <option value="Suspended">{language === 'ar' ? 'متوقف' : 'Suspended'}</option>
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
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('empCode')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الرقم الوظيفي' : 'Emp Code'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'اسم الموظف' : 'Staff Name'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center">
                  <span>{language === 'ar' ? 'المهام الموكلة' : 'Assigned Tasks'}</span>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center">
                  <span>{language === 'ar' ? 'الجاري العمل عليها' : 'In-Progress'}</span>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center">
                  <span>{language === 'ar' ? 'المهام المنتهية' : 'Completed'}</span>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('mobile')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم الجوال' : 'Mobile'}</span>
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
                  <span>{language === 'ar' ? 'التواصل والإجراءات' : 'Actions'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {sortedStaff.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا يوجد موظفين مطبقين للبحث.' : 'No staff found.'}
                  </td>
                </tr>
              ) : (
                sortedStaff.map((s, idx) => {
                  const taskStats = getStaffTasks(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 border-l border-slate-100">{s.empCode}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 border-l border-slate-100">{s.name}</td>
                      <td className="py-3 px-3 border-l border-slate-100">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {s.role}
                        </span>
                      </td>

                      {/* Assigned Tasks */}
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        <button
                          onClick={() => setSelectedStaffTasks({ staffName: s.name, tasks: taskStats.allTasks })}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                        >
                          <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                          <span>{taskStats.assignedCount}</span>
                        </button>
                      </td>

                      {/* In Progress Tasks */}
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{taskStats.inProgressCount}</span>
                        </span>
                      </td>

                      {/* Completed Tasks */}
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{taskStats.completedCount}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700 border-l border-slate-100">{s.mobile}</td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        {s.status === 'Active' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {language === 'ar' ? 'على رأس العمل' : 'Active'}
                          </span>
                        )}
                        {s.status === 'On Leave' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {language === 'ar' ? 'في إجازة' : 'On Leave'}
                          </span>
                        )}
                        {s.status === 'Suspended' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {language === 'ar' ? 'متوقف' : 'Suspended'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setViewingStaff(s)} className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 text-[10px] font-bold flex items-center gap-1" title={language === 'ar' ? 'عرض جميع بيانات الموظف' : 'View full staff details'}>
                            <Eye className="w-3 h-3" />
                            <span>{language === 'ar' ? 'عرض' : 'View'}</span>
                          </button>
                          <a
                            href={`https://wa.me/${s.whatsapp || '966' + s.mobile.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 transition-colors flex items-center gap-1 text-[10px] font-bold"
                            title="واتساب مباشر"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                            <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                          </a>

                          {onUpdateStaff && (
                            <button
                              onClick={() => openEdit(s)}
                              className="px-2 py-1.5 bg-[#475569] hover:bg-[#334155] text-white rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                              title={language === 'ar' ? 'تعديل بيانات الموظف' : 'Edit Staff'}
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                            </button>
                          )}

                          {s.status === 'Active' ? (
                            <button
                              onClick={() => onUpdateStaffStatus(s.id, 'On Leave')}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition-colors"
                            >
                              {language === 'ar' ? 'إجازة' : 'Leave'}
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStaffStatus(s.id, 'Active')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors"
                            >
                              {language === 'ar' ? 'تفعيل' : 'Activate'}
                            </button>
                          )}

                          {onDeleteStaff && (
                            <button
                              onClick={() => handleDeleteStaff(s.id, s.name)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md transition-colors"
                              title={language === 'ar' ? 'حذف الموظف' : 'Delete Staff'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Staff Details Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[75] flex items-center justify-center p-4" onClick={() => setViewingStaff(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div><h3 className="text-base font-bold text-slate-900">{language === 'ar' ? 'بيانات الموظف كاملة' : 'Full Staff Details'}</h3><p className="text-xs text-slate-500 mt-1">{viewingStaff.name}</p></div>
              <button onClick={()=>setViewingStaff(null)} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                ['الرقم الوظيفي','Emp Code',viewingStaff.empCode],
                ['اسم المستخدم','Username',viewingStaff.username || viewingStaff.empCode || '-'],
                ['الاسم الكامل','Full Name',viewingStaff.name],
                ['المسمى الوظيفي','Job Title',viewingStaff.role],
                ['رقم الجوال','Mobile',viewingStaff.mobile],
                ['البريد الإلكتروني','Email',viewingStaff.email || '-'],
                ['رقم الهوية / الإقامة','National ID',viewingStaff.nationalId || '-'],
                ['الحالة','Status',viewingStaff.status],
                ['تاريخ الانضمام','Joining Date',viewingStaff.joiningDate || '-'],
                ['الراتب الشهري','Monthly Salary',Number(viewingStaff.salary||0).toLocaleString()],
                ['واتساب','WhatsApp',viewingStaff.whatsapp || '-'],
              ].map(([ar,en,val])=><div key={en} className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-slate-400 mb-1">{language === 'ar' ? ar : en}</div><div className="font-bold text-slate-900 break-words">{val}</div></div>)}
            </div>
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"><div className="text-slate-400 mb-1">{language === 'ar' ? 'الملاحظات' : 'Notes'}</div><div className="font-medium text-slate-800 whitespace-pre-wrap">{viewingStaff.notes || '-'}</div></div>
            <div className="mt-5"><button onClick={()=>setViewingStaff(null)} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold">{language === 'ar' ? 'إغلاق' : 'Close'}</button></div>
          </div>
        </div>
      )}

      {/* Staff Tasks View Modal */}
      {selectedStaffTasks && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-600" />
                {language === 'ar' ? `قائمة المهام الموكلة للموظف: ${selectedStaffTasks.staffName}` : `Assigned Tasks for ${selectedStaffTasks.staffName}`}
              </h3>
              <button 
                onClick={() => setSelectedStaffTasks(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedStaffTasks.tasks.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-xs">
                  {language === 'ar' ? 'لا توجد مهام صيانة موكلة لهذا الموظف حالياً.' : 'No maintenance tasks assigned to this staff member currently.'}
                </p>
              ) : (
                selectedStaffTasks.tasks.map(t => (
                  <div key={t.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#1a7f8b]">{t.rvNo}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {t.status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {language === 'ar' ? 'الوحدة:' : 'Unit:'} {t.buildingNumber} - {t.unitNumber}
                    </div>
                    <p className="text-slate-600">{t.workActivity}</p>
                    <div className="text-[10px] text-slate-400 pt-1 font-mono">{t.startDate}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedStaffTasks(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {(showAddModal || editingStaff) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                {language === 'ar' ? (editingStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد بالكادر') : (editingStaff ? 'Edit Staff Member' : 'Add New Staff Member')}
              </h3>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form autoComplete="off" onSubmit={editingStaff ? handleEditSubmit : handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الرقم الوظيفي' : 'Emp Code'}</label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'اسم المستخدم للدخول' : 'Login Username'}</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.trim())}
                    autoComplete="off"
                    placeholder={language === 'ar' ? 'اتركه فارغًا لاستخدام الرقم الوظيفي' : 'Leave blank to use employee code'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عبد اللطيف السيد"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title / Role'}</label>
                  <input
                    type="text"
                    required
                    placeholder="مشرف، فني كهرباء، حارس أمن..."
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'رقم الجوال' : 'Mobile'}</label>
                  <input
                    type="text"
                    required
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input
                    type="email"
                    autoComplete="off"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="employee@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'رقم الهوية / الإقامة' : 'National ID'}</label>
                  <input
                    type="text"
                    required
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الراتب الشهري (ر.س)' : 'Monthly Salary (SAR)'}</label>
                  <input
                    type="number"
                    required
                    value={newSalary}
                    onChange={(e) => setNewSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'كلمة المرور للدخول للوحة (Password)' : 'Portal Password'}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required={!editingStaff}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={editingStaff ? (language === 'ar' ? 'اتركها فارغة للإبقاء على كلمة المرور الحالية' : 'Leave blank to keep current password') : (language === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-emerald-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات إضافية' : 'Notes'}</label>
                <textarea
                  rows={2}
                  placeholder={language === 'ar' ? 'ملاحظات السكن أو الوردية...' : 'Shift / residence notes...'}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'ar' ? (editingStaff ? 'حفظ التعديلات' : 'إضافة الموظف') : (editingStaff ? 'Save Changes' : 'Save Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
