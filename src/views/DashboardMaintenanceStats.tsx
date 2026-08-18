import React, { useMemo } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import {
  HardHat, AlertTriangle, Wrench, Clock, CheckCircle2, UserCheck,
  ShieldCheck, Banknote, ArrowUpRight, Flame, Sparkles, Building2
} from 'lucide-react';
import { MaintenanceRequest, StaffMember } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DashboardMaintenanceStatsProps {
  maintenanceRequests: MaintenanceRequest[];
  staffMembers?: StaffMember[];
  onNavigate?: (tab: string) => void;
}

const STATUS_META: Record<string, { key: string; color: string; bg: string }> = {
  'New': { key: 'New', color: '#3b82f6', bg: '#dbeafe' },
  'Awaiting Supervisor Approval': { key: 'Awaiting Supervisor Approval', color: '#f59e0b', bg: '#fef3c7' },
  'Awaiting Manager Approval': { key: 'Awaiting Manager Approval', color: '#8b5cf6', bg: '#ede9fe' },
  'In Progress': { key: 'In Progress', color: '#06b6d4', bg: '#cffafe' },
  'Done': { key: 'Done', color: '#10b981', bg: '#d1fae5' },
  'Rejected Supervisor': { key: 'Rejected Supervisor', color: '#ef4444', bg: '#fee2e2' },
  'Rejected Manager': { key: 'Rejected Manager', color: '#ef4444', bg: '#fee2e2' },
};

export const DashboardMaintenanceStats: React.FC<DashboardMaintenanceStatsProps> = ({
  maintenanceRequests,
  staffMembers = [],
  onNavigate
}) => {
  const { language } = useLanguage();

  const t = {
    bannerTag: language === 'ar' ? 'لوحة عمليات الصيانة' : 'Maintenance Operations',
    bannerTitle: language === 'ar' ? 'تحليلات الصيانة والإصلاحات' : 'Maintenance & Repair Analytics',
    bannerSub: language === 'ar'
      ? 'مراقبة حية لأعباء العمل، مراحل الموافقة، تكاليف الصيانة، وأداء الفنيين داخل مجمع أزهار.'
      : 'Live tracking of workloads, approval stages, maintenance costs and technician performance across Azhar Residence.',
    viewTickets: language === 'ar' ? 'كل طلبات الصيانة' : 'View All Tickets',
    totalTickets: language === 'ar' ? 'إجمالي الطلبات' : 'Total Tickets',
    inProgress: language === 'ar' ? 'قيد التنفيذ' : 'In Progress',
    awaitingApproval: language === 'ar' ? 'بانتظار الموافقة' : 'Awaiting Approval',
    completed: language === 'ar' ? 'مكتملة' : 'Completed',
    totalCost: language === 'ar' ? 'إجمالي التكاليف' : 'Total Cost',
    activeTechnicians: language === 'ar' ? 'فني عامل' : 'Active Technicians',
    pipeline: language === 'ar' ? 'خط سير المعالجة' : 'Processing Pipeline',
    pipelineHint: language === 'ar' ? 'نسبة كل مرحلة من الإجمالي' : 'share of each stage',
    statusDist: language === 'ar' ? 'توزيع الحالات' : 'Status Distribution',
    costByBuilding: language === 'ar' ? 'التكاليف حسب المبنى' : 'Cost by Building',
    costByBuildingHint: language === 'ar' ? 'قيمة الأعمال لكل مبنى (ر.س)' : 'work value per building (SAR)',
    tikByBuilding: language === 'ar' ? 'الطلبات حسب المبنى' : 'Tickets by Building',
    staffWorkload: language === 'ar' ? 'أداء الفنيين' : 'Technician Workload',
    staffWorkloadHint: language === 'ar' ? 'عدد الطلبات الأسندت لكل فني' : 'tickets assigned per technician',
    movements: language === 'ar' ? 'أحدث حركات الصيانة' : 'Recent Maintenance Activity',
    movementsHint: language === 'ar' ? 'أحدث 6 طلبات على النظام' : 'latest 6 tickets in system',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data',
    unassigned: language === 'ar' ? 'غير مُسند' : 'Unassigned',
    critical: language === 'ar' ? 'تنبيه تسليم عاجل' : 'Critical Deadline Alert',
    criticalDesc: language === 'ar'
      ? 'طلبات قاربت مدة تنفيذها على الانتهاء — راجعها وحدّث حالتها.'
      : 'Tickets approaching or past their deadline — review and update them now.',
    sar: language === 'ar' ? 'ر.س' : 'SAR',
    days: language === 'ar' ? 'يوم' : 'days',
  };

  const stats = useMemo(() => {
    const total = maintenanceRequests.length;
    const inProgress = maintenanceRequests.filter(r => r.status === 'In Progress').length;
    const awaiting = maintenanceRequests.filter(r => r.status === 'Awaiting Supervisor Approval' || r.status === 'Awaiting Manager Approval').length;
    const done = maintenanceRequests.filter(r => r.status === 'Done').length;
    const totalCost = maintenanceRequests.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const activeTechs = staffMembers.filter(s => s.status === 'Active').length;
    return { total, inProgress, awaiting, done, totalCost, activeTechs };
  }, [maintenanceRequests, staffMembers]);

  const pipelineData = useMemo(() => {
    const counts = Object.keys(STATUS_META).map(key => ({
      name: STATUS_META[key].key,
      value: maintenanceRequests.filter(r => r.status === STATUS_META[key].key).length,
      color: STATUS_META[key].color
    }));
    const max = Math.max(...counts.map(c => c.value), 1);
    return counts.map(c => ({ ...c, actual: c.value, value: Math.round((c.value / max) * 100), fill: c.color }));
  }, [maintenanceRequests]);

  const statusDist = useMemo(() => {
    const colors = Object.values(STATUS_META).map(m => m.color);
    return pipelineData.map((c, i) => ({ name: c.name, value: c.actual, color: colors[i % colors.length] })).filter(d => d.value > 0);
  }, [pipelineData]);

  const byBuilding = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    maintenanceRequests.forEach(r => {
      const b = r.buildingNumber || '—';
      if (!map[b]) map[b] = { count: 0, cost: 0 };
      map[b].count += 1;
      map[b].cost += r.totalAmount || 0;
    });
    return Object.entries(map).map(([b, v]) => ({
      building: `${language === 'ar' ? 'مبنى' : 'Bld'} ${b}`,
      tickets: v.count,
      cost: v.cost
    }));
  }, [maintenanceRequests, language]);

  const staffWorkload = useMemo(() => {
    const map: Record<string, number> = {};
    maintenanceRequests.forEach(r => {
      if (r.assignedStaffName) map[r.assignedStaffName] = (map[r.assignedStaffName] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, tickets]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, tickets }))
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 6);
  }, [maintenanceRequests]);

  const movements = useMemo(() =>
    [...maintenanceRequests]
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      .slice(0, 6)
  , [maintenanceRequests]);

  const critical = useMemo(() =>
    maintenanceRequests.filter(r => r.status !== 'Done' && (r.daysToEnd ?? 99) <= 3)
  , [maintenanceRequests]);

  const fmtMoney = (n: number) => n.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      'New': language === 'ar' ? 'جديد' : 'New',
      'Awaiting Supervisor Approval': language === 'ar' ? 'موافقة المشرف' : 'Supv. Appr.',
      'Awaiting Manager Approval': language === 'ar' ? 'موافقة المدير' : 'Mgr. Appr.',
      'In Progress': language === 'ar' ? 'قيد التنفيذ' : 'In Progress',
      'Done': language === 'ar' ? 'مكتمل' : 'Done',
      'Rejected Supervisor': language === 'ar' ? 'مرفوض المشرف' : 'Rejected Supv.',
      'Rejected Manager': language === 'ar' ? 'مرفوض المدير' : 'Rejected Mgr.',
    };
    return labels[s] || s;
  };

  const KpiCard = ({ label, value, hint, icon, iconBg }: {
    label: string; value: string; hint?: React.ReactNode; icon: React.ReactNode; iconBg: string;
  }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 leading-none">{value}</p>
          {hint && <div className="text-[11px] mt-2">{hint}</div>}
        </div>
        <div className={`p-3 rounded-2xl ${iconBg} flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const DONUT_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="relative overflow-hidden bg-cover bg-center rounded-2xl p-6 text-white shadow-xl border border-slate-700"
        style={{
          backgroundImage: 'linear-gradient(120deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.82) 50%, rgba(41,180,196,0.35) 100%), url("https://rightcompoundimages.s3.eu-central-1.amazonaws.com/IMG_4037-1591368113693-removebg-preview.png")'
        }}
      >
        <div className="absolute -top-10 -end-10 w-52 h-52 rounded-full bg-[#29b4c4]/20 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#29b4c4]/15 border border-[#29b4c4]/40 text-cyan-300 rounded-lg text-xs font-semibold mb-2">
              <HardHat className="w-3.5 h-3.5" />
              {t.bannerTag}
            </span>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {t.bannerTitle}
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </h1>
            <p className="text-xs text-slate-300 mt-1.5">{t.bannerSub}</p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('azhar_maintenance')}
              className="px-4 py-2 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5 self-start md:self-auto"
            >
              {t.viewTickets}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label={t.totalTickets} value={String(stats.total)} hint={language === 'ar' ? 'إجمالي المسجل بالنظام' : 'registered in system'} icon={<Wrench className="w-6 h-6 text-slate-700" />} iconBg="bg-slate-100" />
        <KpiCard label={t.inProgress} value={String(stats.inProgress)} hint={language === 'ar' ? 'فريق الصيانة يعمل عليها' : 'being worked on'} icon={<Clock className="w-6 h-6 text-cyan-600" />} iconBg="bg-cyan-50" />
        <KpiCard label={t.awaitingApproval} value={String(stats.awaiting)} hint={language === 'ar' ? 'مشرف / مدير' : 'supervisor / manager'} icon={<ShieldCheck className="w-6 h-6 text-amber-600" />} iconBg="bg-amber-50" />
        <KpiCard label={t.completed} value={String(stats.done)} hint={language === 'ar' ? 'تم الإنجاز والتسليم' : 'finished & delivered'} icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} iconBg="bg-emerald-50" />
        <KpiCard label={t.totalCost} value={fmtMoney(stats.totalCost)} hint={language === 'ar' ? 'قيمة الأعمال المقدرة' : 'estimated work value'} icon={<Banknote className="w-6 h-6 text-violet-600" />} iconBg="bg-violet-50" />
        <KpiCard label={t.activeTechnicians} value={String(stats.activeTechs)} hint={language === 'ar' ? 'خارج الإجازات' : 'not on leave'} icon={<UserCheck className="w-6 h-6 text-blue-600" />} iconBg="bg-blue-50" />
      </div>

      {/* Critical deadline alert */}
      {critical.length > 0 && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-4">
          <div className="p-2.5 bg-rose-100 rounded-xl flex-shrink-0 animate-pulse">
            <Flame className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-xs text-rose-900 min-w-0 flex-1">
            <p className="font-bold text-rose-950 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t.critical} — {critical.length} {language === 'ar' ? 'طلبات' : 'tickets'}
            </p>
            <p className="text-rose-700 mt-0.5">{t.criticalDesc}</p>
          </div>
          <div className="flex-shrink-0 flex flex-wrap gap-1.5 justify-end">
            {critical.slice(0, 3).map(r => (
              <span key={r.id} className="px-2 py-1 bg-white border border-rose-200 rounded-lg font-mono text-[10px] font-bold text-rose-700">
                {r.rvNo}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row 1: Pipeline Gauge + Status Donut + Tickets/Cost by Building */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Processing Pipeline — Radial gauge */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#29b4c4]" />
              {t.pipeline}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">{t.pipelineHint}</p>
          {pipelineData.filter(d => d.actual > 0).length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs">{t.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="22%" outerRadius="96%" data={pipelineData.filter(d => d.actual > 0)} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} />
                <Tooltip
                  formatter={(v: any, n: any) => {
                    const item = pipelineData.find(d => d.name === n);
                    return [String(item?.actual ?? v), language === 'ar' ? 'عدد الطلبات' : 'tickets'];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Distribution Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-[#29b4c4]" />
            {t.statusDist}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'حسب الحالة الحالية للطلبات' : 'by current request status'}</p>
          {statusDist.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs">{t.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={2}>
                  {statusDist.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, statusLabel(String(n))]} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost by Building */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-violet-500" />
            {t.costByBuilding}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{t.costByBuildingHint}</p>
          {byBuilding.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs">{t.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byBuilding} layout="vertical" barCategoryGap={10}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#29b4c4" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="building" tick={{ fontSize: 10 }} stroke="#94a3b8" width={66} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="cost" name={t.totalCost} fill="url(#costGrad)" radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2: Tickets by building area + Staff workload + Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tickets by building — area */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-cyan-500" />
            {t.tikByBuilding}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'عدد طلبات الصيانة لكل مبنى' : 'maintenance tickets count per building'}</p>
          {byBuilding.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-xs">{t.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byBuilding}>
                <defs>
                  <linearGradient id="tickGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="building" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="tickets" name={language === 'ar' ? 'طلبات' : 'tickets'} fill="url(#tickGrad)" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Staff workload */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            {t.staffWorkload}
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">{t.staffWorkloadHint}</p>
          {staffWorkload.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-xs">{t.unassigned}</div>
          ) : (
            <div className="space-y-3.5">
              {staffWorkload.map((s, i) => {
                const max = staffWorkload[0].tickets || 1;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-700 truncate">{s.name}</span>
                      <span className="font-mono font-extrabold text-slate-900">{s.tickets} <span className="text-slate-400 font-medium">{language === 'ar' ? 'طلبات' : 'tickets'}</span></span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(s.tickets / max) * 100}%`,
                          background: `linear-gradient(90deg, ${DONUT_COLORS[i % DONUT_COLORS.length]}, ${DONUT_COLORS[(i + 2) % DONUT_COLORS.length]})`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent movements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            {t.movements}
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">{t.movementsHint}</p>
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">{t.noData}</p>
            ) : (
              movements.map(m => {
                const meta = STATUS_META[m.status];
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: meta?.bg || '#f1f5f9' }}>
                        <Wrench className="w-3.5 h-3.5" style={{ color: meta?.color || '#64748b' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate max-w-[140px]">{m.workActivity}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span className="font-mono">{m.rvNo}</span>
                          <span className="text-slate-300">•</span>
                          <span>{language === 'ar' ? 'مبنى' : 'Bld'} {m.buildingNumber}/{m.unitNumber}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{ backgroundColor: meta?.bg || '#f1f5f9', color: meta?.color || '#64748b', borderColor: (meta?.color || '#64748b') + '33' }}>
                        {statusLabel(m.status)}
                      </span>
                      <p className="text-[10px] font-extrabold text-slate-800 mt-0.5 font-mono">{fmtMoney(m.totalAmount || 0)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};