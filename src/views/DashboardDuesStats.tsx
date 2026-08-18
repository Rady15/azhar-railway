import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Banknote, TrendingUp, TrendingDown, Percent, ArrowUpRight, CheckCircle2,
  Clock, AlertTriangle, Receipt, CalendarClock, Sparkles, CircleDollarSign, Wallet, Landmark
} from 'lucide-react';
import { Contract, DueItem, PaymentRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DashboardDuesStatsProps {
  dues?: DueItem[];
  contracts?: Contract[];
  payments?: PaymentRecord[];
  onNavigate?: (tab: string) => void;
}

const DONUT_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];
const getNextPayment = (c: Contract) => {
  const fallback=(c.installments||[]).filter((i:any)=>Number(i.paidAmount||0)<Number(i.amount??i.originalAmount??0)&&i.status!=='Cancelled').sort((a:any,b:any)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')))[0]?.dueDate;
  const raw=c.nextPaymentDate||fallback; if(!raw)return {date:'',days:undefined as number|undefined};
  const str=String(raw),m=str.match(/(\d{4})-(\d{2})-(\d{2})/);
  const date=m?`${m[1]}-${m[2]}-${m[3]}`:(()=>{const t=Date.parse(str);return Number.isFinite(t)?new Date(t).toISOString().slice(0,10):''})();
  if(!date)return {date:'',days:undefined as number|undefined};
  const now=new Date(),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()),[y,mo,d]=date.split('-').map(Number),due=Date.UTC(y,mo-1,d);
  return {date,days:Math.round((due-today)/86400000)};
};


export const DashboardDuesStats: React.FC<DashboardDuesStatsProps> = ({
  dues = [],
  contracts = [],
  payments = [],
  onNavigate
}) => {
  const { language } = useLanguage();

  const monthNames = language === 'ar'
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const stats = useMemo(() => {
    const totalAnnualRent = contracts.reduce((s, c) => s + Number(c.annualRent || 0) + Number(c.waterYearlyBill || 0), 0);
    const totalPaid = contracts.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const totalRemaining = contracts.reduce((s, c) => s + (c.remainingAmount || 0), 0);
    const activeContracts = contracts.filter(c => c.status === 'Active').length;
    const expiringSoon = contracts.filter(c => {
      if (!c.leaseEndDate) return false;
      const d = new Date(c.leaseEndDate.replace(/\//g, '-'));
      if (isNaN(d.getTime())) return false;
      const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 3600 * 24));
      return days >= 0 && days <= 60;
    }).length;
    const collectionRate = totalAnnualRent > 0 ? Math.round((totalPaid / totalAnnualRent) * 100) : 0;

    return { totalAnnualRent, totalPaid, totalRemaining, activeContracts, expiringSoon, collectionRate };
  }, [contracts]);

  const monthlyData = useMemo(() => {
    const projected = contracts.length > 0 ? Math.round((stats.totalAnnualRent / 12)) : 0;
    const collectedByMonth: number[] = Array(12).fill(0);
    payments.forEach(p => {
      if (p.month && p.month >= 1 && p.month <= 12) {
        collectedByMonth[p.month - 1] += p.amount || 0;
      } else if (p.paymentDate) {
        const d = new Date(p.paymentDate);
        if (!isNaN(d.getTime())) collectedByMonth[d.getMonth()] += p.amount || 0;
      }
    });
    contracts.forEach(c => {
      (c.installments || []).forEach(inst => {
        if (inst.status === 'Paid' && inst.paidDate) {
          const d = new Date(inst.paidDate);
          if (!isNaN(d.getTime())) collectedByMonth[d.getMonth()] += inst.amount || 0;
        }
      });
    });
    return monthNames.map((m, i) => ({
      name: m,
      Projected: projected,
      Collected: Math.round(collectedByMonth[i])
    }));
  }, [contracts, payments, stats.totalAnnualRent, monthNames]);

  const duesStatus = useMemo(() => {
    const paid = dues.filter(d => d.status === 'Paid').length;
    const dueSoon = dues.filter(d => d.status === 'Due Soon').length;
    const overdue = dues.filter(d => d.status === 'Overdue').length;
    return [
      { name: language === 'ar' ? 'مدفوع' : 'Paid', value: paid, color: '#10b981' },
      { name: language === 'ar' ? 'قريب الاستحقاق' : 'Due Soon', value: dueSoon, color: '#f59e0b' },
      { name: language === 'ar' ? 'متأخر' : 'Overdue', value: overdue, color: '#ef4444' }
    ].filter(x => x.value > 0);
  }, [dues, language]);

  const collectionGauge = useMemo(() => {
    const max = Math.max(stats.collectionRate, 1);
    return [{
      name: language === 'ar' ? 'نسبة التحصيل' : 'Collection Rate',
      value: max,
      fill: max > 75 ? '#10b981' : max > 50 ? '#f59e0b' : '#ef4444'
    }];
  }, [stats.collectionRate, language]);

  const topOutstanding = useMemo(() =>
    [...contracts]
      .filter(c => (c.remainingAmount || 0) > 0)
      .sort((a, b) => (b.remainingAmount || 0) - (a.remainingAmount || 0))
      .slice(0, 8)
      .map(c => ({
        name: language === 'ar'
          ? `${(c.tenantName || '').split(' ').slice(0, 2).join(' ')} / ${c.unitNumber}`
          : `${c.unitNumber} · ${c.tenantName || ''}`,
        value: c.remainingAmount || 0
      }))
  , [contracts, language]);

  const upcomingPayments = useMemo(() => [...contracts].map(c=>({c,next:getNextPayment(c)})).filter(x=>x.next.date&&x.next.days!==undefined&&Number(x.c.remainingAmount||0)>0).sort((a,b)=>a.next.days!-b.next.days!).slice(0,10).map(x=>({name:language==='ar'?`${x.c.tenantName||'بدون اسم'} / ${x.c.unitNumber} · ${x.next.date}`:`${x.c.unitNumber} · ${x.c.tenantName||''} · ${x.next.date}`,days:x.next.days!,amount:Number(x.c.remainingAmount||0),date:x.next.date})), [contracts,language]);
  const overduePayments = useMemo(() => upcomingPayments.filter(x=>x.days<0).sort((a,b)=>a.days-b.days).slice(0,8).map(x=>({...x,overdueDays:Math.abs(x.days)})), [upcomingPayments]);

  const movements = useMemo(() => {
    const rows: any[] = [];
    contracts.forEach(c => {
      (c.installments || []).forEach(inst => {
        if (inst.status === 'Paid' && (inst.paidDate || inst.receiptNo)) {
          rows.push({
            id: `${c.id}-${inst.id}`,
            date: inst.paidDate || '',
            tenantName: c.tenantName,
            unitNumber: c.unitNumber,
            amount: inst.amount || 0,
            receiptNo: inst.receiptNo || '—',
            method: inst.paymentMethod || ''
          });
        }
      });
    });
    payments.forEach(p => {
      rows.push({
        id: `pay-${p.id}`,
        date: p.paymentDate || '',
        tenantName: p.tenantName,
        unitNumber: p.unitNumber,
        amount: p.amount || 0,
        receiptNo: '—',
        method: p.paymentMethod || ''
      });
    });
    return rows
      .filter(r => r.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [contracts, payments]);

  const fmtMoney = (n: number) => n.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');

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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="relative overflow-hidden bg-cover bg-center rounded-2xl p-6 text-white shadow-xl border border-slate-700"
        style={{
          backgroundImage: 'linear-gradient(120deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.82) 50%, rgba(41,180,196,0.35) 100%), url("https://manage.isleblue.co/uploads/villas/images/2924/antigua-villa-nicobar-2016-004.jpg")'
        }}
      >
        <div className="absolute -top-10 -end-10 w-52 h-52 rounded-full bg-[#29b4c4]/20 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#29b4c4]/15 border border-[#29b4c4]/40 text-cyan-300 rounded-lg text-xs font-semibold mb-2">
              <Landmark className="w-3.5 h-3.5" />
              {language === 'ar' ? 'لوحة المستحقات والإيجارات' : 'Dues & Rents Operations'}
            </span>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {language === 'ar' ? 'تحليلات العائدات الإيجارية' : 'Rental Revenue Analytics'}
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xl">
              {language === 'ar'
                ? 'مراقبة حية للعائدات الإيجارية، نسب التحصيل، المستحقات المتبقية، وحركات السداد عبر مجمع أزهار.'
                : 'Live rental revenue, collection rates, outstanding balances and payment movements across Azhar Residence.'}
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('azhar_collections')}
              className="px-4 py-2 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5 self-start md:self-auto"
            >
              {language === 'ar' ? 'سجل التحصيلات' : 'View Collections'}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={language === 'ar' ? 'إجمالي الإيجار السنوي' : 'Total Annual Rent'}
          value={fmtMoney(stats.totalAnnualRent)}
          hint={<span className="text-emerald-600 font-semibold">{language === 'ar' ? `${stats.activeContracts} عقد ساري` : `${stats.activeContracts} active contracts`}</span>}
          icon={<CircleDollarSign className="w-6 h-6 text-cyan-600" />}
          iconBg="bg-cyan-50"
        />
        <KpiCard
          label={language === 'ar' ? 'المبالغ المحصلة' : 'Amount Collected'}
          value={fmtMoney(stats.totalPaid)}
          hint={<span className="text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp className="w-3 h-3" />{language === 'ar' ? 'إجمالي السداد' : 'total payments'}</span>}
          icon={<Wallet className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <KpiCard
          label={language === 'ar' ? 'المستحقات المتبقية' : 'Outstanding Dues'}
          value={fmtMoney(stats.totalRemaining)}
          hint={<span className="text-rose-600 font-semibold flex items-center gap-1"><TrendingDown className="w-3 h-3" />{language === 'ar' ? 'غير محصلة بعد' : 'uncollected'}</span>}
          icon={<AlertTriangle className="w-6 h-6 text-rose-600" />}
          iconBg="bg-rose-50"
        />
        <KpiCard
          label={language === 'ar' ? 'نسبة التحصيل' : 'Collection Rate'}
          value={`${stats.collectionRate}%`}
          hint={<span className="text-violet-600 font-semibold flex items-center gap-1"><Percent className="w-3 h-3" />{language === 'ar'
            ? stats.expiringSoon > 0 ? `${stats.expiringSoon} عقد قرب الانتهاء` : 'من إجمالي العائدات'
            : stats.expiringSoon > 0 ? `${stats.expiringSoon} contracts expiring` : 'of total revenue'}</span>}
          icon={<Percent className="w-6 h-6 text-violet-600" />}
          iconBg="bg-violet-50"
        />
      </div>

      {/* Expiring contracts alert */}
      {stats.expiringSoon > 0 && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <div className="p-2.5 bg-amber-100 rounded-xl flex-shrink-0 animate-pulse">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-xs text-amber-900 min-w-0 flex-1">
            <p className="font-bold text-amber-950 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              {language === 'ar' ? `${stats.expiringSoon} عقد قربت تنتهي خلال 60 يوم` : `${stats.expiringSoon} contracts expiring within 60 days`}
            </p>
            <p className="text-amber-700 mt-0.5">
              {language === 'ar' ? 'راجع قسم العقود لتجديدها في الوقت المناسب.' : 'Review the contracts section to renew them on time.'}
            </p>
          </div>
        </div>
      )}

      {/* Charts Row 1: Collection gauge + Monthly revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Collection rate radial gauge */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-[#29b4c4]" />
            {language === 'ar' ? 'مقياس نسبة التحصيل' : 'Collection Rate Gauge'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'من إجمالي العائدات السنوية' : 'of total annual revenue'}</p>
          <ResponsiveContainer width="100%" height={230}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" data={collectionGauge} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={12} />
              <Tooltip formatter={(v: any) => [`${v}%`, language === 'ar' ? 'نسبة التحصيل' : 'collection rate']} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-center text-2xl font-extrabold text-slate-900 -mt-4" style={{ color: collectionGauge[0].fill }}>
            {stats.collectionRate}%
          </p>
        </div>

        {/* Monthly Collection vs Projected */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-cyan-500" />
            {language === 'ar' ? 'التحصيل الشهري مقابل المتوقع' : 'Monthly Collection vs Projected'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">{language === 'ar' ? 'المبالغ بالريال السعودي' : 'Amounts in SAR'}</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthlyData} barGap={3}>
              <defs>
                <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#29b4c4" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
              <Tooltip formatter={(v: any) => fmtMoney(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Projected" name={language === 'ar' ? 'المتوقع' : 'Projected'} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar dataKey="Collected" name={language === 'ar' ? 'المحصل' : 'Collected'} fill="url(#colGrad)" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Status donut + Top outstanding + Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dues Status Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-[#29b4c4]" />
            {language === 'ar' ? 'توزيع المستحقات' : 'Dues Status'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'حسب حالة الاستحقاق' : 'by due status'}</p>
          {duesStatus.length === 0 ? (
            <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={duesStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={2}>
                  {duesStatus.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Outstanding Balances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            {language === 'ar' ? 'أعلى المستحقات المتبقية' : 'Top Outstanding Balances'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'حسب العقود السارية' : 'by active contracts'}</p>
          {topOutstanding.length === 0 ? (
            <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">{language === 'ar' ? 'لا توجد مستحقات متبقية' : 'No outstanding balances'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topOutstanding} layout="vertical" barCategoryGap={8}>
                <defs>
                  <linearGradient id="outGradV" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" width={96} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" name={language === 'ar' ? 'المتبقي' : 'Remaining'} fill="url(#outGradV)" radius={[0, 8, 8, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming Payments by Tenant */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1"><CalendarClock className="w-4 h-4 text-cyan-500" />{language === 'ar' ? 'المستأجرون والدفعات القادمة' : 'Tenants & Upcoming Payments'}</h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'أقرب موعد دفع وعدد الأيام والمبلغ المتبقي' : 'Next due date, remaining days and outstanding amount'}</p>
          {upcomingPayments.length===0 ? <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">{language==='ar'?'لا توجد دفعات قادمة مسجلة':'No upcoming payments'}</div> : <ResponsiveContainer width="100%" height={230}><BarChart data={upcomingPayments} layout="vertical" margin={{left:10,right:10}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/><XAxis type="number" tick={{fontSize:9}} stroke="#94a3b8"/><YAxis type="category" dataKey="name" tick={{fontSize:9}} stroke="#94a3b8" width={125}/><Tooltip formatter={(v:any)=>[`${v} ${language==='ar'?'يوم':'days'}`,language==='ar'?'الأيام':'Days']}/><Bar dataKey="days" name={language==='ar'?'الأيام':'Days'} fill="#29b4c4" radius={[0,8,8,0]} barSize={12}/></BarChart></ResponsiveContainer>}
        </div>

        {/* Overdue Tenants */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-rose-500" />{language === 'ar' ? 'المتأخرون في الدفع' : 'Overdue Payments'}</h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'أكثر المستأجرين تأخرًا حسب الأيام' : 'Tenants ranked by overdue days'}</p>
          {overduePayments.length===0 ? <div className="h-[230px] flex items-center justify-center text-emerald-600 text-xs font-semibold">{language==='ar'?'لا توجد دفعات متأخرة 🎉':'No overdue payments 🎉'}</div> : <ResponsiveContainer width="100%" height={230}><BarChart data={overduePayments} layout="vertical" margin={{left:10,right:10}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/><XAxis type="number" tick={{fontSize:9}} stroke="#94a3b8"/><YAxis type="category" dataKey="name" tick={{fontSize:9}} stroke="#94a3b8" width={125}/><Tooltip formatter={(v:any)=>[`${v} ${language==='ar'?'يوم':'days'}`,language==='ar'?'متأخر':'Overdue']}/><Bar dataKey="overdueDays" name={language==='ar'?'أيام التأخير':'Overdue Days'} fill="#ef4444" radius={[0,8,8,0]} barSize={12}/></BarChart></ResponsiveContainer>}
        </div>

        {/* Recent Payment Movements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-emerald-500" />
            {language === 'ar' ? 'آخر حركات السداد' : 'Recent Payment Movements'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">{language === 'ar' ? 'أحدث 6 عمليات تحصيل' : 'latest 6 transactions'}</p>
          <div className="space-y-2.5 max-h-[230px] overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">{language === 'ar' ? 'لا توجد حركات سداد بعد' : 'No payment movements yet'}</p>
            ) : (
              movements.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-emerald-100 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate max-w-[140px]">{m.tenantName}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="font-mono">#{m.unitNumber}</span>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-0.5"><CalendarClock className="w-3 h-3" />{m.date.slice(0, 10)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="text-xs font-extrabold text-emerald-600">{fmtMoney(m.amount)}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{m.receiptNo}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};