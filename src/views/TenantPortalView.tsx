import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home, FileText, Wrench, MessageSquareWarning, Key, CheckCircle2, Clock,
  DollarSign, Building, Send, User, ShieldCheck,
  X, LogOut, Globe, Camera, Upload, Loader2, MapPin, Users,
  Building2, Mail, CalendarDays, Image as ImageIcon, File, Save, Lock, Edit3,
  Bell, Banknote, TrendingUp, Calendar, Phone, Download, Eye, Info,
  CreditCard, RefreshCw, AlertTriangle, PieChart as PieIcon, BarChart3,
  ExternalLink, ChevronRight, ChevronLeft, ChevronDown, PartyPopper,
  Menu
} from 'lucide-react';
import { User as UserType, Contract, MaintenanceRequest, Complaint, Tenant } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';
import { MediaUploadField } from '../components/MediaUploadField';
import { AzharLogo } from '../components/AzharLogo';
import { useNotifications } from '../context/NotificationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { facilityIcon, catLabel, statusLabel, CATEGORY_META, STATUS_META } from './facilityUtils';

type PortalTab = 'home' | 'profile' | 'contract' | 'maintenance' | 'complaints' | 'letters' | 'facilities' | 'bookings' | 'announcements' | 'security';

interface TenantPortalViewProps {
  currentUser: UserType;
  tenants?: Tenant[];
  contracts?: Contract[];
  maintenanceRequests?: MaintenanceRequest[];
  complaints?: Complaint[];
  onAddMaintenanceRequest: (req: Omit<MaintenanceRequest, 'id' | 'ticketNo' | 'createdAt'>) => void;
  onAddComplaint: (comp: Omit<Complaint, 'id' | 'ticketNo' | 'createdAt'>) => void;
  onUpdateTenantPassword?: (tenantId: string, currentPass: string, newPass: string) => void;
  onUpdateUser?: (user: UserType) => void;
  onLogout?: () => void;
}

export const TenantPortalView: React.FC<TenantPortalViewProps> = ({
  currentUser, tenants = [], contracts = [], maintenanceRequests = [], complaints = [],
  onAddMaintenanceRequest, onAddComplaint, onUpdateTenantPassword, onUpdateUser, onLogout
}) => {
  const { language, toggleLanguage } = useLanguage();
  const { notifications, unreadCount, isDropdownOpen, toggleDropdown, closeDropdown, markAsRead, markAllAsRead } = useNotifications();

  const [portalData, setPortalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ main: true, services: true, more: false });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);

  const loadPortalData = useCallback(async () => {
    try {
      const data = await apiService.getTenantPortalData();
      setPortalData(data);
    } catch (e) { console.error('Failed to load portal data', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPortalData(); }, [loadPortalData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) closeDropdown();
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, closeDropdown]);

  const me = portalData?.me;
  const myContracts = portalData?.contracts || [];
  const ledger = portalData?.ledger;
  const installments = portalData?.installments || [];
  const payments = portalData?.payments || [];
  const myMaintenance = portalData?.maintenance || [];
  const myComplaints = portalData?.complaints || [];
  const announcements = portalData?.announcements || [];
  const facilities = portalData?.facilities || [];
  const myBookings = portalData?.bookings || [];
  const letters = portalData?.letters || [];
  const documents = portalData?.documents || [];

  const currentContract = myContracts.find((c: any) => String(c.status || 'Active').toLowerCase() !== 'archived') || myContracts[0] || null;
  const currentTenant = me?.tenant || me || tenants.find((t: any) => t.id === currentUser.tenantId) || {};

  const tenantName = currentTenant.fullNameArabic || currentTenant.fullName || currentTenant.name || currentUser.name;
  const unitNumber = currentTenant.unitNumber || currentTenant.houseNumber || currentUser.unitNumber || '—';

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const isRtl = language === 'ar';

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSelectTab = (tab: PortalTab) => { setActiveTab(tab); setSidebarOpen(false); };

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-[#29b4c4] animate-spin" />
        <p className="text-sm text-slate-500 mt-3">{t('جاري تحميل البيانات...', 'Loading portal data...')}</p>
      </div>
    );
  }

  const SIDEBAR_ITEMS: { group: string; label: string; items: { key: PortalTab; labelAr: string; labelEn: string; icon: React.ReactNode; badge?: number }[] }[] = [
    {
      group: 'main',
      label: t('الرئيسية', 'MAIN'),
      items: [
        { key: 'home', labelAr: 'الرئيسية', labelEn: 'Home', icon: <Home className="w-4 h-4" /> },
        { key: 'contract', labelAr: 'العقد', labelEn: 'Contract', icon: <FileText className="w-4 h-4" /> },
        { key: 'announcements', labelAr: 'الإعلانات', labelEn: 'Announcements', icon: <Bell className="w-4 h-4" />, badge: announcements.length },
        { key: 'letters', labelAr: 'الخطابات', labelEn: 'Letters', icon: <Mail className="w-4 h-4" />, badge: letters.length },
      ]
    },
    {
      group: 'services',
      label: t('الخدمات', 'SERVICES'),
      items: [
        { key: 'maintenance', labelAr: 'الصيانة', labelEn: 'Maintenance', icon: <Wrench className="w-4 h-4" />, badge: myMaintenance.length },
        { key: 'complaints', labelAr: 'الشكاوى', labelEn: 'Complaints', icon: <MessageSquareWarning className="w-4 h-4" />, badge: myComplaints.length },
        { key: 'facilities', labelAr: 'المرافق', labelEn: 'Facilities', icon: <Building2 className="w-4 h-4" /> },
        { key: 'bookings', labelAr: 'حجوزاتي', labelEn: 'My Bookings', icon: <CalendarDays className="w-4 h-4" />, badge: myBookings.filter((b: any) => b.status === 'Pending').length },
      ]
    },
    {
      group: 'more',
      label: t('الحساب', 'ACCOUNT'),
      items: [
        { key: 'profile', labelAr: 'الملف الشخصي', labelEn: 'Profile', icon: <User className="w-4 h-4" /> },
        { key: 'security', labelAr: 'الأمان', labelEn: 'Security', icon: <Key className="w-4 h-4" /> },
      ]
    },
  ];

  const formatNotifTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return t('الآن', 'Just now');
    if (diff < 3600) return t(`منذ ${Math.floor(diff / 60)} دقيقة`, `${Math.floor(diff / 60)}m ago`);
    if (diff < 86400) return t(`منذ ${Math.floor(diff / 3600)} ساعة`, `${Math.floor(diff / 3600)}h ago`);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
  };

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
              <Home className="w-3.5 h-3.5 text-[#29b4c4]" />
              <span>{t('بوابة المستأجر', 'Tenant Portal')}</span>
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
            <span>{unitNumber}</span>
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
                    {unreadCount > 0 && <button onClick={markAllAsRead} className="flex items-center gap-1 text-[11px] text-[#29b4c4] hover:text-[#29b4c4]/80"><CheckCircle2 className="w-3.5 h-3.5" /><span>{t('قراءة الكل', 'Mark all')}</span></button>}
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
              <img src={currentUser.profileImageUrl || currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'U')}&background=29b4c4&color=fff`} alt="" className="w-8 h-8 rounded-full object-cover border border-[#29b4c4]" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'U')}&background=29b4c4&color=fff`; }} />
              <div className="hidden lg:block">
                <div className="text-xs font-semibold text-white leading-tight">{tenantName}</div>
                <div className="text-[10px] text-slate-400">{t('مستأجر', 'Tenant')}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
            {showProfileMenu && (
              <div className={`absolute mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-200 ${isRtl ? 'left-0' : 'right-0'}`} onMouseLeave={() => setShowProfileMenu(false)}>
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="font-semibold text-white">{tenantName}</p>
                  <p className="text-[11px] text-slate-400">{t('الوحدة', 'Unit')}: {unitNumber}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-[#29b4c4]/20 text-[#29b4c4] rounded text-[10px] font-bold">{t('مستأجر', 'Tenant')}</span>
                </div>
                <button onClick={() => { setShowProfileMenu(false); handleSelectTab('profile'); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors"><User className="w-4 h-4 text-slate-400" />{t('الملف الشخصي', 'Profile')}</button>
                <button onClick={() => { setShowProfileMenu(false); handleSelectTab('security'); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors"><ShieldCheck className="w-4 h-4 text-[#29b4c4]" />{t('الأمان', 'Security')}</button>
                <div className="border-t border-slate-800 my-1" />
                <button onClick={() => { setShowProfileMenu(false); onLogout?.(); }} className="w-full flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors"><LogOut className="w-4 h-4" />{t('تسجيل الخروج', 'Sign Out')}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN BODY ===== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden" />}

        {/* ===== SIDEBAR ===== */}
        <aside className={`
          fixed lg:static top-16 bottom-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-40
          w-64 bg-[#1d2024] text-slate-300 border-slate-800
          flex flex-col transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Sidebar Header */}
          <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/40">
            <div className="bg-cover bg-center border border-slate-700/60 rounded-xl h-16 px-3 py-2 flex items-center gap-2 relative overflow-hidden"
              style={{ backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.86)), url("https://rightcompoundimages.blob.core.windows.net/images/Common/Images/Compound/573/27ecde5aea67429b937f2a4127d99ed0.jpeg")' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <p className="text-[11px] font-bold text-slate-100 truncate">{t('مجمع أزهار السكني', 'AZHAR RESIDENCE')}</p>
                <p className="text-[9px] text-cyan-400 font-medium">{t('بوابة المستأجر', 'Tenant Portal')}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
            {SIDEBAR_ITEMS.map(group => (
              <div key={group.group} className="mb-2">
                <button onClick={() => toggleGroup(group.group)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50">
                  <span>{group.label}</span>
                  {isRtl ? <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups[group.group] ? '-rotate-90' : ''}`} /> : <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups[group.group] ? 'rotate-90' : ''}`} />}
                </button>
                {openGroups[group.group] && (
                  <div className={`mt-1 space-y-0.5 ${isRtl ? 'pr-4 border-r-2 mr-3' : 'pl-4 border-l-2 ml-3'} border-slate-800`}>
                    {group.items.map(item => (
                      <button key={item.key} onClick={() => handleSelectTab(item.key)}
                        className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 relative ${
                          activeTab === item.key ? 'bg-[#29b4c4] text-white font-semibold shadow-sm' : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                        }`}>
                        {item.icon}
                        <span>{isRtl ? item.labelAr : item.labelEn}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`ms-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            activeTab === item.key ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                          }`}>{item.badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>{t('بوابة المستأجر', 'Tenant Portal')}</span>
            <span className="bg-[#29b4c4]/20 text-cyan-300 px-1.5 py-0.5 rounded border border-[#29b4c4]/30">{t('الإصدار 3.0', 'v3.0')}</span>
          </div>
        </aside>

        {/* ===== CONTENT ===== */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[80rem] mx-auto space-y-6">
            {activeTab === 'home' && <HomeTab currentTenant={currentTenant} currentContract={currentContract} ledger={ledger} myMaintenance={myMaintenance} myComplaints={myComplaints} myBookings={myBookings} letters={letters} announcements={announcements} language={language} t={t} onNavigate={handleSelectTab} />}
            {activeTab === 'contract' && <ContractTab currentContract={currentContract} ledger={ledger} installments={installments} payments={payments} language={language} t={t} />}
            {activeTab === 'maintenance' && <MaintenanceTab myMaintenance={myMaintenance} currentTenant={currentTenant} currentContract={currentContract} language={language} t={t} onRefresh={loadPortalData} />}
            {activeTab === 'complaints' && <ComplaintsTab myComplaints={myComplaints} currentTenant={currentTenant} currentContract={currentContract} language={language} t={t} onRefresh={loadPortalData} />}
            {activeTab === 'letters' && <LettersTab letters={letters} language={language} t={t} />}
            {activeTab === 'facilities' && <FacilitiesTab facilities={facilities} currentTenant={currentTenant} myBookings={myBookings} language={language} t={t} onRefresh={loadPortalData} />}
            {activeTab === 'bookings' && <BookingsTab myBookings={myBookings} facilities={facilities} language={language} t={t} onRefresh={loadPortalData} />}
            {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} language={language} t={t} />}
            {activeTab === 'profile' && <ProfileTab currentUser={currentUser} currentTenant={currentTenant} documents={documents} language={language} t={t} onUpdateUser={onUpdateUser} onRefresh={loadPortalData} />}
            {activeTab === 'security' && <SecurityTab currentTenant={currentTenant} language={language} t={t} onUpdateTenantPassword={onUpdateTenantPassword} />}
          </div>
        </main>
      </div>
    </div>
  );
};

// ========================= HOME TAB =========================
const HomeTab: React.FC<any> = ({ currentTenant, currentContract, ledger, myMaintenance, myComplaints, myBookings, letters, announcements, language, t, onNavigate }) => {
  const unitNumber = currentTenant.unitNumber || currentTenant.houseNumber || '—';
  const tenantName = currentTenant.fullNameArabic || currentTenant.fullName || currentTenant.name || '—';
  const totalRent = ledger?.summary?.total || (Number(currentContract?.annualRent || 0) + Number(currentContract?.waterYearlyBill || 0));
  const paidAmount = ledger?.summary?.paid || Number(currentContract?.paidAmount || 0);
  const remaining = ledger?.summary?.remaining || Number(currentContract?.remainingAmount || 0);

  const stats = [
    { label: t('إيجار سنوي', 'Annual Rent'), value: `${totalRent.toLocaleString()} SAR`, icon: <DollarSign className="w-5 h-5" />, color: 'blue' },
    { label: t('المدفوع', 'Paid'), value: `${paidAmount.toLocaleString()} SAR`, icon: <CheckCircle2 className="w-5 h-5" />, color: 'emerald' },
    { label: t('المتبقي', 'Remaining'), value: `${remaining.toLocaleString()} SAR`, icon: <Clock className="w-5 h-5" />, color: 'amber' },
    { label: t('ال_unitة', 'Unit'), value: unitNumber, icon: <Building className="w-5 h-5" />, color: 'cyan' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };
  const textColor: Record<string, string> = { blue: 'text-blue-300', emerald: 'text-emerald-300', amber: 'text-amber-300', cyan: 'text-cyan-300' };

  const quickActions = [
    { key: 'maintenance', label: t('طلب صيانة', 'Maintenance'), icon: <Wrench className="w-5 h-5" />, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    { key: 'complaints', label: t('شكوى', 'Complaint'), icon: <MessageSquareWarning className="w-5 h-5" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { key: 'bookings', label: t('حجز مرفق', 'Book Facility'), icon: <CalendarDays className="w-5 h-5" />, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { key: 'contract', label: t('العقد', 'Contract'), icon: <FileText className="w-5 h-5" />, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  ];

  const pieData = [
    { name: t('المدفوع', 'Paid'), value: Math.max(0, paidAmount) },
    { name: t('المتبقي', 'Remaining'), value: Math.max(0, remaining) },
  ].filter(d => d.value > 0);
  const PIE_COLORS = ['#10b981', '#f59e0b'];

  const maintenanceByStatus = ['New', 'In Progress', 'Done'].map(s => ({
    name: s === 'New' ? t('جديد', 'New') : s === 'In Progress' ? t('جاري', 'Active') : t('منجز', 'Done'),
    count: myMaintenance.filter((m: any) => m.status === s).length
  }));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e3448] border border-cyan-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md text-[11px] font-bold">{t(`الوحدة: ${unitNumber}`, `Unit: ${unitNumber}`)}</span>
            {currentContract && <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-bold">{t('عقد ساري', 'Active Contract')}</span>}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t(`مرحباً بك، ${tenantName}`, `Welcome, ${tenantName}`)}</h1>
          <p className="text-xs text-slate-400 mt-1">{t('بوابة الخدمات الذاتية لمستأجري كمبوند أزهار السكني', 'Azhar Residence Tenant Self-Service Portal')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${textColor[s.color]}`}>{s.value}</p>
            </div>
            <div className={`p-3 rounded-xl border ${colorMap[s.color]}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <button key={a.key} onClick={() => onNavigate(a.key)} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-105 ${a.color}`}>
            {a.icon}
            <span className="text-xs font-bold">{a.label}</span>
          </button>
        ))}
      </div>

      {pieData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><PieIcon className="w-4 h-4 text-cyan-500" />{t('حالة الدفع', 'Payment Status')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">{pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}</Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} SAR`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {maintenanceByStatus.some((m: any) => m.count > 0) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-500" />{t('طلبات الصيانة', 'Maintenance')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={maintenanceByStatus}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} /><Bar dataKey="count" fill="#29b4c4" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" />{t('آخر الإعلانات', 'Recent Announcements')}</h3>
          {announcements.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">{t('لا توجد إعلانات', 'No announcements')}</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto">{announcements.slice(0, 5).map((a: any) => (
              <div key={a.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-bold text-slate-800">{a.title || a.name}</p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{a.description || a.body || ''}</p>
              </div>
            ))}</div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Mail className="w-4 h-4 text-purple-500" />{t('آخر الخطابات', 'Recent Letters')}</h3>
          {letters.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">{t('لا توجد خطابات', 'No letters')}</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto">{letters.slice(0, 5).map((l: any) => (
              <div key={l.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-bold text-slate-800">{l.title}</p>
                <p className="text-[11px] text-slate-500 mt-1">{l.sentByName || ''} — {l.sentAt ? new Date(l.sentAt).toLocaleDateString() : ''}</p>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========================= CONTRACT TAB =========================
const ContractTab: React.FC<any> = ({ currentContract, ledger, installments, payments, language, t }) => {
  if (!currentContract) return <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm"><FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-sm text-slate-500">{t('لا يوجد عقد مسجل', 'No contract registered')}</p></div>;

  const paid = ledger?.summary?.paid || Number(currentContract.paidAmount || 0);
  const total = ledger?.summary?.total || (Number(currentContract.annualRent || 0) + Number(currentContract.waterYearlyBill || 0));
  const remaining = ledger?.summary?.remaining || Number(currentContract.remainingAmount || 0);
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />{t('تقدم الدفع', 'Payment Progress')}</h3>
          <span className="text-sm font-bold text-emerald-500">{pct}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>{t('المدفوع', 'Paid')}: <span className="text-emerald-500 font-bold">{paid.toLocaleString()} SAR</span></span>
          <span>{t('المتبقي', 'Remaining')}: <span className="text-amber-500 font-bold">{remaining.toLocaleString()} SAR</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-500" />{t('بيانات العقد', 'Contract Details')}</h3>
          {[[t('رقم العقد', 'Contract No'), currentContract.contractNo || currentContract.contractNumber], [t('الوحدة', 'Unit'), `${currentContract.unitNumber || currentContract.houseNumber || '—'} (${t('مبنى', 'Bldg')} ${currentContract.buildingNumber || '—'})`], [t('تاريخ البداية', 'Start Date'), currentContract.leaseStartDate], [t('تاريخ النهاية', 'End Date'), currentContract.leaseEndDate], [t('مدة الإيجار', 'Duration'), `${currentContract.leaseDurationMonths || 12} ${t('شهر', 'months')}`], [t('طريقة الدفع', 'Payment'), currentContract.paymentMethod || currentContract.paymentFrequency]].map(([k, v], i) => (
            <div key={i} className="flex justify-between py-1 border-b border-slate-100 text-xs"><span className="text-slate-500">{k}:</span><span className="font-bold text-slate-800 font-mono">{v || '—'}</span></div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-500" />{t('البيانات المالية', 'Financials')}</h3>
          {[[t('إيجار الوحدة', 'Unit Rent'), `${Number(currentContract.annualRent || 0).toLocaleString()} SAR`, 'text-slate-800'], [t('المياه السنوية', 'Water Bill'), `${Number(currentContract.waterYearlyBill || 0).toLocaleString()} SAR`, 'text-cyan-500'], [t('الإجمالي', 'Total'), `${(Number(currentContract.annualRent || 0) + Number(currentContract.waterYearlyBill || 0)).toLocaleString()} SAR`, 'text-slate-800'], [t('الخصم', 'Discount'), `${Number(currentContract.discount || 0).toLocaleString()} SAR`, 'text-emerald-500'], [t('المدفوع', 'Paid'), `${paid.toLocaleString()} SAR`, 'text-emerald-500'], [t('المتبقي', 'Remaining'), `${remaining.toLocaleString()} SAR`, 'text-amber-500']].map(([k, v, c], i) => (
            <div key={i} className="flex justify-between py-1 border-b border-slate-100 text-xs"><span className="text-slate-500">{k}:</span><span className={`font-bold font-mono ${c}`}>{v}</span></div>
          ))}
        </div>
      </div>

      {installments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-500" />{t('جدول الدفعات', 'Installment Schedule')}</h3>
          <table className="w-full text-xs"><thead><tr className="text-slate-500 border-b border-slate-200"><th className="py-2 text-start font-semibold">#</th><th className="py-2 text-start font-semibold">{t('تاريخ الاستحقاق', 'Due Date')}</th><th className="py-2 text-start font-semibold">{t('المبلغ', 'Amount')}</th><th className="py-2 text-start font-semibold">{t('المدفوع', 'Paid')}</th><th className="py-2 text-start font-semibold">{t('الحالة', 'Status')}</th></tr></thead>
            <tbody>{installments.map((inst: any, i: number) => (
              <tr key={inst.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 text-slate-400 font-mono">{inst.installmentNo || i + 1}</td>
                <td className="py-2 text-slate-800">{inst.dueDate}</td>
                <td className="py-2 text-slate-800 font-mono">{Number(inst.amount || 0).toLocaleString()} SAR</td>
                <td className="py-2 text-emerald-500 font-mono">{Number(inst.paidAmount || 0).toLocaleString()} SAR</td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inst.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : inst.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{inst.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {payments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-cyan-500" />{t('سجل المدفوعات', 'Payment History')}</h3>
          <table className="w-full text-xs"><thead><tr className="text-slate-500 border-b border-slate-200"><th className="py-2 text-start font-semibold">{t('رقم الإيصال', 'Receipt')}</th><th className="py-2 text-start font-semibold">{t('التاريخ', 'Date')}</th><th className="py-2 text-start font-semibold">{t('المبلغ', 'Amount')}</th><th className="py-2 text-start font-semibold">{t('الطريقة', 'Method')}</th><th className="py-2 text-start font-semibold">{t('الحالة', 'Status')}</th></tr></thead>
            <tbody>{payments.map((p: any) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 font-mono text-cyan-500">{p.receiptNo}</td>
                <td className="py-2 text-slate-800">{p.paymentDate}</td>
                <td className="py-2 text-emerald-500 font-mono">{Number(p.amount || 0).toLocaleString()} SAR</td>
                <td className="py-2 text-slate-800">{p.paymentMethod}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">{p.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ========================= MAINTENANCE TAB =========================
const MaintenanceTab: React.FC<any> = ({ myMaintenance, currentTenant, currentContract, language, t, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('سباكة ومياه');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await apiService.tenantCreateMaintenance({ category, workActivity: category, description, issueDescription: description, priority, attachmentUrl, status: 'New' });
      await onRefresh();
      setShowModal(false); setDescription(''); setAttachmentUrl(''); setAttachmentFileName('');
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const statusColors: Record<string, string> = { 'New': 'bg-blue-50 text-blue-600 border-blue-200', 'In Progress': 'bg-amber-50 text-amber-600 border-amber-200', 'Done': 'bg-emerald-50 text-emerald-600 border-emerald-200' };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-[#29b4c4]" />{t('طلبات الصيانة', 'Maintenance Requests')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('قديم طلب صيانة جديد مع إرفاق صور', 'Submit a maintenance request with attachments')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#29b4c4] hover:bg-cyan-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all">
          <Wrench className="w-4 h-4" />{t('طلب جديد', 'New Request')}
        </button>
      </div>

      {myMaintenance.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300" /><p className="text-sm">{t('لا توجد طلبات صيانة', 'No maintenance requests')}</p></div>
      ) : (
        <div className="space-y-3">
          {myMaintenance.map((req: any) => (
            <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-200">#{req.ticketNo || req.id?.slice(0, 8)}</span>
                  <span className="text-xs font-bold text-slate-800">{req.workActivity || req.category}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${statusColors[req.status] || statusColors['New']}`}>
                  {req.status === 'Done' ? t('منجز', 'Done') : req.status === 'In Progress' ? t('جاري العمل', 'In Progress') : t('جديد', 'New')}
                </span>
              </div>
              <p className="text-xs text-slate-600">{req.description || req.issueDescription}</p>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{t('التاريخ', 'Date')}: {req.requestDate || req.createdAt?.slice(0, 10)}</span>
                {req.assignedStaffName && <span className="text-cyan-600">{t('الفني', 'Tech')}: {req.assignedStaffName}</span>}
              </div>
              {req.notes && <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700"><strong>{t('ملاحظة الفني:', 'Tech Note:')}</strong> {req.notes}</div>}
              {req.attachmentUrl && <div className="mt-2"><a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 flex items-center gap-1 hover:underline"><ImageIcon className="w-3 h-3" />{t('عرض المرفق', 'View Attachment')}</a></div>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 to-cyan-800 p-4 border-b border-slate-200 flex items-center justify-between text-white">
              <div className="flex items-center gap-2"><Wrench className="w-5 h-5 text-cyan-300" /><h3 className="font-bold text-sm">{t('طلب صيانة جديد', 'New Maintenance Request')}</h3></div>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
              <div><label className="block text-slate-600 font-semibold mb-1">{t('التصنيف', 'Category')}</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]">
                  {['سباكة ومياه', 'كهرباء وتكييف', 'أجهزة ومطبخ', 'أبواب وأقفال', 'دهانات وديكور'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('الأولوية', 'Priority')}</label>
                <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]">
                  <option value="Low">{t('عادية', 'Low')}</option><option value="Medium">{t('متوسطة', 'Medium')}</option><option value="High">{t('طارئة', 'High')}</option>
                </select></div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('وصف المشكلة', 'Description')}</label>
                <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('اكتب تفاصيل العطل...', 'Describe the issue...')} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" /></div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('إرفاق صورة (اختياري)', 'Attach Image (optional)')}</label>
                <MediaUploadField label="" category="maintenance-image" imageOnly value={attachmentUrl} fileName={attachmentFileName} onUploaded={(v) => { setAttachmentUrl(v.url); setAttachmentFileName(v.fileName); }} onClear={() => { setAttachmentUrl(''); setAttachmentFileName(''); }} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl">{t('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-[#29b4c4] hover:bg-cyan-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}<span>{t('إرسال', 'Submit')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================= COMPLAINTS TAB =========================
const ComplaintsTab: React.FC<any> = ({ myComplaints, currentTenant, currentContract, language, t, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('إزعاج وضوضاء');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await apiService.tenantCreateComplaint({ category, description, priority, attachmentUrl, status: 'New' });
      await onRefresh();
      setShowModal(false); setDescription(''); setAttachmentUrl(''); setAttachmentFileName('');
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const statusColors: Record<string, string> = { 'New': 'bg-blue-50 text-blue-600 border-blue-200', 'In Progress': 'bg-amber-50 text-amber-600 border-amber-200', 'Resolved': 'bg-emerald-50 text-emerald-600 border-emerald-200' };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-amber-500" />{t('البلاغات والشكاوى', 'Complaints')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('سجل بلاغاً جديداً مع إرفاق صور', 'Submit a complaint with image attachments')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all">
          <MessageSquareWarning className="w-4 h-4" />{t('بلاغ جديد', 'New Complaint')}
        </button>
      </div>

      {myComplaints.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2"><CheckCircle2 className="w-10 h-10 mx-auto text-slate-300" /><p className="text-sm">{t('لا توجد بلاغات', 'No complaints')}</p></div>
      ) : (
        <div className="space-y-3">
          {myComplaints.map((comp: any) => (
            <div key={comp.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">{comp.ticketNo || comp.ticketNumber}</span>
                  <span className="text-xs font-bold text-slate-800">{comp.category}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${statusColors[comp.status] || statusColors['New']}`}>
                  {comp.status === 'Resolved' ? t('تمت المعالجة', 'Resolved') : comp.status === 'In Progress' ? t('جاري المتابعة', 'In Progress') : t('جديد', 'New')}
                </span>
              </div>
              <p className="text-xs text-slate-600">{comp.description}</p>
              <div className="text-[11px] text-slate-500">{t('التاريخ', 'Date')}: {comp.createdAt?.slice(0, 10) || '—'}</div>
              {comp.resolutionNotes && <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700"><strong className="block text-emerald-600">{t('رد الإدارة:', 'Management Reply:')}</strong><p>{comp.resolutionNotes}</p></div>}
              {comp.attachmentUrl && <div className="mt-2"><a href={comp.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 flex items-center gap-1 hover:underline"><ImageIcon className="w-3 h-3" />{t('عرض المرفق', 'View Attachment')}</a></div>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 to-amber-700 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-amber-300" /><h3 className="font-bold text-sm">{t('بلاغ جديد', 'New Complaint')}</h3></div>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
              <div><label className="block text-slate-600 font-semibold mb-1">{t('نوع البلاغ', 'Category')}</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {['إزعاج وضوضاء', 'مواقف السيارات', 'نظافة الممرات', 'أمن المجمع', 'خدمات المسبح'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('الأولوية', 'Priority')}</label>
                <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="Low">{t('عادية', 'Low')}</option><option value="Medium">{t('متوسطة', 'Medium')}</option><option value="High">{t('عاجلة', 'High')}</option>
                </select></div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('التفاصيل', 'Description')}</label>
                <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('اكتب تفاصيل البلاغ...', 'Write complaint details...')} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500" /></div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('إرفاق صورة (اختياري)', 'Attach Image (optional)')}</label>
                <MediaUploadField label="" category="complaint-image" imageOnly value={attachmentUrl} fileName={attachmentFileName} onUploaded={(v) => { setAttachmentUrl(v.url); setAttachmentFileName(v.fileName); }} onClear={() => { setAttachmentUrl(''); setAttachmentFileName(''); }} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl">{t('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}<span>{t('إرسال', 'Submit')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================= LETTERS TAB =========================
const LettersTab: React.FC<any> = ({ letters, language, t }) => {
  const [viewLetter, setViewLetter] = useState<any>(null);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-purple-500" />{t('الخطابات المرسلة', 'Letters & Correspondence')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('عرض الخطابات والمراسلات الموجهة إليك', 'View letters and correspondence addressed to you')}</p>
      </div>
      {letters.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2"><Mail className="w-10 h-10 mx-auto text-slate-300" /><p className="text-sm">{t('لا توجد خطابات', 'No letters')}</p></div>
      ) : (
        <div className="space-y-3">
          {letters.map((letter: any) => (
            <div key={letter.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-colors cursor-pointer" onClick={() => setViewLetter(letter)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-purple-500 shrink-0" /><p className="text-sm font-bold text-slate-800 truncate">{letter.title}</p></div>
                  <p className="text-xs text-slate-500 line-clamp-2">{letter.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{letter.sentByName || '—'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{letter.sentAt ? new Date(letter.sentAt).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
      {viewLetter && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 to-purple-800 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-300" /><h3 className="font-bold text-sm">{viewLetter.title}</h3></div>
              <button onClick={() => setViewLetter(null)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{t('من', 'From')}: {viewLetter.sentByName || '—'}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{viewLetter.sentAt ? new Date(viewLetter.sentAt).toLocaleDateString() : '—'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{viewLetter.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================= FACILITIES TAB =========================
const FacilitiesTab: React.FC<any> = ({ facilities, currentTenant, myBookings, language, t, onRefresh }) => {
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [guestsCount, setGuestsCount] = useState('1');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility || !bookingDate) return;
    setSubmitting(true);
    try {
      await apiService.tenantCreateBooking({ facilityId: selectedFacility.id, bookingDate, startTime, endTime, guestsCount: Number(guestsCount), purpose });
      await onRefresh();
      setSelectedFacility(null); setBookingDate(''); setStartTime(''); setEndTime(''); setPurpose(''); setGuestsCount('1');
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-purple-500" />{t('مرافق الكمبوند', 'Community Facilities')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('تصفح المرافق المتاحة واحجز موعدك', 'Browse available facilities and book your slot')}</p>
      </div>
      {facilities.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2"><Building2 className="w-10 h-10 mx-auto text-slate-300" /><p className="text-sm">{t('لا توجد مرافق متاحة', 'No facilities available')}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f: any) => {
            const meta = CATEGORY_META[f.category] || CATEGORY_META['Hall'];
            return (
              <div key={f.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                {f.image && <img src={f.image} alt={f.name || f.title} className="w-full h-36 object-cover" />}
                {!f.image && <div className="w-full h-36 flex items-center justify-center" style={{ background: `${meta.bg}` }}>{facilityIcon(meta.icon, 'w-12 h-12')}</div>}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">{f.name || f.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: meta.bg, color: meta.color }}>{catLabel(f.category, language)}</span>
                  </div>
                  {f.description && <p className="text-[11px] text-slate-500 line-clamp-2">{f.description}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    {f.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>}
                    {f.operatingHours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.operatingHours}</span>}
                    {f.capacityLimit && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{f.capacityLimit}</span>}
                  </div>
                  {f.isAvailable !== false ? (
                    <button onClick={() => setSelectedFacility(f)} className="w-full py-2 bg-[#29b4c4] hover:bg-cyan-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors">
                      <CalendarDays className="w-4 h-4" />{t('احجز الآن', 'Book Now')}
                    </button>
                  ) : <span className="block w-full py-2 bg-slate-100 text-slate-400 text-xs font-bold text-center rounded-xl">{t('غير متاح', 'Unavailable')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedFacility && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 to-purple-800 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-purple-300" /><div><h3 className="font-bold text-sm">{t('حجز مرفق', 'Book Facility')}</h3><p className="text-[11px] text-slate-300">{selectedFacility.name || selectedFacility.title}</p></div></div>
              <button onClick={() => setSelectedFacility(null)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBook} className="p-5 space-y-4 text-xs text-slate-700">
              <div><label className="block text-slate-600 font-semibold mb-1">{t('التاريخ', 'Date')}</label><input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-slate-600 font-semibold mb-1">{t('من', 'Start')}</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
                <div><label className="block text-slate-600 font-semibold mb-1">{t('إلى', 'End')}</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              </div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('عدد الضيوف', 'Guests')}</label><input type="number" min="1" value={guestsCount} onChange={e => setGuestsCount(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-slate-600 font-semibold mb-1">{t('الغرض', 'Purpose')}</label><textarea rows={2} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder={t('مثال: عائلية، عيد ميلاد...', 'e.g. family gathering, birthday...')} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedFacility(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl">{t('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}<span>{t('تأكيد الحجز', 'Confirm Booking')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================= BOOKINGS TAB =========================
const BookingsTab: React.FC<any> = ({ myBookings, facilities, language, t, onRefresh }) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const handleCancel = async (id: string) => { try { await apiService.tenantCancelBooking(id, 'Cancelled by tenant'); await onRefresh(); } catch (err) { console.error(err); } finally { setCancellingId(null); } };
  const statusColors: Record<string, string> = { 'Pending': 'bg-amber-50 text-amber-600 border-amber-200', 'Approved': 'bg-emerald-50 text-emerald-600 border-emerald-200', 'Rejected': 'bg-rose-50 text-rose-600 border-rose-200', 'Cancelled': 'bg-slate-100 text-slate-500 border-slate-300', 'Completed': 'bg-cyan-50 text-cyan-600 border-cyan-200' };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-purple-500" />{t('حجوزاتي', 'My Bookings')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('إدارة حجوزاتك في مرافق الكمبوند', 'Manage your facility bookings')}</p>
      </div>
      {myBookings.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2"><CalendarDays className="w-10 h-10 mx-auto text-slate-300" /><p className="text-sm">{t('لا توجد حجوزات', 'No bookings yet')}</p></div>
      ) : (
        <div className="space-y-3">
          {myBookings.map((b: any) => (
            <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-500" /><span className="text-xs font-bold text-slate-800">{b.facilityName || t('مرفق', 'Facility')}</span>{b.bookingNo && <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{b.bookingNo}</span>}</div>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${statusColors[b.status] || statusColors['Pending']}`}>{statusLabel(b.status, language)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.bookingDate || '—'}</span>
                {b.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.startTime}{b.endTime ? ` - ${b.endTime}` : ''}</span>}
                {b.guestsCount > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.guestsCount}</span>}
                {b.purpose && <span className="flex items-center gap-1"><Info className="w-3 h-3" />{b.purpose}</span>}
              </div>
              {b.adminNotes && <div className="text-[11px] text-cyan-600 bg-cyan-50 border border-cyan-200 rounded-lg p-2">{b.adminNotes}</div>}
              {(b.status === 'Pending' || b.status === 'Approved') && (
                <div className="flex justify-end pt-1">
                  <button onClick={() => cancellingId === b.id ? handleCancel(b.id) : setCancellingId(b.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${cancellingId === b.id ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'}`}>
                    {cancellingId === b.id ? t('تأكيد الإلغاء', 'Confirm Cancel') : t('إلغاء الحجز', 'Cancel Booking')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========================= ANNOUNCEMENTS TAB =========================
const AnnouncementsTab: React.FC<any> = ({ announcements, language, t }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" />{t('إعلانات الكمبوند', 'Community Announcements')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('آخر الأخبار والإعلانات من إدارة المجمع', 'Latest news and announcements from management')}</p>
      </div>
      {announcements.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2"><Bell className="w-10 h-10 mx-auto text-slate-300" /><p className="text-sm">{t('لا توجد إعلانات حالياً', 'No announcements at this time')}</p></div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a: any) => (
            <div key={a.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              {a.imageUrls?.[0] && <img src={a.imageUrls[0]} alt={a.title} className="w-full h-40 object-cover rounded-lg" />}
              <h3 className="text-sm font-bold text-slate-800">{a.title || a.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{a.description || a.body || ''}</p>
              <div className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{a.announcementDate || a.createdAt?.slice(0, 10) || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========================= PROFILE TAB =========================
const ProfileTab: React.FC<any> = ({ currentUser, currentTenant, documents, language, t, onUpdateUser, onRefresh }) => {
  const [name, setName] = useState(currentTenant.fullNameArabic || currentTenant.fullName || currentUser.name || '');
  const [email, setEmail] = useState(currentTenant.email || currentUser.email || '');
  const [phone, setPhone] = useState(currentTenant.phoneNumber || currentTenant.mobile || '');
  const [profileImage, setProfileImage] = useState(currentUser.profileImageUrl || currentUser.avatar || '');
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !file.type.startsWith('image/')) return;
    setIsUploading(true);
    try { const url = await apiService.uploadProfileImage(file); setProfileImage(url); } catch (err) { console.error(err); } finally { setIsUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await apiService.tenantUpdateProfile({ fullName: name, fullNameArabic: name, email, phoneNumber: phone, profileImageUrl: profileImage }); if (onUpdateUser) onUpdateUser({ ...currentUser, name, email, profileImageUrl: profileImage }); await onRefresh(); } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2"><User className="w-5 h-5 text-[#29b4c4]" />{t('الملف الشخصي', 'My Profile')}</h2>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <img src={profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'U')}&background=29b4c4&color=fff`} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-[#29b4c4] shadow-lg" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'U')}&background=29b4c4&color=fff`; }} />
              {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
              {!isUploading && <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-8 h-8 text-white" /></button>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold transition-colors">
              {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('جاري الرفع...', 'Uploading...')}</> : <><Upload className="w-4 h-4" />{t('تغيير الصورة', 'Change Photo')}</>}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div><label className="block text-slate-600 font-semibold mb-1 text-xs">{t('الاسم', 'Name')}</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" /></div>
            <div><label className="block text-slate-600 font-semibold mb-1 text-xs">{t('البريد الإلكتروني', 'Email')}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" /></div>
            <div className="sm:col-span-2"><label className="block text-slate-600 font-semibold mb-1 text-xs">{t('رقم الجوال', 'Phone')}</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" /></div>
          </div>
          <div className="flex justify-center">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#29b4c4] hover:bg-cyan-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg disabled:opacity-60 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('حفظ التغييرات', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
      {documents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><File className="w-4 h-4 text-purple-500" />{t('مستنداتي', 'My Documents')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((doc: any) => (
              <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <File className="w-5 h-5 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{doc.fileName}</p><p className="text-[10px] text-slate-400">{doc.category} — {doc.mimeType}</p></div>
                <a href={`/api/Media/${doc.id}/content`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#29b4c4] hover:bg-cyan-50 rounded-lg"><ExternalLink className="w-4 h-4" /></a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========================= SECURITY TAB =========================
const SecurityTab: React.FC<any> = ({ currentTenant, language, t, onUpdateTenantPassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMessage('');
    if (newPassword.length < 8) { setError(t('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'Password must be at least 8 characters')); return; }
    if (newPassword !== confirmPassword) { setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match')); return; }
    try { await apiService.changeOwnPassword(currentPassword, newPassword); setMessage(t('تم تحديث كلمة المرور بنجاح', 'Password updated successfully')); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); } catch (err: any) { setError(err?.message || t('فشل تحديث كلمة المرور', 'Failed to update password')); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 max-w-lg">
      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3"><Key className="w-5 h-5 text-amber-500" />{t('تغيير كلمة المرور', 'Change Password')}</h2>
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">{message}</div>}
      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-slate-600 font-semibold mb-1 text-xs">{t('كلمة المرور الحالية', 'Current Password')}</label>
          <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" /></div></div>
        <div><label className="block text-slate-600 font-semibold mb-1 text-xs">{t('كلمة المرور الجديدة', 'New Password')}</label>
          <div className="relative"><ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" /></div></div>
        <div><label className="block text-slate-600 font-semibold mb-1 text-xs">{t('تأكيد كلمة المرور', 'Confirm Password')}</label>
          <div className="relative"><ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#29b4c4]" /></div></div>
        <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"><Save className="w-4 h-4" />{t('تحديث كلمة المرور', 'Update Password')}</button>
      </form>
    </div>
  );
};
