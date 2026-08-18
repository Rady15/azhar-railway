import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  Wrench,
  Users,
  Zap,
  FileSpreadsheet
} from 'lucide-react';
import { Expense } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { notifyUser } from '../utils/userFeedback';
import { confirmUi } from '../utils/uiDialog';
import { printDocument } from '../utils/printDocument';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void> | void;
  onUpdateExpense?: (expense: Expense) => Promise<void> | void;
  onDeleteExpense?: (id: string) => Promise<void> | void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('صيانة وتشغيل');
  const [newAmount, setNewAmount] = useState(0);
  const [newRecipient, setNewRecipient] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('Bank Transfer');
  const [newNotes, setNewNotes] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleSort = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = 
      e.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const sortedExpenses = useMemo(() => {
    if (!sortConfig) return filteredExpenses;
    return [...filteredExpenses].sort((a: any, b: any) => {
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
  }, [filteredExpenses, sortConfig]);

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const maintenanceAmount = expenses.filter(e => e.category === 'صيانة وتشغيل').reduce((sum, e) => sum + e.amount, 0);
  const salaryAmount = expenses.filter(e => e.category === 'رواتب الموظفين').reduce((sum, e) => sum + e.amount, 0);
  const utilityAmount = expenses.filter(e => e.category === 'كهرباء ومياه' || e.category === 'نظافة وأمن').reduce((sum, e) => sum + e.amount, 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const payload={
      voucherNo: editingExpense?.voucherNo || '',
      category: newCategory, title: newTitle.trim(), amount: Number(newAmount), recipient: newRecipient.trim(), paymentMethod: newPaymentMethod,
      expenseDate: newExpenseDate, compoundId: '1', notes: newNotes.trim()
    };
    if (!payload.title || !payload.recipient || !Number.isFinite(payload.amount) || payload.amount <= 0) {
      notifyUser({ kind: 'warning', ar: 'راجع بيان المصروف والمستفيد والمبلغ قبل الحفظ.', en: 'Review the expense description, recipient and amount before saving.' });
      return;
    }
    setIsSaving(true);
    try {
      if(editingExpense && onUpdateExpense) await onUpdateExpense({...editingExpense,...payload});
      else await onAddExpense(payload);
      setNewTitle(''); setNewRecipient(''); setNewNotes(''); setNewExpenseDate(new Date().toISOString().split('T')[0]);
      setEditingExpense(null); setShowAddModal(false);
    } finally { setIsSaving(false); }
  };

  const handlePrintExpense = (e: Expense) => printDocument({
    language,
    title: language === 'ar' ? 'سند صرف' : 'Expense Voucher',
    subtitle: language === 'ar' ? 'سند مصروف معتمد من نظام إدارة مجمع أزهار' : 'Expense voucher from Azhar Residence Management System',
    reference: e.voucherNo,
    fields: [
      { label: language === 'ar' ? 'رقم السند' : 'Voucher No.', value: e.voucherNo },
      { label: language === 'ar' ? 'التاريخ' : 'Date', value: e.expenseDate },
      { label: language === 'ar' ? 'بيان المصروف' : 'Description', value: e.title, wide: true },
      { label: language === 'ar' ? 'الفئة' : 'Category', value: e.category },
      { label: language === 'ar' ? 'المبلغ' : 'Amount', value: `${Number(e.amount || 0).toLocaleString()} ${language === 'ar' ? 'ر.س' : 'SAR'}` },
      { label: language === 'ar' ? 'المستفيد / المورد' : 'Recipient / Vendor', value: e.recipient },
      { label: language === 'ar' ? 'طريقة الدفع' : 'Payment Method', value: e.paymentMethod },
      { label: language === 'ar' ? 'ملاحظات / رقم الفاتورة' : 'Notes / Invoice No.', value: e.notes || '—', wide: true }
    ]
  });

  const handleDeleteExpense = async (e: Expense) => {
    if (!onDeleteExpense) return;
    const ok = await confirmUi({
      title: language === 'ar' ? 'حذف سند المصروف' : 'Delete expense voucher',
      message: language === 'ar' ? `هل تريد حذف سند الصرف ${e.voucherNo}؟ لن يظهر في سجل المصروفات بعد الحذف.` : `Delete expense voucher ${e.voucherNo}? It will no longer appear in the expense register.`,
      confirmText: language === 'ar' ? 'حذف السند' : 'Delete voucher',
      cancelText: language === 'ar' ? 'إلغاء' : 'Cancel',
      tone: 'danger'
    });
    if (ok) await onDeleteExpense(e.id);
  };

  const handleExportCSV = () => {
    const headers = ['رقم السند', 'البيان', 'الفئة', 'المبلغ (ر.س)', 'المستفيد', 'طريقة الدفع', 'التاريخ', 'ملاحظات'];
    const rows = sortedExpenses.map(e => [
      e.voucherNo,
      e.title,
      e.category,
      e.amount,
      e.recipient,
      e.paymentMethod,
      e.expenseDate,
      e.notes || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>{language === 'ar' ? 'سجل المصروفات وسندات الصرف' : 'Expenses & Payment Vouchers'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {language === 'ar' ? 'قسم إدارة المصروفات والمالية' : 'Expenses Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'توثيق ورصد مصاريف الصيانة التشغيلية، الرواتب، الخدمات العامة وسندات الصرف.' : 'Track operational expenses, maintenance costs, payroll, utilities and payment receipts.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'إصدار سند صرف جديد' : 'New Expense Voucher'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1 font-mono">{totalAmount.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{language === 'ar' ? 'مصاريف الصيانة' : 'Maintenance'}</span>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{maintenanceAmount.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{language === 'ar' ? 'رواتب الكادر' : 'Payroll'}</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-900 mt-1 font-mono">{salaryAmount.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{language === 'ar' ? 'الخدمات والنظافة' : 'Utilities & Hygiene'}</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1 font-mono">{utilityAmount.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث عن رقم السند، البيان، المستفيد، طريقة الدفع...' : 'Search voucher no, title, recipient...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
          >
            <option value="all">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
            <option value="صيانة وتشغيل">{language === 'ar' ? 'صيانة وتشغيل' : 'Maintenance & Ops'}</option>
            <option value="رواتب الموظفين">{language === 'ar' ? 'رواتب الموظفين' : 'Staff Salaries'}</option>
            <option value="كهرباء ومياه">{language === 'ar' ? 'كهرباء ومياه' : 'Utilities'}</option>
            <option value="نظافة وأمن">{language === 'ar' ? 'نظافة وأمن' : 'Hygiene & Security'}</option>
            <option value="أخرى">{language === 'ar' ? 'أخرى' : 'Other'}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-semibold tracking-wider border-b border-blue-900 select-none">
              <tr>
                <th className="py-3 px-3 border-r border-blue-600/40 w-10 text-center">#</th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('voucherNo')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم السند' : 'Voucher No'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'بيان المصروف' : 'Description'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الفئة' : 'Category'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-left font-mono" onClick={() => handleSort('amount')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ (ر.س)' : 'Amount (SAR)'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('recipient')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المستفيد / المورد' : 'Recipient'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('paymentMethod')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('expenseDate')}>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>{language === 'ar' ? 'التاريخ' : 'Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>{language === 'ar' ? 'العمليات' : 'Actions'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد مصروفات مسجلة.' : 'No expenses found.'}
                  </td>
                </tr>
              ) : (
                sortedExpenses.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-center border-l border-slate-100">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-700 border-l border-slate-100">{e.voucherNo}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-l border-slate-100">{e.title}</td>
                    <td className="py-3 px-3 border-l border-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-rose-600 border-l border-slate-100">
                      {e.amount.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                    </td>
                    <td className="py-3 px-3 text-slate-800 border-l border-slate-100">{e.recipient}</td>
                    <td className="py-3 px-3 border-l border-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 border-l border-slate-100">{e.expenseDate}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handlePrintExpense(e)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors inline-flex items-center gap-1 text-[10px] font-bold"
                        title="طباعة السند"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'السند' : 'Voucher'}</span>
                      </button>
                      <button onClick={()=>{setEditingExpense(e);setNewTitle(e.title);setNewCategory(e.category);setNewAmount(e.amount);setNewRecipient(e.recipient);setNewPaymentMethod(e.paymentMethod);setNewNotes(e.notes||'');setNewExpenseDate(e.expenseDate);setShowAddModal(true);}} className="ms-1 px-2 py-1.5 bg-blue-600 text-white rounded-md text-[10px] font-bold">{language==='ar'?'تعديل':'Edit'}</button>
                      <button onClick={()=>handleDeleteExpense(e)} className="ms-1 px-2 py-1.5 bg-rose-600 text-white rounded-md text-[10px] font-bold">{language==='ar'?'حذف':'Delete'}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                {editingExpense ? (language === 'ar' ? 'تعديل سند المصروف' : 'Edit Expense Voucher') : (language === 'ar' ? 'إصدار سند صرف مصروفات جديد' : 'New Expense Voucher')}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'بيان المصروف / الوصف' : 'Description'}</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شراء صمامات سباكة ومحابس مياه..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'الفئة' : 'Category'}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="صيانة وتشغيل">صيانة وتشغيل</option>
                    <option value="رواتب الموظفين">رواتب الموظفين</option>
                    <option value="كهرباء ومياه">كهرباء ومياه</option>
                    <option value="نظافة وأمن">نظافة وأمن</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'المبلغ (ر.س)' : 'Amount (SAR)'}</label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'المستفيد / المورد' : 'Recipient'}</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم الشركة أو المورد"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Bank Transfer">تحويل بنكي</option>
                    <option value="Mada">مدى</option>
                    <option value="Cash">نقداً / كاش</option>
                    <option value="Sadad">سداد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'تاريخ المصروف' : 'Expense Date'}</label>
                <input type="date" required value={newExpenseDate} onChange={(e) => setNewExpenseDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات / رقم الفاتورة' : 'Notes / Invoice No'}</label>
                <textarea
                  rows={2}
                  placeholder={language === 'ar' ? 'رقم الفاتورة الضريبية أو التفاصيل...' : 'Invoice number or details...'}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : editingExpense ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (language === 'ar' ? 'حفظ وإصدار السند' : 'Issue Voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
