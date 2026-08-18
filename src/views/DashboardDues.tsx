import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  ArrowUpDown, 
  ChevronDown, 
  User, 
  Building2, 
  Phone, 
  Calendar, 
  Printer, 
  Edit3, 
  Eye, 
  MessageSquare, 
  Archive, 
  CheckCircle2, 
  CreditCard,
  Trash2 
} from 'lucide-react';
import { exportStyledExcel, exportStyledPdf } from '../utils/reportExports';

import { Contract, Tenant, DueItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EditTenantModal } from '../components/EditTenantModal';
import { ContractDetailsModal } from '../components/ContractDetailsModal';
import { ContractNotesModal } from '../components/ContractNotesModal';
import { confirmUi, promptUi } from '../utils/uiDialog';
import { printTableDocument } from '../utils/printDocument';

interface DashboardDuesProps {
  dues?: DueItem[];
  contracts?: Contract[];
  tenants?: Tenant[];
  onRecordPayment?: (payload: { contractId: string; tenantId: string; tenantName: string; unitNumber: string; amount: number; paymentMethod: string; referenceNo?: string; notes?: string }) => Promise<void> | void;
  onUpdateTenant?: (tenant: Tenant) => void;
  onUpdateContract?: (contract: Contract) => void;
  onDeleteContract?: (id: string) => Promise<void> | void;
  selectedCompoundId?: string;
}

type SortField = 'unitNumber' | 'unitType' | 'tenantName' | 'tenantMobile' | 'annualRent' | 'remainingAmount' | 'leaseEndDate' | 'daysLeft' | 'notes';
type SortOrder = 'asc' | 'desc' | null;

export const DashboardDues: React.FC<DashboardDuesProps> = ({
  dues = [],
  contracts = [],
  tenants = [],
  onRecordPayment,
  onUpdateTenant,
  onUpdateContract,
  onDeleteContract,
  selectedCompoundId = '1'
}) => {
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [compoundFilter, setCompoundFilter] = useState('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Dropdown open row state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top:number; left:number } | null>(null);

  // Modals state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [paymentRow, setPaymentRow] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Derive rows matching screenshot Image 2
  // If contracts list is provided, use contracts; otherwise fallback to default list
  const collectionsData = useMemo(() => {
    // Production: show only real contracts returned by the backend.
    if (contracts.length > 0) {
      return contracts.map((c, i) => {
        // calculate days left
        const endDate = new Date(c.leaseEndDate.replace(/\//g, '-'));
        const now = new Date();
        const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        const daysLeft = isNaN(diffDays) ? -681 + i : diffDays;

        return {
          id: c.id,
          unitNumber: c.unitNumber,
          unitType: c.unitType || 'Appartment',
          tenantName: c.tenantName,
          tenantMobile: c.tenantMobile,
          annualRent: Number(c.annualRent || 0) + Number(c.waterYearlyBill || 0),
          remainingAmount: c.remainingAmount,
          leaseEndDate: c.leaseEndDate,
          daysLeft,
          notesText: c.arabicNotes || c.englishNotes || (c.notes && c.notes[0]?.text) || '',
          rawContract: c
        };
      });
    }

    return [];
  }, [contracts]);

  // Search & Filter
  const filteredRows = useMemo(() => {
    return collectionsData.filter(row => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.unitNumber.toLowerCase().includes(q) ||
        row.unitType.toLowerCase().includes(q) ||
        row.tenantName.toLowerCase().includes(q) ||
        row.tenantMobile.includes(q)
      );
    });
  }, [collectionsData, searchQuery]);

  // Sort logic
  const sortedRows = useMemo(() => {
    if (!sortField || !sortOrder) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let aVal = a[sortField as keyof typeof a];
      let bVal = b[sortField as keyof typeof b];

      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      } else setSortOrder('asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows = sortedRows.map((row, idx) => [
      idx + 1, row.unitNumber, row.unitType, row.tenantName, row.tenantMobile,
      row.annualRent || 0, row.remainingAmount || 0, row.leaseEndDate || '-',
      row.daysLeft, row.notesText || '-'
    ]);
    const annual = sortedRows.reduce((s,r)=>s+Number(r.annualRent||0),0);
    const remaining = sortedRows.reduce((s,r)=>s+Number(r.remainingAmount||0),0);
    const urgent = sortedRows.filter(r=>Number(r.daysLeft)<=30).length;
    exportStyledExcel({
      sheetName: 'Collections',
      fileName: `Azhar_Residence_Collections_${new Date().toISOString().split('T')[0]}.xlsx`,
      title: 'AZHAR RESIDENCE — Collections Report',
      subtitle: `Contract balances & upcoming expirations • Generated ${new Date().toLocaleString('en-GB')}`,
      columns: ['#','Unit','Type','Tenant Name','Mobile','Annual Rent','Remaining','Expiry Date','Days Left','Notes'],
      rows,
      kpis: [
        { label: 'Units', value: sortedRows.length },
        { label: 'Annual Rent', value: annual },
        { label: 'Remaining', value: remaining },
        { label: 'Expiring ≤ 30 Days', value: urgent }
      ],
      totalRow: ['', '', '', 'TOTAL', '', annual, remaining, '', '', '']
    });
  };

  // Export PDF
  const handleExportPDF = () => {
    const body = sortedRows.map((row, idx) => [
      idx + 1, row.unitNumber, row.unitType, row.tenantName, row.tenantMobile,
      `${Number(row.annualRent||0).toLocaleString()} SAR`,
      `${Number(row.remainingAmount||0).toLocaleString()} SAR`,
      row.leaseEndDate || '-', `${row.daysLeft} days`
    ]);
    const annual = sortedRows.reduce((s,r)=>s+Number(r.annualRent||0),0);
    const remaining = sortedRows.reduce((s,r)=>s+Number(r.remainingAmount||0),0);
    const urgent = sortedRows.filter(r=>Number(r.daysLeft)<=30).length;
    exportStyledPdf({
      title: 'Collections & Contract Balances Report',
      subtitle: `Generated ${new Date().toLocaleString('en-GB')}`,
      headers: ['#','Unit','Type','Tenant Name','Mobile','Annual Rent','Remaining','Expiry Date','Expire After'],
      body,
      kpis: [
        { label: 'Units', value: String(sortedRows.length) },
        { label: 'Annual Rent', value: `${annual.toLocaleString()} SAR` },
        { label: 'Remaining', value: `${remaining.toLocaleString()} SAR` },
        { label: 'Expiring ≤ 30 Days', value: String(urgent) }
      ],
      totals: ['', '', '', 'TOTAL', '', `${annual.toLocaleString()} SAR`, `${remaining.toLocaleString()} SAR`, '', ''],
      fileName: `Azhar_Residence_Collections_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar & Quick Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" />
            <span>{language === 'ar' ? 'سجل التحصيلات المالي' : 'Financial Collections Register'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {language === 'ar' ? 'قائمة التحصيلات والعقود' : 'Collections & Rent Register'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' 
              ? 'متابعة المبالغ المتبقية، مواعيد انتهاء العقود، وتصدير التقارير بصيغة PDF واكسل' 
              : 'Track remaining balances, contract expiry countdowns, and export reports to PDF and Excel.'}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير PDF' : 'Export PDF'}</span>
          </button>

          <button
            onClick={() => printTableDocument({ language, title: language === 'ar' ? 'تقرير المستحقات والمتأخرات' : 'Collections & Outstanding Report', subtitle: language === 'ar' ? 'التقرير يعكس البحث والفلاتر الحالية' : 'Report reflects the current search and filters', columns: [ { key:'unit', label: language === 'ar' ? 'الوحدة' : 'Unit' }, { key:'tenant', label: language === 'ar' ? 'المستأجر' : 'Tenant' }, { key:'mobile', label: language === 'ar' ? 'الجوال' : 'Mobile' }, { key:'rent', label: language === 'ar' ? 'إجمالي الإيجار السنوي' : 'Total Annual Rent' }, { key:'remaining', label: language === 'ar' ? 'المتبقي' : 'Remaining' }, { key:'expiry', label: language === 'ar' ? 'نهاية العقد' : 'Contract End' }, { key:'days', label: language === 'ar' ? 'الأيام المتبقية' : 'Days Left' } ], rows: sortedRows.map(row => ({ unit: row.unitNumber, tenant: row.tenantName, mobile: row.tenantMobile, rent: `${Number(row.annualRent||0).toLocaleString()} SAR`, remaining: `${Number(row.remainingAmount||0).toLocaleString()} SAR`, expiry: row.leaseEndDate, days: row.daysLeft })) })}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث بالوحدة، المستأجر، أو رقم الجوال...' : 'Filter by unit, tenant name, or mobile...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4] ${
              language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {language === 'ar' ? 'عدد السجلات:' : 'Total Records:'}{' '}
          <span className="font-bold text-slate-900">{sortedRows.length}</span>
        </div>
      </div>

      {/* Main Table matching Screenshot Image 2 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-800">
            {/* Header with screenshot blue background #2b62af */}
            <thead className="bg-[#2b62af] text-white text-[11px] font-semibold tracking-wider uppercase border-b border-blue-900">
              <tr>
                <th className="py-3 px-3 text-center border-r border-blue-600/40 w-10">
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                    <span>#</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('unitNumber')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الوحدة' : 'Unit'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('unitType')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'النوع' : 'Type'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('tenantName')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'اسم المستأجر' : 'Tenant'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('tenantMobile')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الجوال' : 'Mobile'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('annualRent')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'إجمالي الإيجار السنوي' : 'Total Annual Rent'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('remainingAmount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('leaseEndDate')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'تاريخ انتهاء العقد' : 'Contract Expir Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-start border-r border-blue-600/40" onClick={() => handleSort('notes')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الملاحظات' : 'Notes'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-center border-r border-blue-600/40" onClick={() => handleSort('daysLeft')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'انتهاء العقد بعد (يوم)' : 'Contract Expire After'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                    <span>{language === 'ar' ? 'العمليات' : 'Operation'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 font-medium bg-white">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد بيانات مطابقة للفلتر.' : 'No collections record matching filter.'}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {/* # Column */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800 border-r border-slate-100">
                      {idx + 1}
                    </td>

                    {/* Unit Column */}
                    <td className="py-3.5 px-3 font-semibold text-slate-900 border-r border-slate-100">
                      {row.unitNumber}
                    </td>

                    {/* Type Column */}
                    <td className="py-3.5 px-3 text-slate-700 border-r border-slate-100">
                      {row.unitType}
                    </td>

                    {/* Tenant Column */}
                    <td className="py-3.5 px-3 font-medium text-slate-900 border-r border-slate-100 max-w-[200px]">
                      {row.tenantName}
                    </td>

                    {/* Mobile Column */}
                    <td className="py-3.5 px-3 font-mono text-slate-800 border-r border-slate-100">
                      {row.tenantMobile}
                    </td>

                    {/* Annual Rent Column */}
                    <td className="py-3.5 px-3 font-bold text-slate-800 border-r border-slate-100">
                      {row.annualRent.toLocaleString()}
                    </td>

                    {/* Remaining Amount Column -> Pink badge #ff3b7a matching screenshot Image 2 */}
                    <td className="py-3.5 px-3 border-r border-slate-100">
                      <span className="inline-block px-2.5 py-1 bg-[#ff3b7a] text-white font-bold text-xs rounded shadow-xs">
                        {row.remainingAmount.toLocaleString()}
                      </span>
                    </td>

                    {/* Contract Expir Date Column */}
                    <td className="py-3.5 px-3 font-mono text-slate-700 border-r border-slate-100">
                      {row.leaseEndDate}
                    </td>

                    {/* Notes Column */}
                    <td className="py-3.5 px-3 text-slate-400 border-r border-slate-100">
                      {row.notesText || ''}
                    </td>

                    {/* Contract Expire After Column -> Black badge #000000 matching screenshot Image 2 */}
                    <td className="py-3.5 px-3 text-center border-r border-slate-100">
                      <span className="inline-block px-3 py-1 bg-black text-white font-mono font-bold text-xs rounded">
                        {row.daysLeft}
                      </span>
                    </td>

                    {/* Operation Dropdown Button #586574 matching screenshot Image 2 */}
                    <td className="py-3.5 px-3 text-center relative">
                      <div className="relative inline-block text-start">
                        <button
                          onClick={(e) => {
                            const nextOpen = openDropdownId !== row.id;
                            if (nextOpen) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const width = 176;
                              setDropdownPosition({ top: rect.bottom + 6, left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)) });
                              setOpenDropdownId(row.id);
                            } else { setOpenDropdownId(null); setDropdownPosition(null); }
                          }}
                          className="px-3 py-1.5 bg-[#586574] hover:bg-[#485360] text-white font-medium text-xs rounded-lg shadow-xs transition-colors inline-flex items-center gap-1"
                        >
                          <span>{language === 'ar' ? 'العمليات' : 'Operation'}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu matching screenshot */}
                        {openDropdownId === row.id && (
                          <div className="fixed w-44 bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden py-1 text-slate-700 text-xs animate-in fade-in zoom-in-95 duration-100" style={{ top: dropdownPosition?.top ?? 0, left: dropdownPosition?.left ?? 0 }}>
                            <button
                              onClick={() => { setPaymentRow(row); setPaymentAmount(0); setPaymentReference(''); setPaymentNotes(''); setPaymentError(''); setOpenDropdownId(null); }}
                              disabled={Number(row.remainingAmount || 0) <= 0}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium text-emerald-700 disabled:opacity-40"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenDetails(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>{language === 'ar' ? 'التفاصيل' : 'Details'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenNotes(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{language === 'ar' ? 'الملاحظات' : 'Notes'}</span>
                            </button>

                            <button
                              onClick={() => handleArchive(row)}
                              className="w-full text-start px-4 py-2 hover:bg-slate-100 flex items-center gap-2 transition-colors font-medium text-amber-700"
                            >
                              <Archive className="w-3.5 h-3.5 text-amber-600" />
                              <span>{language === 'ar' ? 'أرشفة' : 'Archive'}</span>
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              onClick={() => handleDeleteContract(row)}
                              className="w-full text-start px-4 py-2 hover:bg-rose-50 flex items-center gap-2 transition-colors font-bold text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'حذف العقد نهائيًا' : 'Delete permanently'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentRow && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => !paymentBusy && setPaymentRow(null)}>
          <form className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4" onClick={e=>e.stopPropagation()} onSubmit={async e=>{e.preventDefault();if(!onRecordPayment)return;const contract=paymentRow.rawContract as Contract;const amount=Math.round(Number(paymentAmount)*100)/100;const outstanding=Number(paymentRow.remainingAmount||0);if(!amount||amount<=0){setPaymentError(language==='ar'?'أدخل مبلغ صحيح':'Enter a valid amount');return;}if(amount>outstanding+0.005){setPaymentError(language==='ar'?`المبلغ لا يمكن أن يتجاوز المتبقي (${outstanding.toLocaleString()} SAR)`:`Amount cannot exceed the remaining balance (${outstanding.toLocaleString()} SAR)`);return;}setPaymentBusy(true);setPaymentError('');try{await onRecordPayment({contractId:contract.id,tenantId:contract.tenantId,tenantName:contract.tenantName,unitNumber:contract.unitNumber,amount,paymentMethod,referenceNo:paymentReference,notes:paymentNotes});setPaymentRow(null);}catch(err){setPaymentError(language==='ar'?'تعذر تسجيل الدفعة. راجع الاتصال والبيانات.':'Could not record payment.');}finally{setPaymentBusy(false);}}}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-emerald-700"/></div><div><h3 className="font-bold text-slate-900">{language==='ar'?'تسجيل دفعة إيجار':'Record Rent Payment'}</h3><p className="text-xs text-slate-500">{paymentRow.tenantName} • {paymentRow.unitNumber}</p></div></div>
            <div className="grid grid-cols-2 gap-3 text-xs"><div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-500">{language==='ar'?'المتبقي':'Remaining'}</span><div className="font-bold text-base">{Number(paymentRow.remainingAmount||0).toLocaleString()} SR</div></div><div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-500">{language==='ar'?'العقد':'Contract'}</span><div className="font-bold text-sm truncate">{paymentRow.rawContract?.contractNo||paymentRow.rawContract?.contractNumber||paymentRow.id}</div></div></div>
            <label className="block text-sm font-semibold">{language==='ar'?'المبلغ':'Amount'}<input type="number" min="0.01" step="0.01" max={Number(paymentRow.remainingAmount||0)} value={paymentAmount || ''} onChange={e=>setPaymentAmount(Number(e.target.value))} className="mt-1 w-full border rounded-xl px-3 py-2" required /></label>
            <label className="block text-sm font-semibold">{language==='ar'?'طريقة الدفع':'Payment Method'}<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2"><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Card</option></select></label>
            <label className="block text-sm font-semibold">{language==='ar'?'رقم المرجع':'Reference No.'}<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" /></label>
            <label className="block text-sm font-semibold">{language==='ar'?'ملاحظات':'Notes'}<textarea value={paymentNotes} onChange={e=>setPaymentNotes(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" rows={2}/></label>
            {paymentError && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg p-2">{paymentError}</div>}
            <div className="flex gap-2 justify-end"><button type="button" onClick={()=>setPaymentRow(null)} disabled={paymentBusy} className="px-4 py-2 border rounded-xl">{language==='ar'?'إلغاء':'Cancel'}</button><button type="submit" disabled={paymentBusy} className="px-4 py-2 bg-emerald-600 text-white rounded-xl disabled:opacity-60">{paymentBusy?(language==='ar'?'جارٍ الحفظ...':'Saving...'):(language==='ar'?'تأكيد الدفعة':'Post Payment')}</button></div>
          </form>
        </div>
      )}

      {/* Edit Tenant Modal matching Screenshot Image 1 */}
      <EditTenantModal
        tenant={selectedTenant}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(updated) => {
          if (onUpdateTenant) onUpdateTenant(updated);
        }}
      />

      {/* Contract Details Modal */}
      <ContractDetailsModal
        contract={selectedContract}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Contract Notes Modal */}
      <ContractNotesModal
        contract={selectedContract}
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        onSaveNotes={(contractId, newNotes) => {
          if (selectedContract && onUpdateContract) {
            onUpdateContract({ ...selectedContract, notes: newNotes });
          }
        }}
      />
    </div>
  );
};
