import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import {
  Building2, Users, Calendar, Clock, MapPin, Plus, Search, Trash2, Edit3,
  CheckCircle2, HeartHandshake
} from 'lucide-react';
import { Facility, FacilityBooking } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CATEGORY_META, facilityIcon, catLabel } from './facilityUtils';
import { confirmUi, promptUi } from '../utils/uiDialog';
import { MediaUploadField } from '../components/MediaUploadField';

interface FacilitiesViewProps {
  facilities: Facility[];
  bookings: FacilityBooking[];
  onAddFacility: (facility: Omit<Facility, 'id'>) => void;
  onUpdateFacility: (facility: Facility) => void;
  onDeleteFacility: (id: string) => void;
}

export const FacilitiesView: React.FC<FacilitiesViewProps> = ({
  facilities,
  bookings,
  onAddFacility,
  onUpdateFacility,
  onDeleteFacility
}) => {
  const { language } = useLanguage();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);

  const [fName, setFName] = useState('');
  const [fNameEn, setFNameEn] = useState('');
  const [fCategory, setFCategory] = useState('Hall');
  const [fLocation, setFLocation] = useState('');
  const [fHours, setFHours] = useState('10:00 - 22:00');
  const [fCapacity, setFCapacity] = useState(50);
  const [fDesc, setFDesc] = useState('');
  const [fAvailable, setFAvailable] = useState(true);
  const [fImage, setFImage] = useState('');
  const [fImageMediaId, setFImageMediaId] = useState('');

  const stats = useMemo(() => {
    const total = facilities.length;
    const available = facilities.filter(f => f.isAvailable).length;
    const totalCapacity = facilities.reduce((s, f) => s + (f.capacityLimit || 0), 0);
    const approvedGuests = bookings.filter(b => b.status === 'Approved' || b.status === 'Completed')
      .reduce((s, b) => s + b.guestsCount, 0);
    const pct = totalCapacity > 0 ? Math.min(100, Math.round((approvedGuests / totalCapacity) * 100)) : 0;
    return { total, available, totalCapacity, approvedGuests, pct };
  }, [facilities, bookings]);

  const utilByFacility = useMemo(() => facilities.map(f => {
    const approved = bookings.filter(b => b.facilityId === f.id && (b.status === 'Approved' || b.status === 'Completed'));
    const utilization = f.capacityLimit && f.capacityLimit > 0
      ? Math.min(100, Math.round((approved.reduce((s, b) => s + b.guestsCount, 0) / f.capacityLimit) * 100))
      : 0;
    return { id: f.id, name: f.name, cap: f.capacityLimit || 0, utilization, approved: approved.length };
  }), [facilities, bookings]);

  const filtered = facilities.filter(f => {
    if (catFilter !== 'all' && f.category !== catFilter) return false;
    const q = search.toLowerCase();
    if (q && !f.name.toLowerCase().includes(q) && !f.nameEn.toLowerCase().includes(q) && !f.location.toLowerCase().includes(q)) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Facility, 'id'> = {
      name: fName,
      nameEn: fNameEn || fName,
      category: fCategory as Facility['category'],
      iconName: CATEGORY_META[fCategory]?.icon || 'Building2',
      description: fDesc,
      location: fLocation,
      operatingHours: fHours,
      capacityLimit: fCapacity,
      isAvailable: fAvailable,
      image: fImage || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=600',
      imageMediaId: fImageMediaId || undefined
    };
    if (editing) {
      onUpdateFacility({ ...editing, ...payload });
    } else {
      onAddFacility(payload);
    }
    setShowModal(false);
    setEditing(null);
    setFName(''); setFNameEn(''); setFCategory('Hall'); setFLocation('');
    setFHours('10:00 - 22:00'); setFCapacity(50); setFDesc(''); setFAvailable(true); setFImage(''); setFImageMediaId('');
  };

  const openEdit = (f: Facility) => {
    setEditing(f);
    setFName(f.name); setFNameEn(f.nameEn); setFCategory(f.category); setFLocation(f.location);
    setFHours(f.operatingHours); setFCapacity(f.capacityLimit || 50); setFDesc(f.description); setFAvailable(f.isAvailable); setFImage(f.image || ''); setFImageMediaId(f.imageMediaId || '');
    setShowModal(true);
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
          backgroundImage: 'linear-gradient(120deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.82) 50%, rgba(41,180,196,0.35) 100%), url("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1400")'
        }}
      >
        <div className="absolute -top-10 -end-10 w-52 h-52 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 rounded-lg text-xs font-semibold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'مرافق مجمع أزهار' : 'Azhar Facilities'}
            </span>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {language === 'ar' ? 'المرافق' : 'Facilities'}
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xl">
              {language === 'ar'
                ? 'قاعات الأفراح، المسابح، الجيم، مناطق الشواء والمطاعم — بيانات المرافق، توفرها، سعتها ونسب استيعابها.'
                : 'Wedding halls, pools, gym, BBQ areas and restaurants — facility data, availability, capacity and utilization.'}
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="px-4 py-2 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'مرفق جديد' : 'New Facility'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={language === 'ar' ? 'إجمالي المرافق' : 'Total Facilities'} value={String(stats.total)}
          hint={language === 'ar' ? 'مرافق في المجمع' : 'facilities in compound'}
          icon={<Building2 className="w-6 h-6" />} iconBg="bg-cyan-50" iconColor="text-cyan-600" />
        <KpiCard label={language === 'ar' ? 'متاح للحجز' : 'Available'} value={String(stats.available)}
          hint={<span className="text-emerald-600 font-semibold">{language === 'ar' ? 'جاهزة الآن' : 'ready now'}</span>}
          icon={<CheckCircle2 className="w-6 h-6" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <KpiCard label={language === 'ar' ? 'إجمالي السعة' : 'Total Capacity'} value={String(stats.totalCapacity)}
          hint={language === 'ar' ? 'ضيف على جميع المرافق' : 'guests across facilities'}
          icon={<Users className="w-6 h-6" />} iconBg="bg-violet-50" iconColor="text-violet-600" />
        <KpiCard label={language === 'ar' ? 'نسبة الاستيعاب' : 'Utilization'} value={`${stats.pct}%`}
          hint={<span className="text-cyan-600 font-semibold">{stats.approvedGuests} {language === 'ar' ? 'ضيف معتمد' : 'guests approved'}</span>}
          icon={<HeartHandshake className="w-6 h-6" />} iconBg="bg-amber-50" iconColor="text-amber-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-rose-500" />
            {language === 'ar' ? 'نسب استيعاب المرافق' : 'Facility Utilization'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'الضيوف المعتمدون مقابل السعة' : 'approved guests vs capacity'}</p>
          {utilByFacility.length === 0 ? (
            <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={utilByFacility} layout="vertical" barCategoryGap={6}>
                <defs>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#29b4c4" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} stroke="#94a3b8" width={96} />
                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="utilization" name={language === 'ar' ? 'الاستيعاب' : 'utilization'} fill="url(#utilGrad)" radius={[0, 8, 8, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-500" />
            {language === 'ar' ? 'الاستيعاب الإجمالي' : 'Overall Utilization'}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">{language === 'ar' ? 'نسبة استيعاب كل المرافق' : 'aggregate across facilities'}</p>
          <ResponsiveContainer width="100%" height={190}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="35%" outerRadius="100%" data={[{ name: 'util', value: stats.pct, fill: stats.pct > 75 ? '#10b981' : stats.pct > 45 ? '#f59e0b' : '#06b6d4' }]} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={12} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-center text-2xl font-extrabold -mt-4" style={{ color: stats.pct > 75 ? '#10b981' : stats.pct > 45 ? '#f59e0b' : '#06b6d4' }}>{stats.pct}%</p>
          <p className="text-center text-[11px] text-slate-500 mt-1">
            {stats.approvedGuests} {language === 'ar' ? 'ضيف من' : 'guests of'} {stats.totalCapacity} {language === 'ar' ? 'مقعد' : 'seats'}
          </p>
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#29b4c4]" />
              {language === 'ar' ? 'قائمة المرافق' : 'Facilities List'}
            </h2>
            <p className="text-[11px] text-slate-500">{language === 'ar' ? 'إدارة بيانات المرافق وتوفرها' : 'manage facility data and availability'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${language === 'ar' ? 'right-2.5' : 'left-2.5'}`} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={language === 'ar' ? 'بحث عن مرفق...' : 'Search facility...'}
                className={`py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#29b4c4] ${language === 'ar' ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
              />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <option value="all">{language === 'ar' ? 'كل الفئات' : 'All categories'}</option>
              {Object.keys(CATEGORY_META).map(c => (
                <option key={c} value={c}>{catLabel(c, language)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center text-slate-400 text-xs py-10">{language === 'ar' ? 'لا توجد مرافق مطابقة' : 'No matching facilities'}</p>
          ) : (
            filtered.map(f => {
              const meta = CATEGORY_META[f.category] || CATEGORY_META.Hall;
              const util = utilByFacility.find(u => u.id === f.id);
              const utilPct = util?.utilization || 0;
              return (
                <div key={f.id} className="group border border-slate-200 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow">
                  <div className="relative h-28 bg-cover bg-center" style={{ backgroundImage: `url("${f.image}")` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                    <span
                      className={`absolute top-2 ${language === 'ar' ? 'right-2' : 'left-2'} px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1`}
                      style={{ backgroundColor: meta.bg, color: meta.color, borderColor: meta.color + '44' }}
                    >
                      {facilityIcon(meta.icon, 'w-3 h-3')}
                      {catLabel(f.category, language)}
                    </span>
                    {f.isAvailable ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white">
                        {language === 'ar' ? 'متاح' : 'Available'}
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/90 text-white">
                        {language === 'ar' ? 'غير متاح' : 'Closed'}
                      </span>
                    )}
                    <div className="absolute bottom-2 left-3 right-3">
                      <p className="font-bold text-sm text-white leading-tight">{f.name}</p>
                      <p className="text-[10px] text-slate-300">{f.nameEn}</p>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-cyan-500" />{f.operatingHours}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3 text-violet-500" />{f.capacityLimit || '—'} {language === 'ar' ? 'ضيف' : 'guests'}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-500">{language === 'ar' ? 'نسبة الاستيعاب' : 'Utilization'}</span>
                        <span className="font-bold text-slate-800">{utilPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${utilPct}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(f)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                          title={language === 'ar' ? 'تعديل' : 'Edit'}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => { const ok = await confirmUi({ title: language === 'ar' ? 'حذف المرفق' : 'Delete facility', message: language === 'ar' ? `هل تريد حذف المرفق ${f.name}؟` : `Delete ${f.name}?`, confirmText: language === 'ar' ? 'حذف' : 'Delete', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' }); if (ok) onDeleteFacility(f.id); }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                          title={language === 'ar' ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Facility Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#29b4c4]" />
                {editing
                  ? (language === 'ar' ? 'تعديل المرفق' : 'Edit Facility')
                  : (language === 'ar' ? 'مرفق جديد' : 'New Facility')}
              </h3>
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}</label>
                  <input required value={fName} onChange={e => setFName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'}</label>
                  <input value={fNameEn} onChange={e => setFNameEn(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الفئة' : 'Category'}</label>
                  <select value={fCategory} onChange={e => setFCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium">
                    {Object.keys(CATEGORY_META).map(c => <option key={c} value={c}>{catLabel(c, language)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الموقع' : 'Location'}</label>
                  <input value={fLocation} onChange={e => setFLocation(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>
              <MediaUploadField
                label={language === 'ar' ? 'صورة المرفق' : 'Facility Image'}
                category="facility-image" entityType="facility" entityId={editing?.id}
                value={fImage} imageOnly accept="image/jpeg,image/png,image/webp"
                onUploaded={({url,id}) => { setFImage(url); setFImageMediaId(id); }}
                onClear={() => { setFImage(''); setFImageMediaId(''); }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'ساعات العمل' : 'Operating Hours'}</label>
                  <input value={fHours} onChange={e => setFHours(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'السعة (ضيوف)' : 'Capacity (guests)'}</label>
                  <input type="number" min={1} value={fCapacity} onChange={e => setFCapacity(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                <textarea rows={2} value={fDesc} onChange={e => setFDesc(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={fAvailable} onChange={e => setFAvailable(e.target.checked)} className="w-4 h-4 accent-[#29b4c4]" />
                <span className="font-semibold text-slate-700">{language === 'ar' ? 'متاح للحجز' : 'Available for booking'}</span>
              </label>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-semibold rounded-xl">{language === 'ar' ? 'حفظ' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
