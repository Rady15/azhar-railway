import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Users,
  Wrench,
  MessageSquareWarning,
  UserCog,
  Wallet,
  Gauge,
  KeyRound,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';

interface AdminPermissionsModalProps {
  onClose: () => void;
}

interface PermissionItem {
  key: string;
  icon: React.ElementType;
}

const defaultPermissions: Record<string, boolean> = {
  contracts: true, tenants: true, maintenance: true, complaints: true,
  staff: true, expenses: true, meters: true, user_management: true
};


export const AdminPermissionsModal: React.FC<AdminPermissionsModalProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...defaultPermissions });
  const [roleId, setRoleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const permissionMap: Record<string, string[]> = {
    contracts: ['contracts.read','contracts.write'], tenants: ['tenants.read','tenants.write'], maintenance: ['maintenance.read','maintenance.write'],
    complaints: ['complaints.read','complaints.write'], staff: ['staff.read','staff.write'], expenses: ['expenses.read','expenses.write'],
    meters: ['units.read','units.write'], user_management: ['admin.manage']
  };

  useEffect(() => {
    apiService.getRoles().then(roles => {
      const admin = roles.find((r:any) => r.name === 'Admin');
      if (!admin) return;
      setRoleId(admin.id);
      const codes = new Set<string>(admin.permissions || []);
      const next: Record<string, boolean> = {};
      Object.entries(permissionMap).forEach(([k,vals]) => { next[k] = vals.every(v => codes.has(v)); });
      setPerms(next);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const items: PermissionItem[] = [
    { key: 'contracts', icon: FileText },
    { key: 'tenants', icon: Users },
    { key: 'maintenance', icon: Wrench },
    { key: 'complaints', icon: MessageSquareWarning },
    { key: 'staff', icon: UserCog },
    { key: 'expenses', icon: Wallet },
    { key: 'meters', icon: Gauge },
    { key: 'user_management', icon: KeyRound }
  ];

  const toggle = (key: string) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const saveAll = async () => {
    if (!roleId) return;
    const selected = Object.entries(perms).flatMap(([k,on]) => on ? (permissionMap[k] || []) : []);
    // Keep dashboard access so the administrator cannot lock the whole UI accidentally.
    const codes = Array.from(new Set(['dashboard.read', ...selected]));
    try { await apiService.updateRolePermissions(roleId, codes); setSaved(true); } catch (err) { console.error(err); setSaved(false); }
  };

  const resetAll = async () => { setPerms({ ...defaultPermissions }); setSaved(false); };

  const labels: Record<string, { ar: string; en: string; descAr: string; descEn: string }> = {
    contracts: { ar: 'العقود والتحرير', en: 'Contracts & Drafting', descAr: 'إضافة وتعديل وأرشفة العقود', descEn: 'Add, edit and archive contracts' },
    tenants: { ar: 'سجل المستأجرين', en: 'Tenants Directory', descAr: 'إدارة سجلات المستأجرين والعقود', descEn: 'Manage tenant records and contracts' },
    maintenance: { ar: 'طلبات الصيانة', en: 'Maintenance Requests', descAr: 'متابعة طلبات الصيانة وتوزيعها', descEn: 'Track and assign maintenance requests' },
    complaints: { ar: 'الشكاوى والبلاغات', en: 'Complaints & Reports', descAr: 'الرد على شكاوى المستأجرين', descEn: 'Respond to tenant complaints' },
    staff: { ar: 'فريق العمل والاستاف', en: 'Staff Management', descAr: 'إضافة وتعديل بيانات الموظفين', descEn: 'Add and edit staff records' },
    expenses: { ar: 'المصروفات وسندات الصرف', en: 'Expenses & Vouchers', descAr: 'تسجيل المصروفات وسندات الصرف', descEn: 'Record expenses and payment vouchers' },
    meters: { ar: 'عدادات الكهرباء والمياه', en: 'Meters & Utilities', descAr: 'قراءات العدادات والفواتير', descEn: 'Meter readings and bills' },
    user_management: { ar: 'إدارة المستخدمين', en: 'User Management', descAr: 'إدارة حسابات الدخول والصلاحيات', descEn: 'Manage login accounts and permissions' }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-[#2b3038] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#29b4c4]" />
            <h2 className="text-base font-bold">
              {language === 'ar' ? 'صلاحيات المدير' : 'Admin Permissions'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-slate-800">
          <div className="flex items-center justify-between bg-[#29b4c4]/10 border border-[#29b4c4]/30 rounded-xl px-4 py-3">
            <div>
              <p className="font-bold text-[#0e7a87]">
                {language === 'ar' ? 'صلاحيات الوصول للنظام' : 'System Access Permissions'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'ar'
                  ? 'تحكم في الوحدات المتاحة لحساب المدير'
                  : 'Control which modules are available for the admin account'}
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-[#29b4c4]" />
          </div>

          {/* Permission List */}
          <div className="space-y-2">
            {items.map(item => {
              const Icon = item.icon;
              const label = labels[item.key];
              return (
                <div
                  key={item.key}
                  className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 transition-colors ${
                    perms[item.key]
                      ? 'bg-white border-emerald-200'
                      : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      perms[item.key] ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {language === 'ar' ? label.ar : label.en}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {language === 'ar' ? label.descAr : label.descEn}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggle(item.key)}
                    disabled={loading}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${
                      perms[item.key] ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                    } flex`}
                    title={language === 'ar' ? (perms[item.key] ? 'مفعل' : 'معطل') : perms[item.key] ? 'Enabled' : 'Disabled'}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetAll}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl"
            >
              <RotateCcw className="w-4 h-4" />
              {language === 'ar' ? 'استعادة الافتراضي' : 'Reset All'}
            </button>
            <button
              type="button"
              onClick={saveAll}
              className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#1f9bad] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'ar' ? 'تم الحفظ' : 'Saved'}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {language === 'ar' ? 'حفظ الصلاحيات' : 'Save Permissions'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
