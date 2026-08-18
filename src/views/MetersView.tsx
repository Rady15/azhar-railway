import React, { useMemo, useState } from 'react';
import { Droplet, Zap, Plus, Search, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import { ElectricityMeter, WaterMeter, Unit } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface MetersViewProps {
  type: 'water' | 'electricity';
  units: Unit[];
  waterMeters: WaterMeter[];
  electricityMeters: ElectricityMeter[];
  onAddWaterMeter: (meter: Omit<WaterMeter, 'id'>) => void;
  onAddElectricityMeter: (meter: Omit<ElectricityMeter, 'id'>) => void;
  onUpdateWaterMeter?: (id: string, updates: Partial<WaterMeter>) => void;
  onDeleteWaterMeter?: (id: string) => void;
  onUpdateElectricityMeter?: (id: string, updates: Partial<ElectricityMeter>) => void;
  onDeleteElectricityMeter?: (id: string) => void;
}

export const MetersView: React.FC<MetersViewProps> = ({
  type, units, waterMeters, electricityMeters,
  onAddWaterMeter, onAddElectricityMeter,
  onUpdateWaterMeter, onDeleteWaterMeter,
  onUpdateElectricityMeter, onDeleteElectricityMeter
}) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState('');
  const [meterNo, setMeterNo] = useState('');
  const [paymentNo, setPaymentNo] = useState('');
  const [lastReading, setLastReading] = useState('');
  const [readingDate, setReadingDate] = useState('');
  const [sortField, setSortField] = useState<'building'|'unitNumber'|'meterNumber'>('building');

  const selectedUnit = units.find(u => u.id === unitId);
  const sortedUnits = useMemo(() => [...units].sort((a,b) =>
    `${a.buildingNumber}-${a.unitNumber}`.localeCompare(`${b.buildingNumber}-${b.unitNumber}`, 'ar', { numeric: true })
  ), [units]);

  const resetForm = () => {
    setEditingId(null); setUnitId(''); setMeterNo(''); setPaymentNo(''); setLastReading(''); setReadingDate('');
  };
  const openAdd = () => { resetForm(); setShowModal(true); };
  const openWaterEdit = (m: WaterMeter) => {
    const unit = units.find(u => u.id === m.unitId) || units.find(u => u.unitNumber === m.unitNumber && u.buildingNumber === m.building);
    setEditingId(m.id); setUnitId(unit?.id || ''); setMeterNo(m.meterNumber);
    setLastReading(m.lastReading == null ? '' : String(m.lastReading)); setReadingDate(m.readingDate || ''); setShowModal(true);
  };
  const openElectricEdit = (m: ElectricityMeter) => {
    const unit = units.find(u => u.id === m.unitId) || units.find(u => u.unitNumber === m.unitNumber && u.buildingNumber === m.building);
    setEditingId(m.id); setUnitId(unit?.id || ''); setMeterNo(m.meterNumber); setPaymentNo(m.paymentNumber || ''); setShowModal(true);
  };

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const source: any[] = type === 'water' ? waterMeters : electricityMeters;
    return source.filter(m => !q || [m.building, m.unitNumber, m.meterNumber, m.paymentNumber].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a,b) => String(a[sortField] || '').localeCompare(String(b[sortField] || ''), 'ar', {numeric:true}));
  }, [type, waterMeters, electricityMeters, searchQuery, sortField]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    if (type === 'water') {
      const data: Omit<WaterMeter,'id'> = {
        unitId: selectedUnit.id, building: selectedUnit.buildingNumber, unitNumber: selectedUnit.unitNumber,
        meterNumber: meterNo.trim(), lastReading: lastReading === '' ? undefined : Number(lastReading), readingDate: readingDate || undefined
      };
      editingId ? onUpdateWaterMeter?.(editingId, data) : onAddWaterMeter(data);
    } else {
      const data: Omit<ElectricityMeter,'id'> = {
        unitId: selectedUnit.id, compoundId: selectedUnit.compoundId, building: selectedUnit.buildingNumber,
        unitNumber: selectedUnit.unitNumber, type: selectedUnit.type, isRented: selectedUnit.status === 'Occupied',
        meterNumber: meterNo.trim(), paymentNumber: paymentNo.trim()
      };
      editingId ? onUpdateElectricityMeter?.(editingId, data) : onAddElectricityMeter(data);
    }
    setShowModal(false); resetForm();
  };

  return <div className="space-y-6" dir={ar ? 'rtl' : 'ltr'}>
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
          {type === 'water' ? <Droplet className="w-4 h-4 text-blue-500"/> : <Zap className="w-4 h-4 text-amber-500"/>}
          <span>{ar ? 'سجل عدادات الوحدات' : 'Unit Meter Register'}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {type === 'water' ? (ar ? 'عدادات المياه' : 'Water Meters') : (ar ? 'عدادات الكهرباء' : 'Electricity Meters')}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {ar ? 'تسجيل بيانات كل عداد وربطه بالوحدة التابعة له فقط. تغيير المستأجر لا يغيّر ارتباط العداد أو ملكيته.' : 'Register each meter and link it to its unit only. Tenant changes never change the meter link or ownership.'}
        </p>
      </div>
      <button onClick={openAdd} className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2">
        <Plus className="w-4 h-4"/>{type === 'water' ? (ar?'إضافة عداد مياه':'Add Water Meter') : (ar?'إضافة عداد كهرباء':'Add Electricity Meter')}
      </button>
    </div>

    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="relative max-w-md">
        <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${ar?'right-3':'left-3'}`}/>
        <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={ar?'بحث بالمبنى أو الوحدة أو رقم العداد...':'Search building, unit or meter number...'} className={`w-full py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs ${ar?'pr-9 pl-3':'pl-9 pr-3'}`}/>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-xs text-slate-700 border-collapse min-w-[760px]">
        <thead className="bg-[#2b62af] text-white text-[11px] font-semibold">
          <tr>
            <th className="py-3 px-3 text-center">#</th>
            {(['building','unitNumber','meterNumber'] as const).map(f => <th key={f} className="py-3 px-3 cursor-pointer" onClick={()=>setSortField(f)}><span className="inline-flex items-center gap-1">{f==='building'?(ar?'المبنى':'Building'):f==='unitNumber'?(ar?'الوحدة':'Unit'):(ar?'رقم العداد':'Meter Number')}<ArrowUpDown className="w-3 h-3"/></span></th>)}
            {type === 'electricity' && <th className="py-3 px-3">{ar?'رقم حساب السداد':'Payment Account'}</th>}
            {type === 'water' && <><th className="py-3 px-3">{ar?'آخر قراءة':'Last Reading'}</th><th className="py-3 px-3">{ar?'تاريخ القراءة':'Reading Date'}</th></>}
            <th className="py-3 px-3 text-center">{ar?'العمليات':'Actions'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? <tr><td colSpan={type==='water'?7:6} className="py-10 text-center text-slate-400">{ar?'لا توجد عدادات مطابقة.':'No matching meters.'}</td></tr> : rows.map((m:any,i)=><tr key={m.id} className="hover:bg-slate-50">
            <td className="py-3 px-3 text-center text-slate-400">{i+1}</td>
            <td className="py-3 px-3 font-bold">{m.building}</td>
            <td className="py-3 px-3 font-bold">{m.unitNumber}</td>
            <td className="py-3 px-3 font-mono font-bold text-[#1a7f8b]">{m.meterNumber}</td>
            {type==='electricity' && <td className="py-3 px-3 font-mono">{m.paymentNumber || '—'}</td>}
            {type==='water' && <><td className="py-3 px-3">{m.lastReading ?? '—'}</td><td className="py-3 px-3">{m.readingDate || '—'}</td></>}
            <td className="py-3 px-3"><div className="flex justify-center gap-2"><button onClick={()=>type==='water'?openWaterEdit(m):openElectricEdit(m)} className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg inline-flex gap-1 items-center"><Pencil className="w-3 h-3"/>{ar?'تعديل':'Edit'}</button><button onClick={()=>type==='water'?onDeleteWaterMeter?.(m.id):onDeleteElectricityMeter?.(m.id)} className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg inline-flex gap-1 items-center"><Trash2 className="w-3 h-3"/>{ar?'حذف':'Delete'}</button></div></td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {showModal && <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center border-b pb-3 mb-4"><h3 className="font-bold">{editingId?(ar?'تعديل بيانات العداد':'Edit Meter'):(ar?'تسجيل عداد جديد':'Register Meter')}</h3><button onClick={()=>{setShowModal(false);resetForm();}} className="text-xl text-slate-400">×</button></div>
        <form onSubmit={submit} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1">{ar?'الوحدة المرتبط بها العداد':'Linked Unit'}</label><select required value={unitId} onChange={e=>setUnitId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"><option value="">{ar?'اختر الوحدة...':'Select unit...'}</option>{sortedUnits.map(u=><option key={u.id} value={u.id}>{ar?'مبنى':'Building'} {u.buildingNumber} — {ar?'وحدة':'Unit'} {u.unitNumber}</option>)}</select></div>
          {selectedUnit && <div className="grid grid-cols-2 gap-3 bg-slate-50 border rounded-xl p-3"><div><span className="text-slate-400">{ar?'المبنى':'Building'}</span><div className="font-bold">{selectedUnit.buildingNumber}</div></div><div><span className="text-slate-400">{ar?'الوحدة':'Unit'}</span><div className="font-bold">{selectedUnit.unitNumber}</div></div></div>}
          <div><label className="block font-semibold mb-1">{ar?'رقم العداد':'Meter Number'}</label><input required value={meterNo} onChange={e=>setMeterNo(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-mono"/></div>
          {type==='electricity' && <div><label className="block font-semibold mb-1">{ar?'رقم حساب السداد':'Payment Account Number'}</label><input value={paymentNo} onChange={e=>setPaymentNo(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-mono"/></div>}
          {type==='water' && <><div><label className="block font-semibold mb-1">{ar?'آخر قراءة':'Last Reading'}</label><input type="number" step="0.001" value={lastReading} onChange={e=>setLastReading(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"/></div><div><label className="block font-semibold mb-1">{ar?'تاريخ القراءة':'Reading Date'}</label><input type="date" value={readingDate} onChange={e=>setReadingDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"/></div></>}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-blue-800">{ar?'العداد مرتبط بالوحدة نفسها وليس بالمستأجر. عند تغيير المستأجر يظل العداد كما هو على نفس الوحدة.':'The meter belongs to the unit record, not the tenant. Changing tenants does not change the meter link.'}</div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={()=>{setShowModal(false);resetForm();}} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-semibold">{ar?'إلغاء':'Cancel'}</button><button type="submit" className="flex-1 py-2.5 bg-[#29b4c4] text-white rounded-xl font-semibold">{ar?'حفظ بيانات العداد':'Save Meter'}</button></div>
        </form>
      </div>
    </div>}
  </div>;
};
