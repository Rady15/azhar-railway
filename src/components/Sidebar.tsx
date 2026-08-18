import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Archive, 
  Home, 
  Zap, 
  Users, 
  PlusSquare, 
  Wrench, 
  Droplet, 
  ChevronRight, 
  ChevronLeft,
  DollarSign,
  Info,
  MessageSquareWarning,
  UserCheck,
  Receipt,
  Mail,
  PartyPopper,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type ActiveTab = 
  | 'dashboard_main'
  | 'dashboard_dues'
  | 'dashboard_maintenance'
  | 'azhar_collections'
  | 'azhar_contracts'
  | 'azhar_archived_contracts'
  | 'azhar_non_rented'
  | 'azhar_electricity'
  | 'azhar_tenants'
  | 'azhar_buildings'
  | 'azhar_units'
  | 'azhar_maintenance'
  | 'azhar_complaints'
  | 'azhar_staff'
  | 'azhar_expenses'
  | 'azhar_letters'
  | 'azhar_facilities'
  | 'azhar_facility_bookings'
  | 'water_meters'
  | 'electricity_meters'
  | 'all_tenants'
  | 'archived_tenants'
  | 'azhar_companies'
  | 'azhar_announcements'
  | 'patch_notes';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile
}) => {
  const { language, t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    dashboards: true,
    azhar_residence: true,
    facilities_group: true,
    utilities: false,
    tenants: false
  });

  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const isRtl = language === 'ar';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <aside className={`
        fixed lg:static top-16 bottom-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-40
        w-64 bg-[#1d2024] text-slate-300 border-slate-800
        flex flex-col transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/40">
          <div
            className="bg-cover bg-center border border-slate-700/60 rounded-xl h-16 px-3 py-2 flex items-center gap-2 relative overflow-hidden"
            style={{
              backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.86)), url("https://rightcompoundimages.blob.core.windows.net/images/Common/Images/Compound/573/27ecde5aea67429b937f2a4127d99ed0.jpeg")'
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div className="truncate">
              <p className="text-[11px] font-bold text-slate-100 truncate">
                {language === 'ar' ? 'مجمع أزهار السكني' : 'AZHAR RESIDENCE'}
              </p>
              <p className="text-[9px] text-cyan-400 font-medium">
                {language === 'ar' ? 'نظام إدارة المجمع' : 'Compound Active System'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* GROUP 1: DASHBOARDS */}
          <div className="mb-2">
            <button
              onClick={() => toggleGroup('dashboards')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-[#29b4c4]" />
                <span>{t('group_dashboards')}</span>
              </div>
              {isRtl ? (
                <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.dashboards ? '-rotate-90' : ''}`} />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.dashboards ? 'rotate-90' : ''}`} />
              )}
            </button>

            {openGroups.dashboards && (
              <div className={`mt-1 space-y-0.5 ${isRtl ? 'pr-4 border-r-2 mr-3' : 'pl-4 border-l-2 ml-3'} border-slate-800`}>
                <button
                  onClick={() => handleSelect('dashboard_main')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'dashboard_main' 
                      ? 'bg-[#29b4c4] text-white font-semibold shadow-sm' 
                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{t('overview')}</span>
                </button>

                <button
                  onClick={() => handleSelect('dashboard_dues')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'dashboard_dues' 
                      ? 'bg-[#29b4c4] text-white font-semibold shadow-sm' 
                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{t('dues_and_rents')}</span>
                </button>

                <button
                  onClick={() => handleSelect('dashboard_maintenance')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'dashboard_maintenance' 
                      ? 'bg-[#29b4c4] text-white font-semibold shadow-sm' 
                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{t('maintenance_dashboard')}</span>
                </button>
              </div>
            )}
          </div>

          {/* GROUP 2: AZHAR RESIDENCE */}
          <div className="mb-2">
            <button
              onClick={() => toggleGroup('azhar_residence')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#29b4c4]" />
                <span>{t('group_azhar_residence')}</span>
              </div>
              {isRtl ? (
                <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.azhar_residence ? '-rotate-90' : ''}`} />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.azhar_residence ? 'rotate-90' : ''}`} />
              )}
            </button>

            {openGroups.azhar_residence && (
              <div className={`mt-1 space-y-0.5 ${isRtl ? 'pr-4 border-r-2 mr-3' : 'pl-4 border-l-2 ml-3'} border-slate-800`}>
                <button
                  onClick={() => handleSelect('azhar_collections')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_collections' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{t('collections')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_contracts')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_contracts' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t('contracts')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_archived_contracts')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_archived_contracts' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{t('archived_contracts')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_non_rented')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_non_rented' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{t('vacant_units')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_electricity')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_electricity' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('electricity_meters')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_tenants')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_tenants' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('tenants')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_units')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_units' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <PlusSquare className="w-3.5 h-3.5" />
                  <span>{t('units_management')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_maintenance')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_maintenance' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{t('maintenance_requests')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_complaints')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_complaints' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <MessageSquareWarning className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('complaints')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_staff')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_staff' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('staff')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_expenses')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_expenses' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-300" />
                  <span>{t('expenses')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_letters')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_letters' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t('letters')}</span>
                </button>
              </div>
            )}
          </div>

          {/* GROUP 3: FACILITIES & BOOKINGS */}
          <div className="mb-2">
            <button
              onClick={() => toggleGroup('facilities_group')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-rose-300" />
                <span>{t('group_facilities')}</span>
              </div>
              {isRtl ? (
                <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.facilities_group ? '-rotate-90' : ''}`} />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.facilities_group ? 'rotate-90' : ''}`} />
              )}
            </button>

            {openGroups.facilities_group && (
              <div className={`mt-1 space-y-0.5 ${isRtl ? 'pr-4 border-r-2 mr-3' : 'pl-4 border-l-2 ml-3'} border-slate-800`}>
                <button
                  onClick={() => handleSelect('azhar_facilities')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_facilities' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <PartyPopper className="w-3.5 h-3.5 text-rose-300" />
                  <span>{t('facilities')}</span>
                </button>

                <button
                  onClick={() => handleSelect('azhar_facility_bookings')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'azhar_facility_bookings' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t('facility_bookings')}</span>
                </button>
              </div>
            )}
          </div>

          {/* GROUP 4: WATER & ELECTRICITY */}
          <div className="mb-2">
            <button
              onClick={() => toggleGroup('utilities')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{t('group_utilities')}</span>
              </div>
              {isRtl ? (
                <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.utilities ? '-rotate-90' : ''}`} />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.utilities ? 'rotate-90' : ''}`} />
              )}
            </button>

            {openGroups.utilities && (
              <div className={`mt-1 space-y-0.5 ${isRtl ? 'pr-4 border-r-2 mr-3' : 'pl-4 border-l-2 ml-3'} border-slate-800`}>
                <button
                  onClick={() => handleSelect('water_meters')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'water_meters' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Droplet className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('water_meters')}</span>
                </button>

                <button
                  onClick={() => handleSelect('electricity_meters')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'electricity_meters' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('all_electricity_meters')}</span>
                </button>
              </div>
            )}
          </div>

          {/* GROUP 4: TENANTS MANAGEMENT */}
          <div className="mb-2">
            <button
              onClick={() => toggleGroup('tenants')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{t('group_tenants_directory')}</span>
              </div>
              {isRtl ? (
                <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.tenants ? '-rotate-90' : ''}`} />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups.tenants ? 'rotate-90' : ''}`} />
              )}
            </button>

            {openGroups.tenants && (
              <div className={`mt-1 space-y-0.5 ${isRtl ? 'pr-4 border-r-2 mr-3' : 'pl-4 border-l-2 ml-3'} border-slate-800`}>
                <button
                  onClick={() => handleSelect('all_tenants')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'all_tenants' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('all_tenants')}</span>
                </button>

                <button
                  onClick={() => handleSelect('archived_tenants')}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'archived_tenants' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{t('archived_tenants')}</span>
                </button>
              </div>
            )}
          </div>


          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            <button onClick={() => handleSelect('azhar_companies')} className={`w-full text-start px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${activeTab==='azhar_companies'?'bg-[#29b4c4] text-white':'hover:bg-slate-800/80 text-slate-400 hover:text-white'}`}><Building2 className="w-4 h-4"/><span>{language==='ar'?'الشركات':'Companies'}</span></button>
            <button onClick={() => handleSelect('azhar_announcements')} className={`w-full text-start px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${activeTab==='azhar_announcements'?'bg-[#29b4c4] text-white':'hover:bg-slate-800/80 text-slate-400 hover:text-white'}`}><Mail className="w-4 h-4"/><span>{language==='ar'?'الإعلانات':'Announcements'}</span></button>
          </div>

          {/* SYSTEM INFO */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => handleSelect('patch_notes')}
              className={`w-full text-start px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'patch_notes' ? 'bg-[#29b4c4] text-white font-semibold' : 'hover:bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>{t('system_info')}</span>
            </button>
          </div>

        </div>

        {/* Footer info inside sidebar */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>{language === 'ar' ? 'بوابة مجمع أزهار السكني' : 'Azhar Residence Portal'}</span>
          <span className="bg-[#29b4c4]/20 text-cyan-300 px-1.5 py-0.5 rounded border border-[#29b4c4]/30">
            {language === 'ar' ? 'الإصدار 3.0' : 'v3.0 - Azhar'}
          </span>
        </div>
      </aside>
    </>
  );
};

