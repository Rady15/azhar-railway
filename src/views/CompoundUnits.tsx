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

  // Form states
  const [bldNumber, setBldNumber] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [rooms, setRooms] = useState(0);
  const [baths, setBaths] = useState(0);
  const [living, setLiving] = useState(0);
  const [majlis, setMajlis] = useState(0);
  const [area, setArea] = useState('');
  const [unitType, setUnitType] = useState('');
  const [annualRent, setAnnualRent] = useState(0);

  // Building form states
  const [newBldNo, setNewBldNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [forFamilies, setForFamilies] = useState(true);

  // Edit unit form states
  const [editBldNumber, setEditBldNumber] = useState('');
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editRooms, setEditRooms] = useState(3);
  const [editBaths, setEditBaths] = useState(2);
  const [editLiving, setEditLiving] = useState(1);
  const [editMajlis, setEditMajlis] = useState(0);
  const [editArea, setEditArea] = useState('150');
  const [editUnitType, setEditUnitType] = useState('Apartment');
  const [editAnnualRent, setEditAnnualRent] = useState(30000);

  const filteredUnits = units.filter(u => {
    if (mode === 'non_rented' && u.status !== 'Vacant') return false;
    if (compoundFilter !== 'all' && u.compoundId !== compoundFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.unitNumber.toLowerCase().includes(q) ||
        u.buildingNumber.toLowerCase().includes(q) ||
        u.type.toLowerCase().includes(q)
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

  const resetAddUnitForm = () => {
    setBldNumber('');
    setUnitNumber('');
    setRooms(0);
    setBaths(0);
    setLiving(0);
    setMajlis(0);
    setArea('');
    setUnitType('');
    setAnnualRent(0);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bldNumber.trim() || !unitNumber.trim() || !area.trim() || !unitType || Number(annualRent) <= 0) return;
    onAddUnit({
      compoundId: compoundFilter === '2' ? '2' : '4',
      compoundName: compoundFilter === '2' ? 'Meadow Park Garden' : 'Daar Residence',
      buildingNumber: bldNumber,
      unitNumber: unitNumber,
      rooms: Number(rooms),
      baths: Number(baths),
      living: Number(living),
      majlis: Number(majlis),
      area: area,
      type: unitType,
      status: 'Vacant',
      annualRent: Number(annualRent)
    });
    setShowAddModal(false);
    resetAddUnitForm();
  };

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBuilding({
      compoundId: compoundFilter === '2' ? '2' : '4',
      compoundName: compoundFilter === '2' ? 'Meadow Park Garden' : 'Daar Residence',
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
    setEditBldNumber(unit.buildingNumber);
    setEditUnitNumber(unit.unitNumber);
    setEditRooms(unit.rooms);
    setEditBaths(unit.baths);
    setEditLiving(unit.living);
    setEditMajlis(unit.majlis);
    setEditArea(String(unit.area));
    setEditUnitType(unit.type);
    setEditAnnualRent(unit.annualRent);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    onUpdateUnit?.(editingUnit.id, {
      buildingNumber: editBldNumber,
      unitNumber: editUnitNumber,
      rooms: Number(editRooms),
      baths: Number(editBaths),
      living: Number(editLiving),
      majlis: Number(editMajlis),
      area: editArea,
      type: editUnitType,
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
            <option value="4">مجمع أزهار السكني (Daar Residence)</option>
            <option value="2">مجمع ريدينس حديقة ميدو</option>
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
                  <th className="py-3 px-3 border-r border-blue-600/40 w-10 text-center">#</th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('compoundName')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'المجمع' : 'Compound'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('buildingNumber')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'رقم المبنى' : 'Bld #'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('unitNumber')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'رقم الوحدة' : 'Unit #'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'النوع' : 'Type'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('rooms')}>
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'الغرف' : 'Rooms'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('baths')}>
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'دورات المياه' : 'Baths'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('living')}>
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'الصالة' : 'Living'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('majlis')}>
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'المجلس' : 'Majlis'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('area')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'المساحة (م²)' : 'Area (m²)'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('annualRent')}>
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                      <span>{language === 'ar' ? 'الحالة' : 'Status'}</span>
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <span>{language === 'ar' ? 'العمليات' : 'Operations'}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedUnits.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-400">
                      {language === 'ar' ? 'لا توجد وحدات مطابقة للبحث.' : 'No units found matching criteria.'}
                    </td>
                  </tr>
                ) : (
                  sortedUnits.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                      <td className="py-3 px-3 text-slate-600 font-normal border-l border-slate-100">{u.compoundName}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 border-l border-slate-100">{u.buildingNumber}</td>
                      <td className="py-3 px-3 border-l border-slate-100">
                        <span className="font-mono font-bold text-[#1a7f8b] bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                          {u.unitNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 border-l border-slate-100">{u.type}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 border-l border-slate-100">{u.rooms}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 border-l border-slate-100">{u.baths}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 border-l border-slate-100">{u.living}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 border-l border-slate-100">{u.majlis}</td>
                      <td className="py-3 px-3 text-left font-mono text-slate-700 border-l border-slate-100">{u.area} {language === 'ar' ? 'م²' : 'm²'}</td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-slate-900 border-l border-slate-100">
                        {u.annualRent.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                      </td>
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        {u.status === 'Occupied' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {language === 'ar' ? 'مؤجرة' : 'Occupied'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {language === 'ar' ? 'متاحة' : 'Vacant'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(u)}
                            title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(u)}
                            title={language === 'ar' ? 'تعديل' : 'Edit'}
                            className="p-1.5 bg-[#475569] hover:bg-[#334155] text-white rounded-md shadow-sm transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingUnit(u)}
                            title={language === 'ar' ? 'حذف' : 'Delete'}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Building Number</label>
                    <input
                      type="text"
                      required
                      value={bldNumber}
                      onChange={(e) => setBldNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit Number</label>
                    <input
                      type="text"
                      required
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Property Type</label>
                    <select
                      required
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="" disabled>Select property type</option>
                      <option value="Villa Duplex">Villa Duplex</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Warehouse">Warehouse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Area (m²)</label>
                    <input
                      type="text"
                      required
                    value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rooms</label>
                    <input
                      type="number" step="1" min="0" inputMode="numeric"
                      value={rooms || ''}
                      onChange={(e) => setRooms(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Baths</label>
                    <input
                      type="number" step="1" min="0" inputMode="numeric"
                      value={baths || ''}
                      onChange={(e) => setBaths(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Living</label>
                    <input
                      type="number" step="1" min="0" inputMode="numeric"
                      value={living || ''}
                      onChange={(e) => setLiving(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Majlis</label>
                    <input
                      type="number" step="1" min="0" inputMode="numeric"
                      value={majlis || ''}
                      onChange={(e) => setMajlis(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Rent Rate (SAR)</label>
                  <input
                    type="number"
                    required
                    min="0" step="1" inputMode="numeric"
                    value={annualRent || ''}
                    onChange={(e) => setAnnualRent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetAddUnitForm(); }}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#29b4c4] text-white font-semibold rounded-xl shadow-md"
                  >
                    Save Unit
                  </button>
                </div>
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
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${viewingUnit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                    {viewingUnit.status === 'Occupied' ? (language === 'ar' ? 'مؤجرة' : 'Occupied') : (language === 'ar' ? 'متاحة' : 'Vacant')}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'المساحة' : 'Area'}</p>
                  <p className="font-bold text-slate-900">{viewingUnit.area} {language === 'ar' ? 'م²' : 'm²'}</p>
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
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'غرف' : 'Rooms'}</p>
                  <p className="font-bold text-slate-900 text-lg">{viewingUnit.rooms}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'حمامات' : 'Baths'}</p>
                  <p className="font-bold text-slate-900 text-lg">{viewingUnit.baths}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'صالة' : 'Living'}</p>
                  <p className="font-bold text-slate-900 text-lg">{viewingUnit.living}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <p className="text-slate-500 mb-1">{language === 'ar' ? 'مجلس' : 'Majlis'}</p>
                  <p className="font-bold text-slate-900 text-lg">{viewingUnit.majlis}</p>
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
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'رقم المبنى' : 'Building Number'}</label>
                  <input
                    type="text"
                    required
                    value={editBldNumber}
                    onChange={(e) => setEditBldNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}</label>
                  <input
                    type="text"
                    required
                    value={editUnitNumber}
                    onChange={(e) => setEditUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'النوع' : 'Type'}</label>
                  <select
                    value={editUnitType}
                    onChange={(e) => setEditUnitType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Villa Duplex">Villa Duplex</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'المساحة (م²)' : 'Area (m²)'}</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'غرف' : 'Rooms'}</label>
                  <input
                    type="number" step="1" min="0" inputMode="numeric"
                    value={editRooms}
                    onChange={(e) => setEditRooms(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'حمامات' : 'Baths'}</label>
                  <input
                    type="number" step="1" min="0" inputMode="numeric"
                    value={editBaths}
                    onChange={(e) => setEditBaths(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'صالة' : 'Living'}</label>
                  <input
                    type="number" step="1" min="0" inputMode="numeric"
                    value={editLiving}
                    onChange={(e) => setEditLiving(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'مجلس' : 'Majlis'}</label>
                  <input
                    type="number" step="1" min="0" inputMode="numeric"
                    value={editMajlis}
                    onChange={(e) => setEditMajlis(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الإيجار السنوي (ر.س)' : 'Annual Rent (SAR)'}</label>
                <input
                  type="number" step="1" min="0" inputMode="numeric"
                  value={editAnnualRent}
                  onChange={(e) => setEditAnnualRent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] text-white font-semibold rounded-xl shadow-md"
                >
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </button>
              </div>
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
