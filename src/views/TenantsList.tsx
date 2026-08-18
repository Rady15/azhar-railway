import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MessageSquare, 
  Archive, 
  CheckCircle2, 
  Edit3,
  X,
  Trash2,
  ArrowUpDown,
  Eye,
  Home,
  History,
  FileText,
  CalendarDays
} from 'lucide-react';
import { Contract, Tenant } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmUi, promptUi } from '../utils/uiDialog';
import { MediaUploadField } from '../components/MediaUploadField';

interface TenantsListProps {
  tenants: Tenant[];
  contracts: Contract[];
  showArchivedOnly?: boolean;
  onAddTenant: (tenant: Omit<Tenant, 'id'>) => void;
  onUpdateTenant?: (tenant: Tenant) => void;
  onToggleArchiveTenant: (id: string) => void;
  onDeleteTenant?: (id: string) => void;
}

export const TenantsList: React.FC<TenantsListProps> = ({
  tenants,
  contracts,
  showArchivedOnly = false,
  onAddTenant,
  onUpdateTenant,
  onToggleArchiveTenant,
  onDeleteTenant
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  const contractsForTenant = (tenant: Tenant) => contracts
    .filter((c) => {
      if (String(c.tenantId || '') === String(tenant.id)) return true;
      const tenantName = String(tenant.name || '').trim().toLowerCase();
      const contractName = String(c.tenantName || '').trim().toLowerCase();
      const tenantEmail = String(tenant.email || '').trim().toLowerCase();
      const contractEmail = String((c as any).tenantEmail || '').trim().toLowerCase();
      return Boolean((tenantName && contractName && tenantName === contractName) || (tenantEmail && contractEmail && tenantEmail === contractEmail));
    })
    .sort((a, b) => String(b.leaseStartDate || '').localeCompare(String(a.leaseStartDate || '')));

  const hasActiveContract = (tenant: Tenant) => {
    const today = new Date().toISOString().slice(0, 10);
    return contractsForTenant(tenant).some(c => {
      if (String(c.status || '').toLowerCase() === 'archived' || (c as any).isArchived) return false;
      const start = String(c.leaseStartDate || '').slice(0, 10);
      const end = String(c.leaseEndDate || '').slice(0, 10);
      const normalizedStatus = String(c.status || 'Active').trim().toLowerCase();
      const statusActive = !['archived','cancelled','terminated','blocked','closed'].includes(normalizedStatus);
      return statusActive && (!start || start <= today) && (!end || end >= today);
    });
  };

  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB') : '-';

  const handleSort = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  // Form states for Add / Edit
  const [name, setName] = useState('');
  const [fullNameArabic, setFullNameArabic] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [familyCount, setFamilyCount] = useState('1');
  const [whatsapp, setWhatsapp] = useState('');
  const [company, setCompany] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [tenantRemarks, setTenantRemarks] = useState('');
  const [isMarried, setIsMarried] = useState(true);
  const [password, setPassword] = useState('');
  const [identityDocumentUrl, setIdentityDocumentUrl] = useState('');
  const [identityDocumentName, setIdentityDocumentName] = useState('');
  const [manualContractDocumentUrl, setManualContractDocumentUrl] = useState('');
  const [manualContractDocumentName, setManualContractDocumentName] = useState('');

  const filteredTenants = tenants.filter(t => {
    const isArchived = Boolean(t.archived);
    if (showArchivedOnly ? !isArchived : isArchived) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.fullNameArabic && t.fullNameArabic.toLowerCase().includes(q)) ||
        t.email.toLowerCase().includes(q) ||
        t.mobile.includes(q)
      );
    }
    return true;
  });

  const sortedTenants = useMemo(() => {
    if (!sortConfig) return filteredTenants;
    return [...filteredTenants].sort((a: any, b: any) => {
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
  }, [filteredTenants, sortConfig]);

  const resetForm = () => {
    setName('');
    setFullNameArabic('');
    setEmail('');
    setUsername('');
    setMobile('');
    setEmergencyPhone('');
    setNationality('');
    setFamilyCount('1');
    setWhatsapp('');
    setCompany('');
    setCompanyName('');
    setWorkNotes('');
    setTenantRemarks('');
    setIsMarried(true);
    setPassword('');
    setIdentityDocumentUrl(''); setIdentityDocumentName('');
    setManualContractDocumentUrl(''); setManualContractDocumentName('');
  };

  const openAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEdit = (t: Tenant) => {
    setEditingTenant(t);
    setName(t.name || '');
    setFullNameArabic(t.fullNameArabic || '');
    setEmail(t.email || '');
    setUsername(t.username || '');
    setMobile(t.mobile || '');
    setEmergencyPhone(t.emergencyPhone || '');
    setNationality(t.nationality || '');
    setFamilyCount(String(t.familyCount || '1'));
    setWhatsapp(t.whatsapp || t.mobile || '');
    setCompany(t.company || '');
    setCompanyName(t.companyName || '');
    setWorkNotes(t.workNotes || '');
    setTenantRemarks(t.tenantRemarks || '');
    setIsMarried(t.isMarried !== undefined ? t.isMarried : true);
    setPassword('');
    setIdentityDocumentUrl(t.identityDocumentUrl || ''); setIdentityDocumentName(t.identityDocumentName || '');
    setManualContractDocumentUrl(t.manualContractDocumentUrl || ''); setManualContractDocumentName(t.manualContractDocumentName || '');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTenant({
      name,
      fullNameArabic,
      email,
      username,
      mobile,
      emergencyPhone,
      whatsapp: whatsapp || mobile,
      nationality,
      familyCount,
      workNotes,
      isMarried,
      company,
      companyName,
      tenantRemarks,
      password: password || undefined,
      hasContract: false,
      identityDocumentUrl, identityDocumentName,
      manualContractDocumentUrl, manualContractDocumentName
    });
    setShowAddModal(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !onUpdateTenant) return;
    onUpdateTenant({
      ...editingTenant,
      name,
      fullNameArabic,
      email,
      username,
      mobile,
      emergencyPhone,
      whatsapp: whatsapp || mobile,
      nationality,
      familyCount,
      workNotes,
      isMarried,
      company,
      companyName,
      tenantRemarks,
      password: password || undefined,
      identityDocumentUrl, identityDocumentName,
      manualContractDocumentUrl, manualContractDocumentName
    });
    setEditingTenant(null);
    resetForm();
  };

  const handleOpenWhatsApp = (tenant: Tenant) => {
    const raw = tenant.whatsapp || tenant.mobile;
    const cleanPhone = raw.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('966') ? cleanPhone : `966${cleanPhone.replace(/^0/, '')}`;
    window.open(`https://wa.me/${phoneWithCountry}`, '_blank');
  };

  const handleDeleteTenant = async (t: Tenant) => {
    if (!onDeleteTenant) return;
    const confirmed = await confirmUi({ title: language === 'ar' ? 'حذف المستأجر' : 'Delete tenant', message: language === 'ar' ? `سيتم إزالة المستأجر "${t.name}" من القوائم وإيقاف حسابه بعد التأكد من أن رصيده صفر. سيظل السجل المالي والعقود القديمة محفوظين للأرشيف. هل تريد المتابعة؟` : `The tenant "${t.name}" will be removed from active lists and their account disabled once the balance is zero. Historical contracts and payments will remain archived. Continue?`, confirmText: language === 'ar' ? 'حذف المستأجر' : 'Delete tenant', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' });
    if (confirmed) onDeleteTenant(t.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>{t('tenants_directory')}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {showArchivedOnly ? t('archived_tenants_register') : t('tenants_directory')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('tenants_desc')}
          </p>
        </div>

        {!showArchivedOnly && (
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('register_new_tenant')}
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث عن مستأجر بالاسم، الإيميل، أو الجوال...' : 'Search tenant by name, email, or mobile...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4] ${
              language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {language === 'ar' ? 'إجمالي النتائج:' : 'Showing'}{' '}
          <span className="font-bold text-slate-900">{filteredTenants.length}</span>{' '}
          {language === 'ar' ? 'مستأجر' : 'tenants'}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
              <tr>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center w-10">#</th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{t('tenant_name')}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('fullNameArabic')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{t('arabic_name')}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{t('email')}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('hasContract')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{t('contract_status')}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('mobile')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{t('mobile')}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono">
                  <span>{t('whatsapp')}</span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>{t('operations')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {sortedTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا يوجد مستأجرون مطابقون للبحث.' : 'No tenants match search query.'}
                  </td>
                </tr>
              ) : (
                sortedTenants.map((tenantItem, idx) => (
                  <tr key={tenantItem.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-l border-slate-100">{tenantItem.name}</td>
                    <td className="py-3 px-3 font-medium text-slate-600 border-l border-slate-100">{tenantItem.fullNameArabic || '-'}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 border-l border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {tenantItem.email || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center border-l border-slate-100">
                      {hasActiveContract(tenantItem) ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {t('has_contract')}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {t('no_contract')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800 border-l border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {tenantItem.mobile}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800 border-l border-slate-100">
                      <button
                        onClick={() => handleOpenWhatsApp(tenantItem)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 font-semibold text-[11px] transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        {tenantItem.whatsapp || tenantItem.mobile}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingTenant(tenantItem)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-md transition-colors"
                          title={language === 'ar' ? 'عرض الوحدة والسجل الإيجاري' : 'View unit and rental history'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(tenantItem)}
                          className="px-3 py-1 bg-[#475569] hover:bg-[#334155] text-white text-[11px] font-bold rounded-md shadow-sm transition-all flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t('edit')}</span>
                        </button>

                        <button
                          onClick={() => onToggleArchiveTenant(tenantItem.id)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                          title={tenantItem.archived ? t('unarchive') : t('archive')}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteTenant && (
                          <button
                            onClick={() => handleDeleteTenant(tenantItem)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md transition-colors"
                            title={language === 'ar' ? 'حذف المستأجر نهائياً' : 'Delete Tenant'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Unit & Rental History Modal */}
      {viewingTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setViewingTenant(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#2b3038] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#29b4c4]" />
                <div>
                  <h3 className="text-base font-bold">{language === 'ar' ? 'الوحدة والسجل الإيجاري للمستأجر' : 'Tenant Unit & Rental History'}</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">{viewingTenant.name}</p>
                </div>
              </div>
              <button onClick={() => setViewingTenant(null)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {(() => {
                const history = contractsForTenant(viewingTenant);
                const current = history.find(c => c.status === 'Active');
                return (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-[#29b4c4]" /><h4 className="font-bold text-sm text-slate-900">{language === 'ar' ? 'كل بيانات المستأجر' : 'Complete Tenant Details'}</h4></div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {[
                          ['الاسم','Name',viewingTenant.name], ['الاسم بالعربي','Arabic Name',viewingTenant.fullNameArabic || '-'],
                          ['اسم المستخدم','Username',viewingTenant.username || '-'], ['البريد الإلكتروني','Email',viewingTenant.email || '-'],
                          ['الجوال','Mobile',viewingTenant.mobile || '-'], ['رقم الطوارئ','Emergency',viewingTenant.emergencyPhone || '-'],
                          ['واتساب','WhatsApp',viewingTenant.whatsapp || '-'], ['الجنسية','Nationality',viewingTenant.nationality || '-'],
                          ['عدد أفراد الأسرة','Family Count',String(viewingTenant.familyCount || '-')], ['الحالة','Status',viewingTenant.archived ? 'Archived' : (viewingTenant.isActive === false ? 'Inactive' : 'Active')],
                          ['الشركة','Company',viewingTenant.companyName || viewingTenant.company || '-'], ['ملاحظات','Notes',viewingTenant.tenantRemarks || viewingTenant.workNotes || '-']
                        ].map(([ar,en,val])=><div key={en} className="bg-white rounded-xl border border-slate-200 p-2.5"><div className="text-slate-400 mb-1">{language === 'ar' ? ar : en}</div><div className="font-bold text-slate-900 break-words">{val}</div></div>)}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3"><Home className="w-4 h-4 text-[#29b4c4]" /><h4 className="font-bold text-sm text-slate-900">{language === 'ar' ? 'الوحدة المستأجرة حالياً' : 'Current Rented Unit'}</h4></div>
                      {current ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                          <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'المجمع' : 'Compound'}</p><p className="font-bold text-slate-900">{current.compoundName || '-'}</p></div>
                          <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'المبنى' : 'Building'}</p><p className="font-bold text-slate-900">{current.buildingNumber || '-'}</p></div>
                          <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'الوحدة' : 'Unit'}</p><p className="font-mono font-bold text-[#1a7f8b] text-base">{current.unitNumber || '-'}</p></div>
                          <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'بداية العقد' : 'Lease Start'}</p><p className="font-bold text-slate-900">{formatDate(current.leaseStartDate)}</p></div>
                          <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'نهاية العقد' : 'Lease End'}</p><p className="font-bold text-slate-900">{formatDate(current.leaseEndDate)}</p></div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-slate-500 text-xs">{language === 'ar' ? 'لا توجد وحدة مستأجرة حالياً.' : 'There is no active rented unit currently.'}</div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2"><History className="w-4 h-4 text-[#29b4c4]" /><h4 className="font-bold text-sm text-slate-900">{language === 'ar' ? 'سجل الوحدات السابقة والحالية' : 'Current & Previous Units'}</h4></div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{history.length} {language === 'ar' ? 'عقد' : 'contracts'}</span>
                      </div>
                      {history.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-slate-500 text-xs">{language === 'ar' ? 'لا يوجد سجل إيجاري لهذا المستأجر حتى الآن.' : 'No rental history is recorded for this tenant yet.'}</div>
                      ) : (
                        <div className="space-y-2">
                          {history.map((contract) => (
                            <div key={contract.id} className={`rounded-xl border p-3 text-xs ${contract.status === 'Active' ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
                                <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'الوحدة' : 'Unit'}</p><p className="font-bold text-slate-900">{contract.buildingNumber || '-'} / {contract.unitNumber || '-'}</p></div>
                                <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'رقم العقد' : 'Contract'}</p><p className="font-mono font-bold text-slate-900">{contract.contractNo || contract.contractNumber}</p></div>
                                <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'من' : 'From'}</p><p className="font-bold text-slate-900">{formatDate(contract.leaseStartDate)}</p></div>
                                <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'إلى' : 'To'}</p><p className="font-bold text-slate-900">{formatDate(contract.leaseEndDate)}</p></div>
                                <div><p className="text-slate-500 mb-1">{language === 'ar' ? 'الإجمالي السنوي' : 'Annual Total'}</p><p className="font-bold text-slate-900">{Number(contract.totalYearlyRent || contract.annualRent || 0).toLocaleString()}</p></div>
                                <div className="text-left md:text-center"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${contract.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{contract.status === 'Active' ? (language === 'ar' ? 'حالي' : 'Current') : (language === 'ar' ? 'سابق' : 'Previous')}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Tenant Modal */}
      {(showAddModal || editingTenant) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#29b4c4]" />
                {editingTenant ? 'Edit Tenant Details' : 'Register New Tenant'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingTenant(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form autoComplete="off" onSubmit={editingTenant ? handleEditSubmit : handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Name In Arabic</label>
                  <input
                    type="text"
                    placeholder="الاسم بالعربية"
                    value={fullNameArabic}
                    onChange={(e) => setFullNameArabic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'اسم المستخدم للدخول' : 'Login Username'}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    placeholder="username"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Mobile *</label>
                  <input
                    type="text"
                    required
                    placeholder="05xxxxxxxx"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Phone *</label>
                  <input
                    type="text"
                    placeholder="05xxxxxxxx"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nationality *</label>
                  <input
                    type="text"
                    placeholder="Sudan / Saudi / Egyptian"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Family Count *</label>
                  <input
                    type="number"
                    min="1"
                    value={familyCount}
                    onChange={(e) => setFamilyCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Whatsapp *</label>
                  <input
                    type="text"
                    placeholder="9665xxxxxxxx"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                

                

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Portal Password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required={!editingTenant}
                    placeholder={editingTenant ? (language === 'ar' ? 'اتركها فارغة للإبقاء على كلمة المرور الحالية' : 'Leave blank to keep current password') : (language === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-amber-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MediaUploadField
                  label={language === 'ar' ? 'صورة الهوية / الإقامة' : 'ID / Iqama Image'}
                  category="tenant-identity" entityType="tenant" entityId={editingTenant?.id}
                  value={identityDocumentUrl} fileName={identityDocumentName} accept="image/jpeg,image/png,image/webp,application/pdf"
                  onUploaded={({url,fileName}) => { setIdentityDocumentUrl(url); setIdentityDocumentName(fileName); }}
                  onClear={() => { setIdentityDocumentUrl(''); setIdentityDocumentName(''); }}
                />
                <MediaUploadField
                  label={language === 'ar' ? 'نسخة عقد المستأجر المرفوعة يدوياً' : 'Manual Tenant Contract'}
                  category="tenant-contract" entityType="tenant" entityId={editingTenant?.id}
                  value={manualContractDocumentUrl} fileName={manualContractDocumentName} accept="image/jpeg,image/png,image/webp,application/pdf"
                  onUploaded={({url,fileName}) => { setManualContractDocumentUrl(url); setManualContractDocumentName(fileName); }}
                  onClear={() => { setManualContractDocumentUrl(''); setManualContractDocumentName(''); }}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Notes</label>
                <textarea
                  rows={2}
                  placeholder="Work notes / employment status"
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tenant Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Tenant remarks / additional details"
                  value={tenantRemarks}
                  onChange={(e) => setTenantRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isMarried"
                  checked={isMarried}
                  onChange={(e) => setIsMarried(e.target.checked)}
                  className="rounded text-[#29b4c4] focus:ring-[#29b4c4]"
                />
                <label htmlFor="isMarried" className="font-semibold text-slate-700">
                  Tenant is Married
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingTenant(null); }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingTenant ? 'Save Changes' : 'Save Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
