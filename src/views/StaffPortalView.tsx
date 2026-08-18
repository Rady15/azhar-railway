import React, { useState, useRef } from 'react';
import {
  Wrench, CheckCircle2, Clock, AlertTriangle, User, Phone, MessageSquare,
  Building2, Key, Send, FileText, Calendar, ShieldAlert, ChevronDown,
  Edit3, LogOut, Globe, Home, Bell, Menu, ChevronRight, ChevronLeft,
  ClipboardList, CheckCircle, X
} from 'lucide-react';
import { StaffMember, MaintenanceRequest, User as UserType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { AzharLogo } from '../components/AzharLogo';
import { useNotifications } from '../context/NotificationContext';

type StaffTab = 'dashboard' | 'tasks' | 'password';

interface StaffPortalViewProps {
  currentUser: UserType;
  staffList?: StaffMember[];
  maintenanceRequests?: MaintenanceRequest[];
  onUpdateMaintenanceStatus?: (id: string, newStatus: MaintenanceRequest['status']) => void;
  onUpdateMaintenanceNotes?: (id: string, notes: string) => void;
  onUpdateStaffPassword?: (staffId: string, currentPass: string, newPass: string) => void;
  onLogout?: () => void;
}

export const StaffPortalView: React.FC<StaffPortalViewProps> = ({
  currentUser,
  staffList = [],
  maintenanceRequests = [],
  onUpdateMaintenanceStatus,
  onUpdateMaintenanceNotes,
  onUpdateStaffPassword,
  onLogout
}) => {
  const { language, toggleLanguage } = useLanguage();
  const { notifications, unreadCount, isDropdownOpen, toggleDropdown, closeDropdown, markAsRead, markAllAsRead } = useNotifications();
  const isRtl = language === 'ar';

  const currentStaff = (staffList || []).find(s => s.id === currentUser.staffId || s.name === currentUser.name) || {
    id: currentUser.staffId || '', empCode: '', name: currentUser.name || '', role: currentUser.role || 'Staff', mobile: '', whatsapp: '', nationalId: '', status: 'Active' as const, joiningDate: '', salary: 0
  };

  const [activeTab, setActiveTab] = useState<StaffTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'In Progress' | 'Done' | 'New'>('ALL');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [techNotesInput, setTechNotesInput] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);

  const myTasks = maintenanceRequests.filter(req => {
    const isAssignedToMe = req.assignedStaffId === currentStaff.id || req.assignedStaffName?.trim() === currentStaff.name.trim() || (req as any).assignedToName?.trim() === currentStaff.name.trim() || (currentStaff.role.includes('مشرف') || currentStaff.role.includes('General Manager'));
    if (!isAssignedToMe && currentUser.role !== 'Admin') return false;
    if (filterStatus === 'ALL') return true;
    return req.status === filterStatus;
  });

  const totalMyTasks = myTasks.length;
  const inProgressCount = myTasks.filter(t => t.status === 'In Progress').length;
  const completedCount = myTasks.filter(t => t.status === 'Done').length;
  const newCount = myTasks.filter(t => t.status === 'New' || t.status === 'Awaiting Approval').length;

  const handleSaveNotes = (taskId: string) => { if (onUpdateMaintenanceNotes) onUpdateMaintenanceNotes(taskId, techNotesInput); setEditingNotesId(null); setTechNotesInput(''); };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    if (onUpdateStaffPassword) onUpdateStaffPassword(currentStaff.id, currentPassword, newPassword);
    setPassSuccess(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!');
    setCurrentPassword(''); setNewPassword('');
    setTimeout(() => setPassSuccess(''), 4000);
  };

  const handleSelectTab = (tab: StaffTab) => { setActiveTab(tab); setSidebarOpen(false); };

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const formatNotifTime = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return t('الآن', 'Just now');
    if (diff < 3600) return t(`منذ ${Math.floor(diff / 60)} دقيقة`, `${Math.floor(diff / 60)}m ago`);
    if (diff < 86400) return t(`منذ ${Math.floor(diff / 3600)} ساعة`, `${Math.floor(diff / 3600)}h ago`);
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
  };

  const SIDEBAR_ITEMS: { key: StaffTab; labelAr: string; labelEn: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', labelAr: 'لوحة المهام', labelEn: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { key: 'tasks', labelAr: 'المهام', labelEn: 'Tasks', icon: <Wrench className="w-4 h-4" />, badge: inProgressCount },
    { key: 'password', labelAr: 'تغيير كلمة المرور', labelEn: 'Password', icon: <Key className="w-4 h-4" /> },
  ];

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      {/* ===== TOP HEADER ===== */}
      <header className="h-16 bg-[#2b3038] text-white border-b border-slate-700/80 sticky top-0 z-30 flex items-center justify-between px-3 lg:px-6 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 py-1">
            <AzharLogo variant="light" size="md" />
            <div className="hidden xl:block border-r border-slate-700 h-7 mx-1" />
            <div className="hidden xl:flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/60 text-xs text-slate-300">
              <Wrench className="w-3.5 h-3.5 text-[#29b4c4]" />
              <span>{t('لوحة العامل', 'Staff Portal')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold text-slate-200 transition-colors shadow-sm">
            <Globe className="w-3.5 h-3.5 text-[#29b4c4]" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{currentStaff.empCode || t('عامل', 'Staff')}</span>
          </div>

          {/* Notifications */}
          <div className="relative" ref={bellRef}>
            <button onClick={toggleDropdown} className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-[#2b3038] px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {isDropdownOpen && (
              <div className={`absolute mt-2 w-80 max-h-[70vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-xs text-slate-200 flex flex-col ${isRtl ? 'left-0' : 'right-0'}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <h3 className="font-bold text-sm text-white">{t('الإشعارات', 'Notifications')}</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && <button onClick={markAllAsRead} className="flex items-center gap-1 text-[11px] text-[#29b4c4]"><CheckCircle2 className="w-3.5 h-3.5" /><span>{t('قراءة الكل', 'Mark all')}</span></button>}
                    <button onClick={closeDropdown} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400"><Bell className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>{t('لا توجد إشعارات', 'No notifications')}</p></div>
                  ) : notifications.slice(0, 20).map((n) => (
                    <div key={n.id} onClick={() => markAsRead(n.id)} className={`px-4 py-3 border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/60 ${!n.isRead ? 'bg-[#29b4c4]/5' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{formatNotifTime(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#29b4c4] mt-1.5 shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 p-1.5 hover:bg-slate-700/60 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#29b4c4] to-cyan-700 flex items-center justify-center text-white font-bold text-xs border border-[#29b4c4]">
                {currentStaff.name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-semibold text-white leading-tight">{currentStaff.name}</div>
                <div className="text-[10px] text-slate-400">{currentStaff.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
            {showProfileMenu && (
              <div className={`absolute mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-200 ${isRtl ? 'left-0' : 'right-0'}`} onMouseLeave={() => setShowProfileMenu(false)}>
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="font-semibold text-white">{currentStaff.name}</p>
                  <p className="text-[11px] text-slate-400">{currentStaff.empCode} — {currentStaff.role}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">{currentStaff.status === 'Active' ? t('نشط', 'Active') : currentStaff.status}</span>
                </div>
                <button onClick={() => { setShowProfileMenu(false); handleSelectTab('password'); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors"><Key className="w-4 h-4 text-[#29b4c4]" />{t('تغيير كلمة المرور', 'Change Password')}</button>
                <div className="border-t border-slate-800 my-1" />
                <button onClick={() => { setShowProfileMenu(false); onLogout?.(); }} className="w-full flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors"><LogOut className="w-4 h-4" />{t('تسجيل الخروج', 'Sign Out')}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN BODY ===== */}
      <div className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden" />}

        {/* ===== SIDEBAR ===== */}
        <aside className={`
          fixed lg:static top-16 bottom-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-40
          w-64 bg-[#1d2024] text-slate-300 border-slate-800
          flex flex-col transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/40">
            <div className="bg-cover bg-center border border-slate-700/60 rounded-xl h-16 px-3 py-2 flex items-center gap-2 relative overflow-hidden"
              style={{ backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.86)), url("https://rightcompoundimages.blob.core.windows.net/images/Common/Images/Compound/573/27ecde5aea67429b937f2a4127d99ed0.jpeg")' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <p className="text-[11px] font-bold text-slate-100 truncate">{t('مجمع أزهار السكني', 'AZHAR RESIDENCE')}</p>
                <p className="text-[9px] text-cyan-400 font-medium">{t('لوحة العامل', 'Staff Portal')}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
            <div className="mb-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <ClipboardList className="w-4 h-4 text-[#29b4c4]" />
                <span>{t('التنقل', 'NAVIGATION')}</span>
              </button>
              <div className="mt-1 space-y-0.5">
                {SIDEBAR_ITEMS.map(item => (
                  <button key={item.key} onClick={() => handleSelectTab(item.key)}
                    className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 relative ${
                      activeTab === item.key ? 'bg-[#29b4c4] text-white font-semibold shadow-sm' : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}>
                    {item.icon}
                    <span>{isRtl ? item.labelAr : item.labelEn}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`ms-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === item.key ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'}`}>{item.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>{t('لوحة العامل', 'Staff Portal')}</span>
            <span className="bg-[#29b4c4]/20 text-cyan-300 px-1.5 py-0.5 rounded border border-[#29b4c4]/30">{t('الإصدار 3.0', 'v3.0')}</span>
          </div>
        </aside>

        {/* ===== CONTENT ===== */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[80rem] mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <>
                {/* Greeting Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 border border-cyan-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#29b4c4] to-cyan-700 flex items-center justify-center text-white font-bold text-xl shadow-lg border border-cyan-300/30">
                        {currentStaff.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md text-[11px] font-bold">{currentStaff.empCode}</span>
                          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-md text-[11px] font-bold">{currentStaff.status === 'Active' ? t('على رأس العمل', 'Active') : currentStaff.status}</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">{t(`مرحباً بك، ${currentStaff.name}`, `Welcome, ${currentStaff.name}`)}</h1>
                        <p className="text-xs text-slate-300 mt-0.5">{currentStaff.role} — {t('لوحة المهام والعمل على الإصلاحات', 'Task Dashboard & Repair Work')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div><p className="text-xs text-slate-500 font-medium">{t('إجمالي المهام', 'Total Tasks')}</p><p className="text-2xl font-bold text-slate-800 mt-1">{totalMyTasks}</p></div>
                    <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-500"><Wrench className="w-6 h-6" /></div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div><p className="text-xs text-amber-500 font-medium">{t('جاري العمل عليها', 'In Progress')}</p><p className="text-2xl font-bold text-amber-500 mt-1">{inProgressCount}</p></div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-500"><Clock className="w-6 h-6 animate-pulse" /></div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div><p className="text-xs text-emerald-500 font-medium">{t('المهام المنتهية', 'Completed')}</p><p className="text-2xl font-bold text-emerald-500 mt-1">{completedCount}</p></div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-500"><CheckCircle2 className="w-6 h-6" /></div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div><p className="text-xs text-purple-500 font-medium">{t('طلبات جديدة', 'New Requests')}</p><p className="text-2xl font-bold text-purple-500 mt-1">{newCount}</p></div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-500"><AlertTriangle className="w-6 h-6" /></div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'tasks' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-[#29b4c4]" />{t('قائمة المهام الموكلة', 'Assigned Maintenance Worklist')}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t('تحديث حالة المهمة وكتابة تقرير الفنية', 'Update maintenance status and write technical reports')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                    <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'ALL' ? 'bg-[#29b4c4] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                      {t('الكل', 'All')} ({myTasks.length})
                    </button>
                    <button onClick={() => setFilterStatus('In Progress')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'In Progress' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                      {t('جاري العمل', 'In Progress')} ({inProgressCount})
                    </button>
                    <button onClick={() => setFilterStatus('Done')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'Done' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                      {t('منتهية', 'Done')} ({completedCount})
                    </button>
                  </div>
                </div>

                {myTasks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300" /><p className="text-sm font-medium">{t('لا توجد مهام مطابقة', 'No matching tasks')}</p></div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {myTasks.map(task => {
                      const isEditingNotes = editingNotesId === task.id;
                      return (
                        <div key={task.id} className={`bg-slate-50 border rounded-xl p-4 transition-all hover:shadow-sm ${
                          task.status === 'Done' ? 'border-emerald-200 bg-emerald-50/30' : task.status === 'In Progress' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
                        }`}>
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">#{task.id}</span>
                                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                  task.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : task.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-purple-50 text-purple-600 border-purple-200'
                                }`}>
                                  {task.status === 'In Progress' ? t('جاري العمل عليها', 'In Progress') : task.status === 'Done' ? t('منتهية', 'Completed') : task.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  task.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {t(`الأولوية: ${task.priority === 'High' ? 'عالية' : task.priority === 'Medium' ? 'متوسطة' : 'عادية'}`, `Priority: ${task.priority}`)}
                                </span>
                                <div className="flex items-center gap-1 text-slate-400 text-xs font-medium ms-auto">
                                  <Calendar className="w-3.5 h-3.5" /><span>{task.requestDate}</span>
                                </div>
                              </div>
                              <h3 className="text-sm font-bold text-slate-800 tracking-wide">{task.issueDescription}</h3>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-cyan-500" /><span>{t('الوحدة', 'Unit')}: <strong className="text-slate-800">{task.unitNumber}</strong> ({t('مبنى', 'Bldg')}: {task.buildingNumber})</span></div>
                                <div className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /><span>{t('المستأجر', 'Tenant')}: <strong className="text-slate-800">{task.tenantName}</strong></span></div>
                                <div className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-emerald-500" /><a href={`tel:${task.tenantPhone}`} className="text-emerald-600 hover:underline">{task.tenantPhone}</a></div>
                                <a href={`https://wa.me/966${task.tenantPhone?.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors">
                                  <MessageSquare className="w-3.5 h-3.5" /><span>واتساب</span>
                                </a>
                              </div>
                              {task.notes && <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700"><strong className="text-amber-600 block mb-0.5">{t('ملاحظات الصيانة:', 'Tech Notes:')}</strong><p>{task.notes}</p></div>}
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch justify-center gap-2 shrink-0 min-w-[180px] border-t lg:border-t-0 lg:border-r border-slate-200 pt-3 lg:pt-0 pr-0 lg:pr-4">
                              <p className="text-[11px] font-semibold text-slate-500 text-center lg:text-start">{t('تحديث الحالة:', 'Change Status:')}</p>
                              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                                <button onClick={() => onUpdateMaintenanceStatus && onUpdateMaintenanceStatus(task.id, 'In Progress')} disabled={task.status !== 'New' && task.status !== 'Assigned' && task.status !== 'Open'}
                                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${task.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white hover:bg-amber-50 text-amber-600 border-amber-200'}`}>
                                  <Clock className="w-3.5 h-3.5" /><span>{t('جاري العمل', 'In Progress')}</span>
                                </button>
                                <button onClick={() => onUpdateMaintenanceStatus && onUpdateMaintenanceStatus(task.id, 'Done')} disabled={task.status !== 'In Progress'}
                                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${task.status === 'Done' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /><span>{t('تم الإنجاز', 'Mark Done')}</span>
                                </button>
                              </div>
                              <button onClick={() => { setEditingNotesId(isEditingNotes ? null : task.id); setTechNotesInput(task.notes || ''); }}
                                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors">
                                <Edit3 className="w-3.5 h-3.5 text-[#29b4c4]" /><span>{t('إضافة تقرير', 'Add Report')}</span>
                              </button>
                            </div>
                          </div>

                          {isEditingNotes && (
                            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                              <label className="block text-xs font-semibold text-slate-600">{t('تقرير الصيانة:', 'Technical Report:')}</label>
                              <textarea rows={2} value={techNotesInput} onChange={(e) => setTechNotesInput(e.target.value)} placeholder={t('اكتب تفاصيل الإصلاح...', 'Write repair details...')}
                                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" />
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingNotesId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs">{t('إلغاء', 'Cancel')}</button>
                                <button type="button" onClick={() => handleSaveNotes(task.id)} className="px-4 py-1.5 bg-[#29b4c4] hover:bg-cyan-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-md">
                                  <Send className="w-3.5 h-3.5" /><span>{t('حفظ التقرير', 'Save Report')}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'password' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 max-w-lg">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Key className="w-5 h-5 text-amber-500" />{t('تغيير كلمة المرور', 'Change Your Password')}
                </h2>
                <p className="text-xs text-slate-500">{t('يمكنك تعيين كلمة مرور جديدة لدخول لوحة التحكم', 'Set a new password for your control panel')}</p>
                {passSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">{passSuccess}</div>}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1 text-xs">{t('كلمة المرور الحالية', 'Current Password')}</label>
                    <div className="relative"><Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('كلمة المرور الحالية', 'Current Password')}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1 text-xs">{t('كلمة المرور الجديدة', 'New Password')}</label>
                    <div className="relative"><Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('كلمة المرور الجديدة', 'New Password')}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-colors">
                    <Key className="w-4 h-4" /><span>{t('تحديث كلمة المرور', 'Update Password')}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
