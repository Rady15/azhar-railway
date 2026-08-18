import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Plus, 
  Search, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Bed, 
  Bath, 
  Maximize, 
  Layers, 
  Users, 
  DollarSign,
  ArrowUpDown,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  X,
  History,
  FileText,
  CalendarDays
} from 'lucide-react';
import { Building, Contract, Unit } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmUi, promptUi } from '../utils/uiDialog';

interface CompoundUnitsProps {
  units: Unit[];
  buildings: Building[];
  contracts: Contract[];
  mode?: 'units' | 'non_rented' | 'buildings';
  onAddUnit: (unit: Omit<Unit, 'id'>) => void;
  onAddBuilding: (building: Omit<Building, 'id'>) => void;
  onUpdateBuilding?: (id: string, building: Partial<Building>) => void;
  onDeleteBuilding?: (id: string) => void;
  onUpdateUnit?: (id: string, unit: Partial<Unit>) => void;
  onDeleteUnit?: (id: string) => void;
  selectedCompoundId: string;
}

export const CompoundUnits: React.FC<CompoundUnitsProps> = ({
  units,
  buildings,
  contracts,
  mode = 'units',
  onAddUnit,
  onAddBuilding,
  onUpdateBuilding,
  onDeleteBuilding,
  onUpdateUnit,
  onDeleteUnit,
  selectedCompoundId
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [compoundFilter, setCompoundFilter] = useState<string>(selectedCompoundId || 'all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [viewingUnit, setViewingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  const contractsForUnit = (unit: Unit) => contracts
    .filter((c) => {
      const sameById = Boolean((c as any).houseId) && String((c as any).houseId) === String(unit.id);
      const sameUnit = String(c.unitNumber || '') === String(unit.unitNumber || '');
      const sameBuilding = !c.buildingNumber || !unit.buildingNumber || String(c.buildingNumber) === String(unit.buildingNumber);
      const sameCompound = !c.compoundId || !unit.compoundId || String(c.compoundId) === String(unit.compoundId);
      return sameById || (sameUnit && sameBuilding && sameCompound);
    })
    .sort((a, b) => String(b.leaseStartDate || '').localeCompare(String(a.leaseStartDate || '')));

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

  // Unit master-data fields. Building/area/living/majlis remain legacy backend fields but are no longer part of the unit UI.
  const [unitNumber, setUnitNumber] = useState('');
  const [rooms, setRooms] = useState(0);
  const [baths, setBaths] = useState(0);
  const [unitType, setUnitType] = useState('');
  const [isFurnished, setIsFurnished] = useState(false);
  const [annualRent, setAnnualRent] = useState(0);
  const [unitNotes, setUnitNotes] = useState('');

  // Building form states
  const [newBldNo, setNewBldNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [forFamilies, setForFamilies] = useState(true);

  // Edit unit form states
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editRooms, setEditRooms] = useState(0);
  const [editBaths, setEditBaths] = useState(0);
  const [editUnitType, setEditUnitType] = useState('Apartment');
  const [editIsFurnished, setEditIsFurnished] = useState(false);
  const [editAnnualRent, setEditAnnualRent] = useState(0);
  const [editUnitNotes, setEditUnitNotes] = useState('');

  const filteredUnits = units.filter(u => {
    if (mode === 'non_rented' && u.status !== 'Vacant') return false;
    if (compoundFilter !== 'all' && u.compoundId !== compoundFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(u.unitNumber || '').toLowerCase().includes(q) ||
        String(u.compoundName || '').toLowerCase().includes(q) ||
        String(u.type || '').toLowerCase().includes(q) ||
        String(u.electricityMeterNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sortedUnits = useMemo(() => {
    if (!sortConfig) return filteredUnits;
    return [...filteredUnits].sort((a: any, b: any) => {
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
  }, [filteredUnits, sortConfig]);

  const filteredBuildings = buildings.filter(b => {
    if (compoundFilter !== 'all' && b.compoundId !== compoundFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.buildingNo.toLowerCase().includes(q) ||
        b.remarks.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sortedBuildings = useMemo(() => {
    if (!sortConfig) return filteredBuildings;
    return [...filteredBuildings].sort((a: any, b: any) => {
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
  }, [filteredBuildings, sortConfig]);

  const selectedCompound = compoundFilter === '2'
    ? { id: '2', name: 'Meadow Park Garden' }
    : compoundFilter === '4'
      ? { id: '4', name: 'Daar Residence' }
      : { id: selectedCompoundId || '1', name: selectedCompoundId === '2' ? 'Meadow Park Garden' : selectedCompoundId === '4' ? 'Daar Residence' : 'Azhar Residence' };

  const resetAddUnitForm = () => {
    setUnitNumber('');
    setRooms(0);
    setBaths(0);
    setUnitType('');
    setIsFurnished(false);
    setAnnualRent(0);
    setUnitNotes('');
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber.trim() || !unitType || Number(annualRent) <= 0) return;
    onAddUnit({
      compoundId: selectedCompound.id,
      compoundName: selectedCompound.name,
      buildingNumber: '',
      unitNumber: unitNumber.trim(),
      rooms: Number(rooms),
      baths: Number(baths),
      living: 0,
      majlis: 0,
      area: '',
      type: unitType,
      electricityMeterNumber: '',
      isFurnished,
      notes: unitNotes.trim(),
      status: 'Vacant',
      annualRent: Number(annualRent)
    });
    setShowAddModal(false);
    resetAddUnitForm();
  };

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBuilding({
      compoundId: selectedCompound.id,
      compoundName: selectedCompound.name,
      buildingNo: newBldNo,
      remarks: remarks,
      forFamilies: forFamilies
    });
    setShowAddModal(false);
  };

  const handleViewDetails = (unit: Unit) => {
    setViewingUnit(unit);
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setEditUnitNumber(unit.unitNumber);
    setEditRooms(unit.rooms);
    setEditBaths(unit.baths);
    setEditUnitType(unit.type);
    setEditIsFurnished(Boolean(unit.isFurnished));
    setEditAnnualRent(unit.annualRent);
    setEditUnitNotes(unit.notes || '');
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    onUpdateUnit?.(editingUnit.id, {
      unitNumber: editUnitNumber.trim(),
      rooms: Number(editRooms),
      baths: Number(editBaths),
      type: editUnitType,
      isFurnished: editIsFurnished,
      notes: editUnitNotes.trim(),
      annualRent: Number(editAnnualRent)
    });
    setEditingUnit(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingUnit) return;
    onDeleteUnit?.(deletingUnit.id);
    setDeletingUnit(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
            <Home className="w-4 h-4" />
            <span>{language === 'ar' ? 'سجل العقارات والوحدات' : 'Real Estate Inventory'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {mode === 'non_rented' 
              ? (language === 'ar' ? 'الوحدات المتاحة (غير المؤجرة)' : 'Non Rented (Vacant) Units') 
              : mode === 'buildings' 
              ? (language === 'ar' ? 'دليل مباني المجمع السكني' : 'Compound Buildings Directory') 
              : (language === 'ar' ? 'دليل وحدات المجمع السكني' : 'Compound Units Directory')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'إدارة المواصفات المعمارية، عدد الغرف، المساحات، وحالة التوفر عبر المجمعات السكنية.' : 'Manage architectural specifications, room counts, area dimensions, and availability status across properties.'}
          </p>
        </div>

        <button
          onClick={() => { if (mode !== 'buildings') resetAddUnitForm(); setShowAddModal(true); }}
          className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {mode === 'buildings' ? (language === 'ar' ? 'إضافة مبنى' : 'Add Building') : (language === 'ar' ? 'إضافة وحدة' : 'Add Unit')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <select
            value={compoundFilter}
            onChange={(e) => setCompoundFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
          >
            <option value="all">{language === 'ar' ? 'جميع المجمعات السكنية' : 'All Compounds'}</option>
            <option value="1">مجمع أزهار السكني (Azhar Residence)</option>
            <option value="4">دار ريزيدنس (Daar Residence)</option>
            <option value="2">ميدو بارك جاردن (Meadow Park Garden)</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={mode === 'buildings' ? (language === 'ar' ? "بحث برقم المبنى، الملاحظات..." : "Search building number, remarks...") : (language === 'ar' ? "بحث برقم الوحدة، النوع، المواصفات..." : "Search unit number, type, specs...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
            />
          </div>
        </div>
      </div>

      {/* Content Rendering: Buildings vs Units */}
      {mode === 'buildings' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
              <tr>
                <th className="py-3 px-4 border-r border-blue-600/40 w-12 text-center">#</th>
                <th className="py-3 px-4 border-r border-blue-600/40" onClick={() => handleSort('compoundName')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المجمع السكني' : 'Compound'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-blue-600/40 font-mono" onClick={() => handleSort('buildingNo')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم المبنى' : 'Building No'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-blue-600/40" onClick={() => handleSort('remarks')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الملاحظات والوصف' : 'Remarks / Notes'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-blue-600/40 text-center" onClick={() => handleSort('forFamilies')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'خاص بالعوائل' : 'For Families'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">
                  <span>{language === 'ar' ? 'العمليات' : 'Operations'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedBuildings.map((b, idx) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 border-l border-slate-100">{b.compoundName}</td>
                  <td className="py-3 px-4 font-mono font-bold text-[#1a7f8b] border-l border-slate-100">{language === 'ar' ? `مبنى ${b.buildingNo}` : `Building ${b.buildingNo}`}</td>
                  <td className="py-3 px-4 text-slate-600 border-l border-slate-100">{b.remarks}</td>
                  <td className="py-3 px-4 text-center border-l border-slate-100">
                    {b.forFamilies ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {language === 'ar' ? 'نعم (عوائل)' : 'Yes (Families)'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {language === 'ar' ? 'عام' : 'General'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={async () => {
                          const buildingNo = await promptUi({ title: language === 'ar' ? 'تعديل المبنى' : 'Edit building', message: language === 'ar' ? 'أدخل رقم المبنى الجديد.' : 'Enter the building number.', inputLabel: language === 'ar' ? 'رقم المبنى' : 'Building number', defaultValue: b.buildingNo, confirmText: language === 'ar' ? 'التالي' : 'Next', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel' });
                          if (buildingNo === null) return;
                          const remarks = await promptUi({ title: language === 'ar' ? 'ملاحظات المبنى' : 'Building remarks', message: language === 'ar' ? 'أضف ملاحظات للمبنى أو اتركها فارغة.' : 'Add building remarks or leave empty.', inputLabel: language === 'ar' ? 'الملاحظات' : 'Remarks', defaultValue: b.remarks || '', confirmText: language === 'ar' ? 'حفظ التعديلات' : 'Save changes', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel' });
                          if (remarks === null) return;
                          onUpdateBuilding?.(b.id, { buildingNo, remarks });
                        }}
                        className="px-3 py-1 bg-[#475569] hover:bg-[#334155] text-white text-[11px] font-bold rounded-md shadow-sm transition-all"
                      >
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirmUi({ title: language === 'ar' ? 'أرشفة المبنى' : 'Archive building', message: language === 'ar' ? `هل تريد أرشفة المبنى ${b.buildingNo}؟` : `Archive building ${b.buildingNo}?`, confirmText: language === 'ar' ? 'أرشفة' : 'Archive', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'warning' });
                          if (ok) onDeleteBuilding?.(b.id);
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-md shadow-sm transition-all"
                      >
                        {language === 'ar' ? 'أرشفة' : 'Archive'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700 border-collapse">
              <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3" onClick={() => handleSort('compoundName')}>{language === 'ar' ? 'اسم المجمع' : 'Compound'}</th>
                  <th className="py-3 px-3" onClick={() => handleSort('type')}>{language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}</th>
                  <th className="py-3 px-3" onClick={() => handleSort('unitNumber')}>{language === 'ar' ? 'رقم الوحدة' : 'Unit No.'}</th>
                  <th className="py-3 px-3 text-center" onClick={() => handleSort('rooms')}>{language === 'ar' ? 'الغرف' : 'Rooms'}</th>
                  <th className="py-3 px-3 text-center" onClick={() => handleSort('baths')}>{language === 'ar' ? 'الحمامات' : 'Baths'}</th>
                  <th className="py-3 px-3" onClick={() => handleSort('electricityMeterNumber')}>{language === 'ar' ? 'عداد الكهرباء' : 'Electricity Meter'}</th>
                  <th className="py-3 px-3 text-center">{language === 'ar' ? 'مفروشة' : 'Furnished'}</th>
                  <th className="py-3 px-3 text-left" onClick={() => handleSort('annualRent')}>{language === 'ar' ? 'الإيجار' : 'Rent'}</th>
                  <th className="py-3 px-3 text-center" onClick={() => handleSort('status')}>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-3 text-center">{language === 'ar' ? 'العمليات' : 'Operations'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedUnits.length === 0 ? (
                  <tr><td colSpan={11} className="py-8 text-center text-slate-400">{language === 'ar' ? 'لا توجد وحدات مطابقة للبحث.' : 'No units found matching criteria.'}</td></tr>
                ) : sortedUnits.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{u.compoundName || 'Azhar Residence'}</td>
                    <td className="py-3 px-3">{u.type || '-'}</td>
                    <td className="py-3 px-3"><span className="font-mono font-bold text-[#1a7f8b] bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">{u.unitNumber}</span></td>
                    <td className="py-3 px-3 text-center font-bold">{u.rooms}</td>
                    <td className="py-3 px-3 text-center font-bold">{u.baths}</td>
                    <td className="py-3 px-3 font-mono">{u.electricityMeterNumber || <span className="text-slate-400">{language === 'ar' ? 'غير مربوط' : 'Not linked'}</span>}</td>
                    <td className="py-3 px-3 text-center">{u.isFurnished ? (language === 'ar' ? 'نعم' : 'Yes') : (language === 'ar' ? 'لا' : 'No')}</td>
                    <td className="py-3 px-3 text-left font-mono font-bold">{Number(u.annualRent || 0).toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</td>
                    <td className="py-3 px-3 text-center">{u.status === 'Occupied' ? <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{language === 'ar' ? 'مؤجرة' : 'Occupied'}</span> : <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">{language === 'ar' ? 'متاحة' : 'Vacant'}</span>}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleViewDetails(u)} title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleEdit(u)} title={language === 'ar' ? 'تعديل' : 'Edit'} className="p-1.5 bg-[#475569] hover:bg-[#334155] text-white rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeletingUnit(u)} title={language === 'ar' ? 'حذف' : 'Delete'} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-[#29b4c4]" />
                {mode === 'buildings' ? 'Add New Building' : 'Add New Property Unit'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); if (mode !== 'buildings') resetAddUnitForm(); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {mode === 'buildings' ? (
              <form onSubmit={handleCreateBuilding} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Building Number</label>
                  <input
                    type="text"
                    required
                    value={newBldNo}
                    onChange={(e) => setNewBldNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Remarks / Description</label>
                  <input
                    type="text"
                    required
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="fam"
                    checked={forFamilies}
                    onChange={(e) => setForFamilies(e.target.checked)}
                    className="w-4 h-4 text-[#29b4c4]"
                  />
                  <label htmlFor="fam" className="font-semibold text-slate-700">Dedicated for Families</label>
                </div>
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#29b4c4] text-white font-semibold rounded-xl shadow-md"
                  >
                    Save Building
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateUnit} className="space-y-4 text-xs">
                <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-3">
                  <p className="text-slate-500">{language === 'ar' ? 'اسم المجمع (تلقائي)' : 'Compound (Automatic)'}</p>
                  <p className="font-bold text-[#0e7a87] mt-1">{selectedCompound.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}</label>
                    <select required value={unitType} onChange={(e) => setUnitType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                      <option value="" disabled>{language === 'ar' ? 'اختر النوع' : 'Select type'}</option>
                      <option value="Villa Duplex">Villa Duplex</option><option value="Apartment">Apartment</option><option value="Warehouse">Warehouse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}</label>
                    <input required value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'عدد الغرف' : 'Rooms'}</label><input type="number" min="0" value={rooms || ''} onChange={(e) => setRooms(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div>
                  <div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'عدد الحمامات' : 'Bathrooms'}</label><input type="number" min="0" value={baths || ''} onChange={(e) => setBaths(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <label className="flex items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={isFurnished} onChange={(e) => setIsFurnished(e.target.checked)} className="w-4 h-4" />{language === 'ar' ? 'مفروشة' : 'Furnished'}</label>
                  <div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الإيجار' : 'Rent'} (SAR)</label><input type="number" required min="0" value={annualRent || ''} onChange={(e) => setAnnualRent(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold" /></div>
                </div>
                <div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الملاحظات' : 'Notes'}</label><textarea value={unitNotes} onChange={(e) => setUnitNotes(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl resize-none" /></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-500">{language === 'ar' ? 'رقم عداد الكهرباء يُجلب تلقائيًا من قسم عدادات الكهرباء بعد ربط العداد بالوحدة.' : 'Electricity meter number is pulled automatically from the Electricity Meters section after the meter is linked to this unit.'}</div>
                <div className="flex items-center gap-3 pt-3"><button type="button" onClick={() => { setShowAddModal(false); resetAddUnitForm(); }} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="flex-1 py-2.5 bg-[#29b4c4] text-white font-semibold rounded-xl shadow-md">{language === 'ar' ? 'حفظ الوحدة' : 'Save Unit'}</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {viewingUnit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingUnit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#2b3038] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="text-base font-bold">
                  {language === 'ar' ? 'تفاصيل الوحدة' : 'Unit Details'}
                </h3>
              </div>
              <button onClick={() => setViewingUnit(null)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'المجمع' : 'Compound'}</p>
                  <p className="font-bold text-slate-900">{viewingUnit.compoundName}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'رقم المبنى' : 'Building No'}</p>
                  <p className="font-bold text-slate-900">{viewingUnit.buildingNumber}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}</p>
                  <p className="font-mono font-bold text-[#1a7f8b] text-lg">{viewingUnit.unitNumber}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'النوع' : 'Type'}</p>
                  <p className="font-bold text-slate-900">{viewingUnit.type}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'عداد الكهرباء' : 'Electricity Meter'}</p>
                  <p className="font-mono font-bold text-slate-900">{viewingUnit.electricityMeterNumber || (language === 'ar' ? 'غير مربوط' : 'Not linked')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'مفروشة' : 'Furnished'}</p>
                  <p className="font-bold text-slate-900">{viewingUnit.isFurnished ? (language === 'ar' ? 'نعم' : 'Yes') : (language === 'ar' ? 'لا' : 'No')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${viewingUnit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                    {viewingUnit.status === 'Occupied' ? (language === 'ar' ? 'مؤجرة' : 'Occupied') : (language === 'ar' ? 'متاحة' : 'Vacant')}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'الملاحظات' : 'Notes'}</p>
                  <p className="font-medium text-slate-900 whitespace-pre-wrap">{viewingUnit.notes || (language === 'ar' ? 'لا توجد ملاحظات' : 'No notes')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</p>
                  <p className="font-bold text-slate-900">{viewingUnit.annualRent.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'المستأجر الحالي' : 'Current Tenant'}</p>
                  <p className="font-bold text-slate-900">{contractsForUnit(viewingUnit).find(c => c.status === 'Active')?.tenantName || viewingUnit.currentTenantName || (language === 'ar' ? 'لا يوجد' : 'None')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'الغرف' : 'Rooms'}</p>
                  <p className="font-bold text-slate-900 text-lg">{viewingUnit.rooms}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'الحمامات' : 'Bathrooms'}</p>
                  <p className="font-bold text-slate-900 text-lg">{viewingUnit.baths}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#29b4c4]" />
                    <h4 className="font-bold text-slate-900">{language === 'ar' ? 'سجل إشغال الوحدة' : 'Unit Occupancy History'}</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    {contractsForUnit(viewingUnit).length} {language === 'ar' ? 'عقد' : 'contracts'}
                  </span>
                </div>

                {contractsForUnit(viewingUnit).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-slate-500">
                    {language === 'ar' ? 'لا يوجد سجل إيجاري لهذه الوحدة حتى الآن.' : 'No rental history is recorded for this unit yet.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contractsForUnit(viewingUnit).map((contract, index) => (
                      <div key={contract.id} className={`rounded-xl border p-3 ${contract.status === 'Active' ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{contract.tenantName || (language === 'ar' ? 'مستأجر غير محدد' : 'Unknown tenant')}</span>
                              {contract.status === 'Active' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  {language === 'ar' ? 'المستأجر الحالي' : 'Current tenant'}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-3 flex-wrap text-slate-500">
                              <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> {contract.contractNo || contract.contractNumber}</span>
                              <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(contract.leaseStartDate)} → {formatDate(contract.leaseEndDate)}</span>
                            </div>
                          </div>
                          <div className="text-left md:text-right shrink-0">
                            <p className="font-bold text-slate-900">{Number(contract.totalYearlyRent || contract.annualRent || 0).toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</p>
                            <p className="text-[10px] text-slate-500">{contract.status === 'Active' ? (language === 'ar' ? 'ساري' : 'Active') : (language === 'ar' ? 'سابق / مؤرشف' : 'Previous / Archived')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUnit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#29b4c4]" />
                {language === 'ar' ? 'تعديل الوحدة' : 'Edit Unit'}
              </h3>
              <button onClick={() => setEditingUnit(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}</label><select required value={editUnitType} onChange={(e) => setEditUnitType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"><option value="Villa Duplex">Villa Duplex</option><option value="Apartment">Apartment</option><option value="Warehouse">Warehouse</option></select></div>
                <div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}</label><input required value={editUnitNumber} onChange={(e) => setEditUnitNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'عدد الغرف' : 'Rooms'}</label><input type="number" min="0" value={editRooms} onChange={(e) => setEditRooms(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div><div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'عدد الحمامات' : 'Bathrooms'}</label><input type="number" min="0" value={editBaths} onChange={(e) => setEditBaths(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div></div>
              <div className="grid grid-cols-2 gap-3 items-end"><label className="flex items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={editIsFurnished} onChange={(e) => setEditIsFurnished(e.target.checked)} className="w-4 h-4" />{language === 'ar' ? 'مفروشة' : 'Furnished'}</label><div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الإيجار' : 'Rent'} (SAR)</label><input type="number" min="0" value={editAnnualRent} onChange={(e) => setEditAnnualRent(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold" /></div></div>
              <div><label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الملاحظات' : 'Notes'}</label><textarea value={editUnitNotes} onChange={(e) => setEditUnitNotes(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl resize-none" /></div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-500">{language === 'ar' ? `عداد الكهرباء المرتبط: ${editingUnit?.electricityMeterNumber || 'غير مربوط'}` : `Linked electricity meter: ${editingUnit?.electricityMeterNumber || 'Not linked'}`}</div>
              <div className="flex items-center gap-3 pt-3"><button type="button" onClick={() => setEditingUnit(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="flex-1 py-2.5 bg-[#29b4c4] text-white font-semibold rounded-xl shadow-md">{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUnit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeletingUnit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' 
                ? `هل أنت متأكد من حذف الوحدة "${deletingUnit.unitNumber}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete unit "${deletingUnit.unitNumber}"? This action cannot be undone.`
              }
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeletingUnit(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl"
              >
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
