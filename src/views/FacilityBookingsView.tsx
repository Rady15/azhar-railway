import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import {
  Calendar, CalendarCheck, CalendarClock, CheckCircle2, XCircle,
  Users, Clock, Plus, Search, Hourglass, ClipboardList, Trash2,
  Phone, UserRound
} from 'lucide-react';
import { Facility, FacilityBooking, FacilityBookingStatus, Tenant } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CATEGORY_META, STATUS_META, PIE_COLORS, facilityIcon, statusLabel } from './facilityUtils';
import { confirmUi, promptUi } from '../utils/uiDialog';

interface FacilityBookingsViewProps {
  facilities: Facility[];
  bookings: FacilityBooking[];
  tenants: Tenant[];
  onAddBooking: (booking: Omit<FacilityBooking, 'id' | 'bookingNo' | 'createdAt'>) => void;
  onUpdateBookingStatus: (id: string, status: FacilityBookingStatus, adminNotes?: string) => void;
  onDeleteBooking: (id: string) => void;
}

export const FacilityBookingsView: React.FC<FacilityBookingsViewProps> = ({
  facilities,
  bookings,
  tenants,
  onAddBooking,
  onUpdateBookingStatus,
  onDeleteBooking
}) => {
  const { language } = useLanguage();

  const [tab, setTab] = useState<'all' | 'Pending' | 'Approved' | 'Upcoming' | 'Past' | 'Completed'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectBooking, setRejectBooking] = useState<FacilityBooking | null>(null);

  const [bkFacility, setBkFacility] = useState('');
  const [bkTenant, setBkTenant] = useState('');
  const [bkDate, setBkDate] = useState('');
  const [bkStart, setBkStart] = useState('18:00');
  const [bkEnd, setBkEnd] = useState('22:00');
  const [bkGuests, setBkGuests] = useState(10);
  const [bkPurpose, setBkPurpose] = useState('');

  const today = new Date();

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'Pending').length;
    const approved = bookings.filter(b => b.status === 'Approved').length;
    const upcoming = bookings.filter(b => b.status === 'Approved' && new Date(b.bookingDate).getTime() >= today.getTime()).length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    const rejected = bookings.filter(b => b.status === 'Rejected').length;
    return { total, pending, approved, upcoming, completed, rejected };
  }, [bookings]);

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = { Pending: 0, Approved: 0, Rejected: 0, Cancelled: 0, Completed: 0 };
    bookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return (Object.keys(counts) as FacilityBookingStatus[])
      .filter(s => counts[s] > 0)
      .map((s, i) => ({ name: s, value: counts[s], color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [bookings]);

  const filtered = bookings.filter(b => {
    if (tab === 'Pending' && b.status !== 'Pending') return false;
    if (tab === 'Approved' && b.status !== 'Approved') return false;
    if (tab === 'Completed' && b.status !== 'Completed') return false;
    if (tab === 'Upcoming' && !(b.status === 'Approved' && new Date(b.bookingDate).getTime() >= today.getTime())) return false;
    if (tab === 'Past' && !(b.status !== 'Pending' && new Date(b.bookingDate).getTime() < today.getTime())) return false;
    const q = search.toLowerCase();
    if (q && !b.bookingNo.toLowerCase().includes(q) && !b.tenantName.toLowerCase().includes(q) && !(b.facilityName || '').toLowerCase().includes(q) && !b.unitNumber.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const facility = facilities.find(f => f.id === bkFacility);
    const tenant = tenants.find(t => t.id === bkTenant);
    onAddBooking({
      facilityId: bkFacility,
      facilityName: facility?.name || '',
      tenantId: bkTenant,
      tenantName: tenant?.name || '',
      unitNumber: tenant?.unitNumber || '',
      mobile: tenant?.mobile || '',
      bookingDate: bkDate,
      startTime: bkStart,
      endTime: bkEnd,
      guestsCount: bkGuests,
      purpose: bkPurpose,
      status: 'Pending'
    });
    setShowModal(false);
    setBkFacility(''); setBkTenant(''); setBkDate(''); setBkGuests(10); setBkPurpose('');
  };

  const handleApprove = (b: FacilityBooking) => {
    onUpdateBookingStatus(b.id, 'Approved', approveNotes || undefined);
    setApproveNotes('');
  };

  const handleReject = () => {
    if (!rejectBooking) return;
    onUpdateBookingStatus(rejectBooking.id, 'Rejected', approveNotes || '');
    setRejectBooking(null);
    setApproveNotes('');
  };

  const KpiCard = ({ label, value, hint, icon, iconBg, iconColor }: {
    label: string; value: string; hint?: React.ReactNode; icon: React.ReactNode; iconBg: string; iconColor: string;
  }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 leading-none">{value}</p>
          {hint && <div className="text-[11px] mt-2">{hint}</div>}
        </div>
        <div className={`p-3 rounded-2xl ${iconBg} flex-shrink-0`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div
        className="relative overflow-hidden bg-cover bg-center rounded-2xl p-6 text-white shadow-xl border border-slate-700"
        style={{
          backgroundImage: 'linear-gradient(120deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.82) 50%, rgba(244,63,94,0.35) 100%), url("https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1400")'
        }}
      >
        <div className="absolute -top-10 -end-10 w-52 h-52 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/15 border border-rose-400/40 text-rose-200 rounded-lg text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              {language === 'ar' ? 'حجوزات مرافق مجمع أزهار' : 'Azhar Facility Bookings'}
            </span>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {language === 'ar' ? 'حجوزات المرافق' : 'Facility Bookings'}
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xl">
              {language === 'ar'
                ? 'اعتماد أو رفض حجوزات المستأجرين، متابعة الحجوزات القادمة والسابقة وإدارة المواعيد على كل المرافق.'
                : 'Approve or reject tenant bookings, track upcoming and past bookings, and manage schedules across all facilities.'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'حجز جديد' : 'New Booking'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label={language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'} value={String(stats.total)}
          hint={language === 'ar' ? 'على جميع المرافق' : 'across all facilities'}
          icon={<ClipboardList className="w-6 h-6" />} iconBg="bg-violet-50" iconColor="text-violet-600" />
        <KpiCard label={language === 'ar' ? 'بانتظار الموافقة' : 'Awaiting Approval'} value={String(stats.pending)}
          hint={<span className="text-amber-600 font-semibold">{language === 'ar' ? 'تحتاج قرارك' : 'need your action'}</span>}
          icon={<Hourglass className="w-6 h-6" />} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <KpiCard label={language === 'ar' ? 'معتمدة' : 'Approved'} value={String(stats.approved)}
          hint={language === 'ar' ? 'موافقات سارية' : 'active approvals'}
          icon={<CheckCircle2 className="w-6 h-6" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <KpiCard label={language === 'ar' ? 'قادمة' : 'Upcoming'} value={String(stats.upcoming)}
          hint={<span className="text-cyan-600 font-semibold">{language === 'ar' ? 'حجوزات قادمة' : 'scheduled ahead'}</span>}
          icon={<CalendarClock className="w-6 h-6" />} iconBg="bg-cyan-50" iconColor="text-cyan-600" />
        <KpiCard label={language === 'ar' ? 'منتهية' : 'Completed'} value={String(stats.completed)}
          hint={language === 'ar' ? 'سابقة وتاريخية' : 'past bookings'}
          icon={<CalendarCheck className="w-6 h-6" />} iconBg="bg-slate-100" iconColor="text-slate-600" />
        <KpiCard label={language === 'ar' ? 'مرفوضة' : 'Rejected'} value={String(stats.rejected)}
          hint={language === 'ar' ? 'حجوزات مرفوضة' : 'rejected bookings'}
          icon={<XCircle className="w-6 h-6" />} iconBg="bg-rose-50" iconColor="text-rose-600" />
      </div>

      {/* Status donut */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
          <ClipboardList className="w-4 h-4 text-cyan-500" />
          {language === 'ar' ? 'توزيع حالات الحجوزات' : 'Booking Status Distribution'}
        </h2>
        <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'حسب الحالة الحالية' : 'by current status'}</p>
        {statusDist.length === 0 ? (
          <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                {statusDist.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [v, statusLabel(n as FacilityBookingStatus, language)]} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#29b4c4]" />
                {language === 'ar' ? 'سجل الحجوزات' : 'Bookings Register'}
              </h2>
              <p className="text-[11px] text-slate-500">{language === 'ar' ? 'اعتماد أو رفض حجوزات المستأجرين' : 'approve or reject tenant bookings'}</p>
            </div>
            <div className="relative">
              <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${language === 'ar' ? 'right-2.5' : 'left-2.5'}`} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={language === 'ar' ? 'بحث في الحجوزات...' : 'Search bookings...'}
                className={`py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#29b4c4] ${language === 'ar' ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3 flex-wrap border-b border-slate-100 pb-0">
            {(['all', 'Pending', 'Approved', 'Upcoming', 'Past', 'Completed'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-t-lg text-[11px] font-bold transition-colors ${tab === t ? 'bg-[#29b4c4] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {t === 'all' && (language === 'ar' ? 'الكل' : 'All')}
                {t === 'Pending' && (language === 'ar' ? 'قيد المراجعة' : 'Pending')}
                {t === 'Approved' && (language === 'ar' ? 'معتمدة' : 'Approved')}
                {t === 'Upcoming' && (language === 'ar' ? 'القادمة' : 'Upcoming')}
                {t === 'Past' && (language === 'ar' ? 'السابقة' : 'Past')}
                {t === 'Completed' && (language === 'ar' ? 'المنتهية' : 'Completed')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900">
              <tr>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono">{language === 'ar' ? 'رقم الحجز' : 'Booking No.'}</th>
                <th className="py-3 px-3 border-r border-blue-600/40">{language === 'ar' ? 'المرفق' : 'Facility'}</th>
                <th className="py-3 px-3 border-r border-blue-600/40">{language === 'ar' ? 'المستأجر / الوحدة' : 'Tenant / Unit'}</th>
                <th className="py-3 px-3 border-r border-blue-600/40">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center">{language === 'ar' ? 'الضيوف' : 'Guests'}</th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">{language === 'ar' ? 'لا توجد حجوزات مطابقة' : 'No matching bookings'}</td>
                </tr>
              ) : (
                filtered.map(b => {
                  const sm = STATUS_META[b.status];
                  const fm = facilities.find(f => f.id === b.facilityId);
                  const fc = CATEGORY_META[fm?.category || ''] || CATEGORY_META.Hall;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#1a7f8b] border-l border-slate-100">{b.bookingNo}</td>
                      <td className="py-3 px-3 border-l border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg" style={{ backgroundColor: fc.bg }}>
                            {facilityIcon(fc.icon, 'w-3.5 h-3.5')}
                          </span>
                          <span className="font-semibold text-slate-800">{b.facilityName || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 border-l border-slate-100">
                        <div className="font-semibold text-slate-800">{b.tenantName}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <UserRound className="w-3 h-3" />#{b.unitNumber}
                          {b.mobile && <><span className="text-slate-300">•</span><Phone className="w-3 h-3" />{b.mobile}</>}
                        </div>
                      </td>
                      <td className="py-3 px-3 border-l border-slate-100">
                        <div className="font-bold text-slate-800 font-mono">{b.bookingDate}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{b.startTime} - {b.endTime}</div>
                      </td>
                      <td className="py-3 px-3 text-center border-l border-slate-100 font-bold text-slate-800">{b.guestsCount}</td>
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ backgroundColor: sm.bg, color: sm.color, borderColor: sm.color + '44' }}>
                          {statusLabel(b.status, language)}
                        </span>
                        {b.adminNotes && (
                          <div className="text-[9px] text-slate-400 mt-1 italic max-w-[120px] truncate" title={b.adminNotes}>{b.adminNotes}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {b.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(b)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {language === 'ar' ? 'اعتماد' : 'Approve'}
                              </button>
                              <button
                                onClick={() => { setRejectBooking(b); setApproveNotes(''); }}
                                className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                {language === 'ar' ? 'رفض' : 'Reject'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={async () => { const ok = await confirmUi({ title: language === 'ar' ? 'حذف الحجز' : 'Delete booking', message: language === 'ar' ? `هل تريد حذف الحجز ${b.bookingNo}؟` : `Delete booking ${b.bookingNo}?`, confirmText: language === 'ar' ? 'حذف' : 'Delete', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' }); if (ok) onDeleteBooking(b.id); }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md transition-colors"
                            title={language === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#29b4c4]" />
                {language === 'ar' ? 'حجز مرفق جديد' : 'New Facility Booking'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'المرفق' : 'Facility'}</label>
                  <select required value={bkFacility} onChange={e => setBkFacility(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium">
                    <option value="">{language === 'ar' ? '-- اختر المرفق --' : '-- Select facility --'}</option>
                    {facilities.filter(f => f.isAvailable).map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.capacityLimit} {language === 'ar' ? 'ضيف' : 'guests'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'المستأجر' : 'Tenant'}</label>
                  <select required value={bkTenant} onChange={e => setBkTenant(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium">
                    <option value="">{language === 'ar' ? '-- اختر المستأجر --' : '-- Select tenant --'}</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (#{t.unitNumber})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                  <input type="date" required value={bkDate} onChange={e => setBkDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'من' : 'From'}</label>
                  <input type="time" value={bkStart} onChange={e => setBkStart(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'إلى' : 'To'}</label>
                  <input type="time" value={bkEnd} onChange={e => setBkEnd(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'عدد الضيوف' : 'Guests Count'}</label>
                  <input type="number" min={1} value={bkGuests} onChange={e => setBkGuests(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الغرض' : 'Purpose'}</label>
                  <input required value={bkPurpose} onChange={e => setBkPurpose(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-semibold rounded-xl">{language === 'ar' ? 'إرسال الحجز' : 'Submit Booking'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                {language === 'ar' ? `رفض الحجز ${rejectBooking.bookingNo}` : `Reject ${rejectBooking.bookingNo}`}
              </h3>
              <button onClick={() => setRejectBooking(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>
            <p className="text-xs text-slate-600">{language === 'ar' ? 'أضف سبب الرفض (اختياري) ليظهر للمستأجر:' : 'Add a rejection reason (optional) shown to the tenant:'}</p>
            <textarea rows={3} value={approveNotes} onChange={e => setApproveNotes(e.target.value)} placeholder={language === 'ar' ? 'مثال: المرفق محجوز في هذا التوقيت...' : 'e.g. facility is already booked at this time...'} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setRejectBooking(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleReject} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl">{language === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
