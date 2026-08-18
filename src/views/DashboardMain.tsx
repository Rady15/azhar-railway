import React from 'react';
import { 
  Building2, 
  Home, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Contract, DueItem, Unit, PaymentRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DashboardMainProps {
  units: Unit[];
  contracts: Contract[];
  dues: DueItem[];
  payments?: PaymentRecord[];
  onNavigate: (tab: any) => void;
}

export const DashboardMain: React.FC<DashboardMainProps> = ({
  units,
  contracts,
  dues,
  payments = [],
  onNavigate
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';

  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === 'Occupied').length;
  const vacantUnits = units.filter(u => u.status === 'Vacant').length;
  const maintenanceUnits = units.filter(u => u.status === 'Maintenance' || u.status === 'Blocked').length;
  const occupancyRate = Math.round((occupiedUnits / (totalUnits || 1)) * 100);

  // Revenue math
  const totalAnnualRevenue = contracts
    .filter(c => c.status === 'Active' && !c.isArchived)
    .reduce((sum, c) => sum + (Number(c.annualRent || 0) + Number(c.waterYearlyBill || 0)), 0);

  const totalOverdueDues = dues
    .filter(d => d.status === 'Overdue')
    .reduce((sum, d) => sum + d.rentValue, 0);

  // Data for Occupancy chart (grouped by real unit type)
  const typeMap = new Map<string, { type: string; Occupied: number; Vacant: number; Total: number }>();
  units.forEach(u => {
    const key = u.type || 'Appartment';
    if (!typeMap.has(key)) {
      typeMap.set(key, { type: key, Occupied: 0, Vacant: 0, Total: 0 });
    }
    const group = typeMap.get(key)!;
    group.Total += 1;
    if (u.status === 'Occupied') group.Occupied += 1;
    else if (u.status === 'Vacant') group.Vacant += 1;
  });
  const occupancyData = Array.from(typeMap.values());

  const pieData = [
    { name: isAr ? 'مؤجرة' : 'Occupied', value: occupiedUnits, color: '#10b981' },
    { name: isAr ? 'متاحة' : 'Vacant', value: vacantUnits, color: '#f43f5e' },
    { name: isAr ? 'صيانة' : 'Maintenance', value: maintenanceUnits, color: '#f59e0b' }
  ].filter(entry => entry.value > 0);

  // Monthly Revenue collection chart (real payments when available)
  const monthLabels = isAr
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = monthLabels.map((month, idx) => {
    const collected = payments
      .filter(p => p.month === idx + 1)
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      month,
      Collected: collected,
      Projected: totalAnnualRevenue > 0 ? Math.round(totalAnnualRevenue / 12) : 0
    };
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="bg-cover bg-center rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700"
        style={{
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.88)), url("https://manage.isleblue.co/uploads/villas/images/2924/antigua-villa-nicobar-2016-004.jpg")'
        }}
      >
        <div>
          <span className="inline-block px-2.5 py-1 bg-[#29b4c4]/20 border border-[#29b4c4]/40 text-cyan-300 rounded-lg text-xs font-semibold mb-2">
            {isAr ? 'لوحة التحكم التنفيذية للنظام' : 'System Executive Dashboard'}
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAr ? 'نظرة عامة على مجمع أزهار السكني' : 'AZ System Overview'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {isAr 
              ? 'متابعة حية لنسب الإشغال، تحصيل العائدات الإيجارية، وتوفر الوحدات السكنية عبر مجمع أزهار.' 
              : 'Live occupancy stats, rental revenue collection tracking, and compound unit availability across Daar Residence & Meadow Park Garden.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('dashboard_dues')}
            className="px-4 py-2 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
          >
            {isAr ? 'عرض مستحقات الإيجار' : 'View Rent Dues'}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              {isAr ? 'إجمالي الوحدات' : 'Total Units'}
            </span>
            <div className="p-2.5 bg-cyan-50 rounded-xl text-[#29b4c4]">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{totalUnits}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{occupancyRate}% {isAr ? 'نسبة الإشغال' : 'Occupied'}</span>
              <span>{isAr ? 'في المجمع' : 'across compounds'}</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              {isAr ? 'الوحدات المؤجرة' : 'Occupied Units'}
            </span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{occupiedUnits}</div>
            <div className="text-xs text-slate-500 mt-1">
              {isAr ? 'عقود إيجار سارية' : 'Active lease contracts'}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              {isAr ? 'الوحدات المتاحة' : 'Vacant Units'}
            </span>
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{vacantUnits}</div>
            <div className="text-xs text-slate-500 mt-1">
              {isAr ? 'جاهزة للتأجير والتسكين' : 'Ready for tenant assignment'}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              {isAr ? 'إجمالي الإيجار السنوي' : 'Total Annual Rent'}
            </span>
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {totalAnnualRevenue.toLocaleString()} {isAr ? 'ر.س' : 'SR'}
            </div>
            <div className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{totalOverdueDues.toLocaleString()} {isAr ? 'ر.س مستحقات متأخرة' : 'SR Pending Dues'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Unit Occupancy Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAr ? 'توزيع الإشغال حسب نوع العقار' : 'Occupancy Breakdown by Property Type'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr ? 'توزيع الوحدات بين الفلل، الشقق، والمستودعات' : 'Units distribution across Villas, Apartments & Warehouses'}
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {isAr ? 'بيانات حية' : 'Live Data'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Occupied" fill="#29b4c4" radius={[6, 6, 0, 0]} name={isAr ? 'وحدات مؤجرة' : 'Occupied Units'} />
                <Bar dataKey="Vacant" fill="#f43f5e" radius={[6, 6, 0, 0]} name={isAr ? 'وحدات متاحة' : 'Vacant Units'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Occupancy Rate Doughnut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isAr ? 'نسبة الإشغال الكلية' : 'Overall Occupancy Ratio'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr ? 'العقود السارية مقارنة بالوحدات المتاحة' : 'Current active leases vs empty spaces'}
            </p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                {isAr ? 'مؤجرة' : 'Occupied'}
              </span>
              <span className="text-xs font-bold text-emerald-600">{occupiedUnits} {isAr ? 'وحدة' : 'Units'}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                {isAr ? 'متاحة' : 'Vacant'}
              </span>
              <span className="text-xs font-bold text-rose-600">{vacantUnits} {isAr ? 'وحدة' : 'Units'}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                {isAr ? 'صيانة' : 'Maint.'}
              </span>
              <span className="text-xs font-bold text-amber-600">{maintenanceUnits} {isAr ? 'وحدة' : 'Units'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Forecast Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isAr ? 'التحصيلات الإيجارية الشهرية (ريال سعودي)' : 'Monthly Rental Collections (SAR)'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr ? 'المبالغ المحصلة الفعلية مقارنة بجدول الدفعات المتوقع' : 'Collected amounts vs Projected rent schedule'}
            </p>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val/1000}k`} />
              <Tooltip 
                formatter={(value: any) => [`${Number(value).toLocaleString()} ${isAr ? 'ر.س' : 'SR'}`, '']}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Collected" fill="#0d9488" radius={[4, 4, 0, 0]} name={isAr ? 'المحصل (ر.س)' : 'Collected SAR'} />
              <Bar dataKey="Projected" fill="#cbd5e1" radius={[4, 4, 0, 0]} name={isAr ? 'المتوقع (ر.س)' : 'Projected Schedule'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
