import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Archive, 
  CheckCircle2, 
  Printer, 
  ChevronDown, 
  User, 
  DollarSign, 
  Edit3, 
  Eye, 
  CreditCard, 
  MessageSquare, 
  History, 
  ShieldAlert, 
  Send, 
  X, 
  Building, 
  Phone, 
  Check, 
  Lock,
  MessageCircle, Trash2,
  Clock,
  ChevronRight,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { exportStyledExcel, exportStyledPdf } from '../utils/reportExports';
import { Contract, Tenant, Unit, PaymentRecord } from '../types';
import { AzharLogo } from '../components/AzharLogo';
import { EditTenantModal } from '../components/EditTenantModal';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';
import { confirmUi, promptUi } from '../utils/uiDialog';
import { notifyUser } from '../utils/userFeedback';
import { MediaUploadField } from '../components/MediaUploadField';

const contractGrossRent = (c: Pick<Contract, 'annualRent' | 'waterYearlyBill'>) =>
  Math.max(0, Number(c.annualRent || 0)) + Math.max(0, Number(c.waterYearlyBill || 0));

const contractNetDue = (c: Pick<Contract, 'annualRent' | 'waterYearlyBill' | 'discount'>) =>
  Math.max(0, contractGrossRent(c) - Math.max(0, Number(c.discount || 0)));

const getNextPaymentInfo = (c: Contract) => {
  const explicitDate = c.nextPaymentDate ? String(c.nextPaymentDate).slice(0, 10) : '';
  const fallback = (c.installments || [])
    .filter((i: any) => Number(i.paidAmount || 0) < Number(i.amount || 0) && i.status !== 'Cancelled')
    .sort((a: any, b: any) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))[0];
  const rawDate = explicitDate || String(fallback?.dueDate || '');
  if (!rawDate) return { date: '', days: undefined as number | undefined };
  const m = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
  const date = m ? `${m[1]}-${m[2]}-${m[3]}` : (() => { const t = Date.parse(rawDate); return Number.isFinite(t) ? new Date(t).toISOString().slice(0,10) : ''; })();
  if (!date) return { date: '', days: undefined as number | undefined };
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const parts = date.split('-').map(Number);
  const dueUtc = parts.length === 3 && parts.every(Number.isFinite) ? Date.UTC(parts[0], parts[1] - 1, parts[2]) : NaN;
  const days = Number.isFinite(dueUtc) ? Math.round((dueUtc - todayUtc) / 86400000) : undefined;
  return { date, days };
};

const formatNextPaymentDays = (days: number | undefined, language: string) => {
  if (days === undefined) return language === 'ar' ? 'غير محدد' : 'Not set';
  if (days < 0) {
    const n = Math.abs(days);
    return language === 'ar' ? `متأخر ${n} ${n === 1 ? 'يوم' : 'أيام'}` : `${n} day${n === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) return language === 'ar' ? 'اليوم' : 'Today';
  return language === 'ar' ? `متبقي ${days} ${days === 1 ? 'يوم' : 'يومًا'}` : `${days} day${days === 1 ? '' : 's'} left`;
};

interface CompoundContractsProps {
  contracts: Contract[];
  tenants: Tenant[];
  units: Unit[];
  showArchivedOnly?: boolean;
  onAddContract: (contract: Omit<Contract, 'id'>) => void;
  onUpdateContract: (updated: Contract) => void;
  onToggleArchive: (id: string) => void;
  onDeleteContract?: (id: string) => Promise<void> | void;
  selectedCompoundId: string;
}

export const CompoundContracts: React.FC<CompoundContractsProps> = ({
  contracts,
  tenants,
  units,
  showArchivedOnly = false,
  onAddContract,
  onUpdateContract,
  onToggleArchive,
  onDeleteContract,
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top:number; left:number } | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ field, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    type: 'details' | 'edit' | 'payment' | 'ledger' | 'notes' | 'unit_history' | 'tenant_history' | 'print' | null;
    contract: Contract | null;
  }>({ type: null, contract: null });

  // Add Form State
  const [newContractNo, setNewContractNo] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(0);
  const [annualRent, setAnnualRent] = useState(0);
  const [unitType, setUnitType] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [tenantMobile, setTenantMobile] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [waterMeterCost, setWaterMeterCost] = useState(0);
  const [paymentFrequency, setPaymentFrequency] = useState<'Every-4-Months' | 'Quarterly' | 'Semi-Annual' | 'Annual' | ''>('');
  const [contractDocumentUrl, setContractDocumentUrl] = useState('');
  const [contractDocumentName, setContractDocumentName] = useState('');

  // Edit Form state
  const [editForm, setEditForm] = useState<Partial<Contract>>({});
  const [editWaterMeterCost, setEditWaterMeterCost] = useState(0);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMonth, setPaymentMonth] = useState(new Date().getMonth() + 1);
  const [paymentYear, setPaymentYear] = useState(new Date().getFullYear());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Contract payments list
  const [contractPayments, setContractPayments] = useState<PaymentRecord[]>([]);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerBusy, setLedgerBusy] = useState(false);

  // Notes state for selected contract
  const [newNoteText, setNewNoteText] = useState('');

  // Payment table state (for expanded row)
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentEntries, setPaymentEntries] = useState(10);
  const [paymentPage, setPaymentPage] = useState(1);

  const filteredContracts = contracts.filter(c => {
    const isArchived = c.status === 'Archived';
    if (showArchivedOnly ? !isArchived : isArchived) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.contractNo.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q) ||
        c.unitNumber.toLowerCase().includes(q) ||
        c.tenantMobile.toLowerCase().includes(q) ||
        (c.emergencyPhone && c.emergencyPhone.includes(q))
      );
    }
    return true;
  });

  const sortedContracts = React.useMemo(() => {
    if (!sortConfig) return filteredContracts;
    return [...filteredContracts].sort((a: any, b: any) => {
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
  }, [filteredContracts, sortConfig]);

  // Calculate totals matching screenshot total (1,203,000 SAR)
  const totalAnnualRent = filteredContracts.reduce((sum, c) => sum + contractGrossRent(c), 0);
  const totalPaid = filteredContracts.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const totalRemaining = filteredContracts.reduce((sum, c) => sum + (c.remainingAmount ?? Math.max(0, contractNetDue(c) - Number(c.paidAmount || 0))), 0);

  const calculateLeaseEndDate = (start: string, months: number) => {
    const parts = start.split(/[\/-]/).map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
    let date: Date;
    if (parts[0] > 31) date = new Date(parts[0], parts[1] - 1, parts[2]);
    else date = new Date(parts[2], parts[1] - 1, parts[0]);
    if (Number.isNaN(date.getTime())) return '';
    date.setMonth(date.getMonth() + months);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
  };

  const resetAddContractForm = () => {
    setNewContractNo('');
    setTenantId('');
    setUnitId('');
    setStartDate('');
    setDurationMonths(0);
    setAnnualRent(0);
    setUnitType('');
    setDiscount(0);
    setPaidAmount(0);
    setTenantMobile('');
    setEmergencyPhone('');
    setWaterMeterCost(0);
    setPaymentFrequency('');
    setContractDocumentUrl('');
    setContractDocumentName('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selTenant = tenants.find(t => t.id === tenantId);
    const selUnit = units.find(u => u.id === unitId);
    if (!newContractNo.trim() || !selTenant || !selUnit || !startDate || Number(durationMonths) <= 0 || Number(annualRent) <= 0 || !paymentFrequency) return;

    const rent = Number(annualRent);
    const paid = 0;
    const disc = Number(discount);
    const waterCost = Number(waterMeterCost || 0);
    const total = rent + waterCost;
    const rem = total - disc - paid;

    onAddContract({
      contractNo: newContractNo,
      compoundId: selUnit.compoundId || '1',
      compoundName: selUnit.compoundName || 'Azhar Residence',
      houseId: selUnit.id,
      buildingNumber: selUnit.buildingNumber || '',
      unitNumber: selUnit.unitNumber,
      unitType: unitType || selUnit.type || '',
      tenantId: selTenant.id,
      tenantName: selTenant.name,
      tenantMobile: tenantMobile || selTenant.mobile || '',
      emergencyPhone: emergencyPhone,
      leaseStartDate: startDate,
      leaseDurationMonths: Number(durationMonths),
      leaseEndDate: calculateLeaseEndDate(startDate, Number(durationMonths)),
      annualRent: rent,
      waterYearlyBill: waterCost,
      totalYearlyRent: total,
      netYearlyRent: Math.max(0, total - disc),
      discount: disc,
      paidAmount: paid,
      remainingAmount: rem > 0 ? rem : 0,
      paymentFrequency: paymentFrequency as Exclude<typeof paymentFrequency, ''>,
      status: 'Active',
      contractDocumentUrl: contractDocumentUrl || undefined,
      electricityMeterNumber: selUnit.electricityMeterNumber || '',
      contractDocumentName: contractDocumentName || undefined,
      notes: [],
      installments: []
    });

    setShowAddModal(false);
    resetAddContractForm();
  };

  const handleOpenEdit = (c: Contract) => {
    setEditForm({ ...c });
    setEditWaterMeterCost(c.waterYearlyBill || 0);
    setActiveModal({ type: 'edit', contract: c });
    setOpenDropdownId(null);
  };

  const loadContractPayments = async (contract: Contract) => {
    try {
      const allPayments = await apiService.getPayments();
      const filtered = allPayments.filter(p => (p.contractId && p.contractId === contract.id) || (!p.contractId && (p.tenantId === contract.tenantId || p.unitNumber === contract.unitNumber)));
      setContractPayments(filtered);
    } catch (err) {
      console.error('Failed to load payments', err);
      setContractPayments([]);
    }
  };

  const openLedger = async (contract: Contract) => {
    setActiveModal({ type: 'ledger', contract }); setOpenDropdownId(null); setLedgerBusy(true);
    try { setLedgerData(await apiService.getRentLedger(contract.id)); } catch (err) { console.error(err); setLedgerData(null); } finally { setLedgerBusy(false); }
  };
  const openPayment = async (contract: Contract) => {
    setActiveModal({ type: 'payment', contract });
    setOpenDropdownId(null);
    setLedgerData(null);
    setPaymentAmount(0); setPaymentReference(''); setPaymentNotes('');
    await Promise.all([
      loadContractPayments(contract),
      apiService.getRentLedger(contract.id).then(fresh => {
        setLedgerData(fresh);
        setActiveModal(prev => prev.contract?.id === contract.id ? { ...prev, contract: { ...prev.contract, paidAmount: Number(fresh.finance?.paid||0), remainingAmount: Number(fresh.finance?.remaining||0) } } : prev);
      }).catch(err => console.error('Failed to load payment ledger', err))
    ]);
  };
  const handleReversePayment = async (payment: PaymentRecord) => {
    const reason = await promptUi({ title: language === 'ar' ? 'عكس الدفعة' : 'Reverse payment', message: language === 'ar' ? 'اكتب سبب عكس الدفعة. سيتم الاحتفاظ بالحركة في السجل المالي.' : 'Enter the reversal reason. The transaction will remain in the financial history.', inputLabel: language === 'ar' ? 'سبب العكس' : 'Reversal reason', defaultValue: language === 'ar' ? 'تصحيح عملية' : 'Correction', confirmText: language === 'ar' ? 'عكس الدفعة' : 'Reverse payment', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'warning' });
    if (!reason) return;
    try { await apiService.reversePayment(payment.id, reason); if(activeModal.contract){ await loadContractPayments(activeModal.contract); setLedgerData(await apiService.getRentLedger(activeModal.contract.id)); } } catch(err){ console.error(err); }
  };
  const handleTerminate = async (contract: Contract) => {
    const date = await promptUi({ title: language === 'ar' ? 'إنهاء العقد' : 'Terminate contract', message: language === 'ar' ? 'حدد تاريخ إنهاء العقد لحساب التسوية النهائية.' : 'Select the termination date to calculate the final settlement.', inputLabel: language === 'ar' ? 'تاريخ الإنهاء' : 'Termination date', inputType: 'date', defaultValue: new Date().toISOString().slice(0,10), confirmText: language === 'ar' ? 'حساب التسوية' : 'Calculate', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'warning' }); if(!date) return;
    try { const preview=await apiService.getFinalSettlement(contract.id,date); const msg=language==='ar'?`التسوية النهائية: مستحق ${preview.amountDue||0}، رصيد/استرداد ${preview.refundDue||0}. اكتب سبب الإنهاء للمتابعة.`:`Final settlement: due ${preview.amountDue||0}, refund/credit ${preview.refundDue||0}. Enter termination reason.`; const reason=await promptUi({ title: language === 'ar' ? 'تأكيد التسوية النهائية' : 'Confirm final settlement', message: msg, inputLabel: language === 'ar' ? 'سبب الإنهاء' : 'Termination reason', defaultValue: language==='ar'?'إنهاء العقد':'Termination', confirmText: language === 'ar' ? 'إنهاء العقد' : 'Terminate contract', cancelText: language === 'ar' ? 'رجوع' : 'Back', tone: 'danger' }); if(!reason)return; await apiService.terminateContract(contract.id,date,reason); setActiveModal({type:null,contract:null}); } catch(err){ console.error(err); }
  };
  const handleDeleteContract = async (contract: Contract) => {
    if (!onDeleteContract) return;
    const ok = await confirmUi({ title: language === 'ar' ? 'حذف العقد نهائيًا' : 'Delete contract permanently', message: language === 'ar' ? `سيتم حذف العقد ${contract.contractNo || contract.contractNumber || contract.id} نهائيًا. لا يمكن الحذف إذا كان عليه أي مبلغ مستحق.` : `Contract ${contract.contractNo || contract.contractNumber || contract.id} will be permanently deleted. Deletion is blocked when any balance is outstanding.`, confirmText: language === 'ar' ? 'حذف نهائي' : 'Delete permanently', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel', tone: 'danger' });
    if (!ok) return;
    try { await onDeleteContract(contract.id); setOpenDropdownId(null); setDropdownPosition(null); } catch (err) { console.error('Failed to delete contract', err); }
  };

  const handleRenew = async (contract: Contract) => {
    const start=await promptUi({ title: language === 'ar' ? 'تجديد العقد' : 'Renew contract', message: language === 'ar' ? 'حدد تاريخ بداية العقد الجديد.' : 'Select the new contract start date.', inputLabel: language === 'ar' ? 'بداية العقد الجديد' : 'New contract start', inputType: 'date', defaultValue: contract.leaseEndDate || new Date().toISOString().slice(0,10), confirmText: language === 'ar' ? 'التالي' : 'Next', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel' }); if(!start)return;
    const rentRaw=await promptUi({ title: language === 'ar' ? 'قيمة الإيجار الجديد' : 'New annual rent', message: language === 'ar' ? 'أدخل إيجار الوحدة السنوي للعقد الجديد. ستضاف تكلفة المياه تلقائيًا حسب بيانات العقد.' : 'Enter the annual unit rent for the renewed contract. Water cost will be included automatically.', inputLabel: language === 'ar' ? 'إيجار الوحدة السنوي' : 'Annual unit rent', inputType: 'number', defaultValue: String(contract.annualRent||0), confirmText: language === 'ar' ? 'تجديد العقد' : 'Renew contract', cancelText: language === 'ar' ? 'إلغاء' : 'Cancel' }); if(rentRaw===null)return;
    try { await apiService.renewContract(contract.id,{leaseStartDate:start,annualRent:Number(rentRaw),totalYearlyRent:Number(rentRaw)+Number(contract.waterYearlyBill||0)-Number(contract.discount||0),paymentFrequency:contract.paymentFrequency}); setActiveModal({type:null,contract:null}); } catch(err){ console.error(err); }
  };

  const handleRecordPayment = async () => {
    if (!activeModal.contract || paymentAmount <= 0) return;
    const currentRemaining = Number(ledgerData?.finance?.remaining ?? activeModal.contract.remainingAmount ?? 0);
    const normalizedAmount = Math.round(Number(paymentAmount) * 100) / 100;
    if (normalizedAmount > currentRemaining + 0.005) {
      notifyUser({ kind: 'warning', ar: `المبلغ لا يمكن أن يتجاوز المتبقي (${currentRemaining.toLocaleString()} SAR)`, en: `Amount cannot exceed remaining balance (${currentRemaining.toLocaleString()} SAR)` });
      return;
    }
    try {
      const newPayment = await apiService.addPayment({
        contractId: activeModal.contract.id,
        tenantId: activeModal.contract.tenantId,
        tenantName: activeModal.contract.tenantName,
        unitNumber: activeModal.contract.unitNumber,
        amount: normalizedAmount,
        month: paymentMonth,
        year: paymentYear,
        paymentMethod,
        referenceNo: paymentReference,
        notes: paymentNotes,
        status: paymentStatus
      });
      setContractPayments(prev => [...prev, newPayment]);
      setPaymentAmount(0); setPaymentReference(''); setPaymentNotes('');
      const freshLedger = await apiService.getRentLedger(activeModal.contract.id);
      setLedgerData(freshLedger);
      const nextDueDate = freshLedger.finance?.next_due_date ? String(freshLedger.finance.next_due_date).slice(0, 10) : '';
      const nextDays = nextDueDate ? getNextPaymentInfo({ ...activeModal.contract, nextPaymentDate: nextDueDate }).days : undefined;
      const refreshedContract = {
        ...activeModal.contract,
        paidAmount: Number(freshLedger.finance?.paid || 0),
        remainingAmount: Number(freshLedger.finance?.remaining || 0),
        nextPaymentDate: nextDueDate || undefined,
        nextPaymentDays: nextDays
      };
      onUpdateContract(refreshedContract);
      setActiveModal(prev => prev.contract ? { ...prev, contract: refreshedContract } : prev);
    } catch (err) {
      console.error('Failed to record payment', err);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal.contract && editForm.id) {
      const rent = Number(editForm.annualRent || 0);
      const paid = Number(editForm.paidAmount || 0);
      const disc = Number(editForm.discount || 0);
      const waterCost = Number(editWaterMeterCost || 0);
      const total = rent + waterCost;
      const rem = total - disc - paid;

      const updatedContract: Contract = {
        ...(activeModal.contract),
        ...(editForm as Contract),
        waterYearlyBill: waterCost,
        totalYearlyRent: total,
        netYearlyRent: Math.max(0, total - disc),
        paymentFrequency: (editForm as any).paymentMethod || editForm.paymentFrequency || 'Quarterly',
        remainingAmount: rem >= 0 ? rem : 0
      };

      onUpdateContract(updatedContract);
      setActiveModal({ type: null, contract: null });
    }
  };

  const handleWhatsAppSend = (c: Contract) => {
    const rawMobile = c.tenantMobile ? c.tenantMobile.replace(/\D/g, '') : '';
    const formattedPhone = rawMobile.startsWith('0') ? `966${rawMobile.slice(1)}` : rawMobile.startsWith('966') ? rawMobile : `966${rawMobile}`;
    const text = encodeURIComponent(
      `مرحباً السيد/ة ${c.tenantName} المحترم،\n` +
      `تحية طيبة من إدارة كمبوند أزهار (Azhar Residence).\n` +
      `نود إشعاركم بتفاصيل عقد إيجار الوحدة رقم (${c.unitNumber}) - عقد رقم (${c.contractNo}).\n` +
      `إيجار الوحدة السنوي: ${Number(c.annualRent || 0).toLocaleString()} ريال.\n` +
      `المياه السنوية: ${Number(c.waterYearlyBill || 0).toLocaleString()} ريال.\n` +
      `إجمالي الإيجار (الوحدة + المياه): ${contractGrossRent(c).toLocaleString()} ريال.\n` +
      `صافي المستحق بعد الخصم: ${contractNetDue(c).toLocaleString()} ريال.\n` +
      `المبلغ المدفوع: ${c.paidAmount.toLocaleString()} ريال.\n` +
      `المبلغ المتبقي: ${c.remainingAmount.toLocaleString()} ريال.\n` +
      `نتمنى لكم إقامة سعيدة، وفي حال وجود أي استفسار يرجى التواصل معنا.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
    setOpenDropdownId(null);
  };

  const handleToggleBlock = (c: Contract) => {
    const updatedStatus = c.status === 'Blocked' ? 'Active' : 'Blocked';
    onUpdateContract({ ...c, status: updatedStatus });
    setOpenDropdownId(null);
  };

  const handleAddNote = (c: Contract) => {
    if (!newNoteText.trim()) return;
    const existingNotes = c.notes || [];
    const newNote = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-GB'),
      author: '',
      text: newNoteText.trim()
    };
    const updated = {
      ...c,
      notes: [newNote, ...existingNotes]
    };
    onUpdateContract(updated);
    setActiveModal({ type: 'notes', contract: updated });
    setNewNoteText('');
  };

  const handleExportExcel = () => {
    const rows = filteredContracts.map((c, idx) => [
      idx + 1, c.contractNo, c.unitNumber, c.unitType || 'Apartment', c.tenantName,
      c.tenantMobile || '-', c.annualRent || 0, c.waterYearlyBill || 0,
      contractGrossRent(c), c.discount || 0, contractNetDue(c),
      c.paidAmount || 0, c.remainingAmount || 0, c.leaseStartDate || '-',
      c.leaseEndDate || '-', c.leaseDurationMonths || 12, c.status || '-'
    ]);
    const gross = filteredContracts.reduce((s,c)=>s+contractGrossRent(c),0);
    const paid = filteredContracts.reduce((s,c)=>s+Number(c.paidAmount||0),0);
    const remaining = filteredContracts.reduce((s,c)=>s+Number(c.remainingAmount||0),0);
    exportStyledExcel({
      sheetName: 'Contracts',
      fileName: `Azhar_Residence_Contracts_${new Date().toISOString().split('T')[0]}.xlsx`,
      title: 'AZHAR RESIDENCE — Contracts Register',
      subtitle: `Contracts & financial summary • Generated ${new Date().toLocaleString('en-GB')}`,
      columns: ['#','Contract No','Unit #','Type','Tenant Name','Mobile','Unit Rent','Water','Gross Rent','Discount','Net Due','Paid','Remaining','Next Payment Date','Days Left','Start Date','End Date','Duration (Months)','Status'],
      rows,
      kpis: [
        { label: 'Contracts', value: filteredContracts.length },
        { label: 'Gross Rent', value: gross },
        { label: 'Paid', value: paid },
        { label: 'Remaining', value: remaining }
      ],
      totalRow: ['', '', '', '', 'TOTAL', '', '', '', gross, '', '', paid, remaining, '', '', '', '', '', '']
    });
  };

  const handleExportPDF = () => {
    const body = filteredContracts.map((c, idx) => [
      idx + 1, c.contractNo, c.unitNumber, c.unitType || 'Apartment', c.tenantName,
      c.tenantMobile || '-', `${Number(c.annualRent||0).toLocaleString()} SAR`,
      `${Number(c.waterYearlyBill||0).toLocaleString()} SAR`,
      `${contractGrossRent(c).toLocaleString()} SAR`,
      `${Number(c.paidAmount||0).toLocaleString()} SAR`,
      `${Number(c.remainingAmount||0).toLocaleString()} SAR`,
      getNextPaymentInfo(c).date || '-',
      formatNextPaymentDays(getNextPaymentInfo(c).days, 'en'),
      c.leaseEndDate || '-'
    ]);
    const gross = filteredContracts.reduce((s,c)=>s+contractGrossRent(c),0);
    const paid = filteredContracts.reduce((s,c)=>s+Number(c.paidAmount||0),0);
    const remaining = filteredContracts.reduce((s,c)=>s+Number(c.remainingAmount||0),0);
    exportStyledPdf({
      title: 'Contracts & Financial Register',
      subtitle: `Generated ${new Date().toLocaleString('en-GB')}`,
      headers: ['#','Contract No','Unit #','Type','Tenant Name','Mobile','Unit Rent','Water','Gross Rent','Paid','Remaining','Next Payment Date','Days Left','End Date'],
      body,
      kpis: [
        { label: 'Contracts', value: String(filteredContracts.length) },
        { label: 'Gross Rent', value: `${gross.toLocaleString()} SAR` },
        { label: 'Paid', value: `${paid.toLocaleString()} SAR` },
        { label: 'Remaining', value: `${remaining.toLocaleString()} SAR` }
      ],
      totals: ['', '', '', '', 'TOTAL', '', '', '', `${gross.toLocaleString()} SAR`, `${paid.toLocaleString()} SAR`, `${remaining.toLocaleString()} SAR`, '', '', ''],
      fileName: `Azhar_Residence_Contracts_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="space-y-5 dir-rtl text-right">
      {/* Header Banner with Azhar Residence Branding */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-900 rounded-xl shadow-md hidden sm:block">
            <AzharLogo variant="light" size="sm" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#29b4c4] uppercase tracking-wider mb-0.5">
              <FileText className="w-4 h-4" />
              <span>كمبوند أزهار - Azhar Residence</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {showArchivedOnly ? 'العقود المؤرشفة - كمبوند أزهار' : 'سجل العقود والتحرير (Contract Management)'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              إدارة جميع عقود الإيجار، العمليات والتحرير، متابعة المبالغ المدفوعة والمتبقية، والطباعة الرسمية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير إكسل</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>

          {!showArchivedOnly && (
            <button
              onClick={() => { resetAddContractForm(); setShowAddModal(true); }}
              className="px-4 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عقد جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم العقد، اسم المستأجر، رقم الوحدة، أو رقم الهوية والجوال..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
          />
        </div>

        {/* Total Stats Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl font-semibold text-slate-700">
            عدد العقود: <span className="font-bold text-slate-900">{filteredContracts.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold text-emerald-800">
            المحصل: <span className="font-bold font-mono">{totalPaid.toLocaleString()} SAR</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold text-amber-800">
            المتبقي: <span className="font-bold font-mono">{totalRemaining.toLocaleString()} SAR</span>
          </div>
        </div>
      </div>

      {/* Main Contracts Table Matching Screenshot (Image 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2b62af] text-white uppercase text-[11px] font-bold tracking-wider select-none border-b border-blue-900">
              <tr>
                <th className="py-3 px-2 text-center w-8 border-r border-blue-600/40">+</th>
                <th className="py-3 px-3 text-center border-r border-blue-600/40">#</th>
                
                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('contractNo')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم العقد' : 'Contract No'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('unitNumber')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم الوحدة' : 'Unit #'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('unitType')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'النوع' : 'Type'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('annualRent')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('discount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('paidAmount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-left" onClick={() => handleSort('remainingAmount')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('nextPaymentDate')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'موعد الدفعة القادمة' : 'Next Payment Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('nextPaymentDays')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الأيام المتبقية' : 'Days Left'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40" onClick={() => handleSort('tenantName')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'اسم المستأجر' : 'Tenant Name'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('tenantMobile')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'الجوال' : 'Mobile'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('emergencyPhone')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'رقم الطوارئ' : 'Emergency Phone'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                

                <th className="py-3 px-3 border-r border-blue-600/40 font-mono" onClick={() => handleSort('leaseStartDate')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 border-r border-blue-600/40 text-center" onClick={() => handleSort('leaseDurationMonths')}>
                  <div className="flex items-center justify-center gap-1 cursor-pointer select-none hover:text-cyan-200">
                    <span>{language === 'ar' ? 'المدة (شهر)' : 'Duration'}</span>
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  </div>
                </th>

                <th className="py-3 px-3 text-center">
                  <span>{language === 'ar' ? 'العمليات' : 'Operations'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium bg-white">
              {sortedContracts.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400 font-medium">
                    {language === 'ar' ? 'لا توجد عقود مطابقة للبحث حالياً في مجمع أزهار السكني.' : 'No contracts match search criteria.'}
                  </td>
                </tr>
              ) : (
                sortedContracts.map((c, idx) => {
                  const isExpanded = expandedRowId === c.id;
                  const isBlocked = c.status === 'Blocked';

                  return (
                    <React.Fragment key={c.id}>
                      <tr className={`hover:bg-cyan-50/40 transition-colors ${isBlocked ? 'bg-rose-50/50' : ''}`}>
                        {/* Expand Icon */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : c.id)}
                            className="w-5 h-5 bg-slate-100 hover:bg-[#29b4c4] hover:text-white rounded text-slate-600 font-bold flex items-center justify-center transition-colors text-[11px]"
                          >
                            {isExpanded ? '-' : '+'}
                          </button>
                        </td>

                        {/* Row Number */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-l border-slate-100">
                          {idx + 3}
                        </td>

                        {/* Contract No */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-l border-slate-100">
                          <span className="flex items-center gap-1">
                            {c.contractNo}
                            {isBlocked && (
                              <span className="px-1 py-0.5 bg-rose-600 text-white text-[9px] rounded font-sans">
                                Blocked
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Unit # */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 border-l border-slate-100">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {c.unitNumber}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3 text-slate-700 border-l border-slate-100 whitespace-nowrap">
                          {c.unitType || 'Appartment'}
                        </td>

                        {/* Annual Rent */}
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900 border-l border-slate-100">
                          {contractGrossRent(c).toLocaleString()}
                          <div className="text-[9px] font-normal text-slate-400">{Number(c.annualRent || 0).toLocaleString()} + {Number(c.waterYearlyBill || 0).toLocaleString()} مياه</div>
                        </td>

                        {/* Discount */}
                        <td className="py-2.5 px-3 text-left font-mono text-slate-600 border-l border-slate-100">
                          {c.discount || 0}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-2.5 px-3 text-left font-mono font-semibold text-emerald-700 border-l border-slate-100">
                          {c.paidAmount.toLocaleString()}
                        </td>

                        {/* Remaining Amount */}
                        <td className="py-2.5 px-3 text-left font-mono font-semibold text-amber-700 border-l border-slate-100">
                          {c.remainingAmount.toLocaleString()}
                        </td>

                        {/* Next Payment Date + Days Remaining */}
                        {(() => {
                          const next = getNextPaymentInfo(c);
                          return (
                            <>
                              <td className="py-2.5 px-3 text-center font-mono font-semibold text-blue-700 border-l border-slate-100 whitespace-nowrap">
                                {next.date || (language === 'ar' ? 'مسدد بالكامل' : 'Fully paid')}
                              </td>
                              <td className={`py-2.5 px-3 text-center font-bold border-l border-slate-100 whitespace-nowrap ${
                                next.days !== undefined && next.days < 0 ? 'text-rose-700' :
                                next.days !== undefined && next.days <= 7 ? 'text-amber-700' : 'text-emerald-700'
                              }`}>
                                {next.date ? formatNextPaymentDays(next.days, language) : (language === 'ar' ? 'مسدد' : 'Paid')}
                              </td>
                            </>
                          );
                        })()}

                        {/* Tenant Name */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 border-l border-slate-100 whitespace-nowrap">
                          {c.tenantName}
                        </td>

                        {/* Mobile */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 border-l border-slate-100">
                          {c.tenantMobile || '-'}
                        </td>

                        {/* Emergency Phone */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 border-l border-slate-100">
                          {c.emergencyPhone || '-'}
                        </td>

                        {/* Start Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 border-l border-slate-100 whitespace-nowrap">
                          {c.leaseStartDate}
                        </td>

                        {/* Duration */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 border-l border-slate-100">
                          {c.leaseDurationMonths || 12}
                        </td>

                        {/* Operations Dropdown Button Matching Screenshot */}
                        <td className="py-2.5 px-3 text-center relative">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                openPayment(c);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md shadow-sm transition-all flex items-center justify-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{language === 'ar' ? 'دفع' : 'Pay'}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                const nextOpen = openDropdownId !== c.id;
                                if (nextOpen) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const width = 176;
                                  setDropdownPosition({ top: rect.bottom + 6, left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)) });
                                  setOpenDropdownId(c.id);
                                } else { setOpenDropdownId(null); setDropdownPosition(null); }
                              }}
                              className="px-3 py-1 bg-[#475569] hover:bg-[#334155] text-white text-[11px] font-bold rounded-md shadow-sm transition-all flex items-center justify-center gap-1"
                            >
                              <span>{language === 'ar' ? 'العمليات' : 'Operation'}</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* EXACT OPERATIONS DROPDOWN FROM SCREENSHOT (IMAGE 2) */}
                          {openDropdownId === c.id && (
                            <div 
                              className="fixed w-44 bg-white border border-slate-200 rounded-lg shadow-2xl py-1 z-[9999] text-right text-xs font-medium text-slate-700"
                              style={{ top: dropdownPosition?.top ?? 0, left: dropdownPosition?.left ?? 0 }}
                              onMouseLeave={() => setOpenDropdownId(null)}
                            >
                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'details', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'التفاصيل' : 'Details'}</span>
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                                <Edit3 className="w-3.5 h-3.5 text-cyan-600" />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'payment', contract: c });
                                  loadContractPayments(c);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'سجل الدفعات' : 'Payment'}</span>
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                              </button>

                              <button onClick={() => openLedger(c)} className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between">
                                <span>{language === 'ar' ? 'كشف حساب العقد' : 'Rent Ledger'}</span><FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              {c.status !== 'Archived' && <button onClick={() => handleRenew(c)} className="w-full text-right px-4 py-2 hover:bg-emerald-50 flex items-center justify-between text-emerald-700">
                                <span>{language === 'ar' ? 'تجديد العقد' : 'Renew Contract'}</span><History className="w-3.5 h-3.5" />
                              </button>}
                              {c.status !== 'Archived' && <button onClick={() => handleTerminate(c)} className="w-full text-right px-4 py-2 hover:bg-rose-50 flex items-center justify-between text-rose-700">
                                <span>{language === 'ar' ? 'إنهاء وتسوية العقد' : 'Terminate & Settle'}</span><Archive className="w-3.5 h-3.5" />
                              </button>}

                              {c.status === 'Archived' && <button onClick={() => openLedger(c)} className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between text-slate-500">
                                <span>{language === 'ar' ? 'العقد مؤرشف - عرض التسوية' : 'Archived - View ledger'}</span><Archive className="w-3.5 h-3.5 text-amber-600" />
                              </button>}

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'notes', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'الملاحظات' : 'Notes'}</span>
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'unit_history', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'سجل الوحدة' : 'Unit History'}</span>
                                <History className="w-3.5 h-3.5 text-blue-600" />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'tenant_history', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between"
                              >
                                <span>{language === 'ar' ? 'سجل المستأجر' : 'Tenant History'}</span>
                                <User className="w-3.5 h-3.5 text-violet-600" />
                              </button>

                              <button
                                onClick={() => handleWhatsAppSend(c)}
                                className="w-full text-right px-4 py-2 hover:bg-[#25D366]/10 hover:text-emerald-700 flex items-center justify-between text-emerald-600"
                              >
                                <span>{language === 'ar' ? 'إرسال واتساب' : 'Send whatsapp'}</span>
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </button>

                              <button
                                onClick={() => handleToggleBlock(c)}
                                className="w-full text-right px-4 py-2 hover:bg-rose-50 flex items-center justify-between text-rose-600"
                              >
                                <span>{isBlocked ? (language === 'ar' ? 'إلغاء الحظر' : 'Unblock') : (language === 'ar' ? 'حظر العقد' : 'Block')}</span>
                                <Lock className="w-3.5 h-3.5 text-rose-600" />
                              </button>

                              {onDeleteContract && <button onClick={() => handleDeleteContract(c)} className="w-full text-right px-4 py-2 hover:bg-rose-50 flex items-center justify-between text-rose-700 font-bold">
                                <span>{language === 'ar' ? 'حذف العقد نهائيًا' : 'Delete permanently'}</span><Trash2 className="w-3.5 h-3.5" />
                              </button>}

                              <div className="border-t border-slate-100 my-1" />

                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'print', contract: c });
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-900"
                              >
                                <span>{language === 'ar' ? 'طباعة العقد' : 'Print'}</span>
                                <Printer className="w-3.5 h-3.5 text-slate-700" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={18} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                              <div><span className="text-slate-500 block">Contract</span><b>{c.contractNo}</b></div>
                              <div><span className="text-slate-500 block">Frequency</span><b>{c.paymentFrequency}</b></div>
                              <div><span className="text-slate-500 block">End date</span><b>{c.leaseEndDate}</b></div>
                              <div><span className="text-slate-500 block">Paid</span><b className="text-emerald-700">{c.paidAmount.toLocaleString()} SAR</b></div>
                              <div><span className="text-slate-500 block">Remaining</span><b className="text-amber-700">{c.remainingAmount.toLocaleString()} SAR</b></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW CONTRACT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AzharLogo variant="dark" size="sm" />
                <h3 className="text-base font-bold text-slate-900 mr-2">
                  تحرير عقد جديد - كمبوند أزهار
                </h3>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); resetAddContractForm(); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم العقد (Contract No)</label>
                  <input
                    type="text"
                    required
                    value={newContractNo}
                    onChange={(e) => setNewContractNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اختر المستأجر</label>
                  <select
                    required
                    value={tenantId}
                    onChange={(e) => {
                      setTenantId(e.target.value);
                      const t = tenants.find(x => x.id === e.target.value);
                      if (t) {
                        setTenantMobile(t.mobile);
                        setEmergencyPhone(t.emergencyPhone || '');
                        if (t.waterCost !== undefined && t.waterCost !== '') setWaterMeterCost(Number(t.waterCost || 0));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="" disabled>اختر المستأجر</option>
                    {tenants.filter(t => !t.archived && t.isActive !== false).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.mobile})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اختر الوحدة (Unit #)</label>
                  <select
                    required
                    value={unitId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setUnitId(nextId);
                      const selectedUnit = units.find(u => u.id === nextId);
                      if (selectedUnit) {
                        setAnnualRent(Number(selectedUnit.annualRent || 0));
                        setUnitType(selectedUnit.type || 'Appartment');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="" disabled>اختر الوحدة</option>
                    {units.filter(u => u.status === 'Vacant' || u.status === 'Available').map(u => (
                      <option key={u.id} value={u.id}>
                        وحدة {u.unitNumber} ({u.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع الوحدة (Type)</label>
                  <select
                    required
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="" disabled>اختر نوع الوحدة</option>
                    <option value="Appartment">Appartment</option>
                    <option value="Villa Duplex">Villa Duplex</option>
                    <option value="Villa">Villa</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الجوال (Mobile)</label>
                  <input
                    type="text"
                    value={tenantMobile}
                    onChange={(e) => setTenantMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الطوارئ (Emergency)</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

               <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">إيجار الوحدة السنوي</label>
                   <input
                     type="number"
                     required
                     min="0"
                     step="0.01"
                     inputMode="decimal"
                     value={annualRent || ''}
                     onChange={(e) => setAnnualRent(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                   />
                 </div>

                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">تكلفة المياه السنوية</label>
                   <input
                     type="number"
                     min="0"
                     step="0.01"
                     inputMode="decimal"
                     value={waterMeterCost || ''}
                     onChange={(e) => setWaterMeterCost(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                   />
                 </div>

                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">الخصم (Discount)</label>
                   <input
                     type="number"
                     min="0"
                     step="0.01"
                     inputMode="decimal"
                     value={discount || ''}
                     onChange={(e) => setDiscount(Number(e.target.value))}
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                   />
                 </div>

                 
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1">طريقة الدفع</label>
                   <select
                     required
                     value={paymentFrequency}
                     onChange={(e) => setPaymentFrequency(e.target.value as any)}
                     className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                   >
                     <option value="" disabled>اختر دورية السداد</option>
                     <option value="Every-4-Months">Every 4 Months - 3 Payments (كل 4 أشهر - 3 دفعات)</option>
                     <option value="Quarterly">Quarterly (ربع سنوي - 4 دفعات)</option>
                     <option value="Semi-Annual">Semi-Annual (نصف سنوي - دفعتان)</option>
                     <option value="Annual">Annual (سنوي - دفعة واحدة)</option>
                   </select>
                 </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">إجمالي الإيجار (إيجار الوحدة + المياه)</label>
                  <div className="w-full px-3 py-2 bg-[#29b4c4]/10 border border-[#29b4c4]/30 rounded-xl font-mono font-bold text-[#0e7a87] text-center">
                    {(annualRent + waterMeterCost).toLocaleString()} SAR
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">صافي المستحق بعد الخصم</label>
                  <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-800 text-center">
                    {Math.max(0, annualRent + waterMeterCost - discount).toLocaleString()} SAR
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المبلغ المتبقي</label>
                  <div className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl font-mono text-amber-800 font-bold text-center">
                    {(annualRent + waterMeterCost - discount - paidAmount).toLocaleString()} SAR
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاريخ بداية العقد (Start Date)</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مدة العقد (شهور)</label>
                  <select
                    required
                    value={durationMonths || ''}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="" disabled>اختر مدة العقد</option>
                    <option value={6}>6 شهور</option>
                    <option value={12}>12 شهر (سنة واحدة)</option>
                    <option value={24}>24 شهر (سنتين)</option>
                  </select>
                </div>
              </div>

              <MediaUploadField
                label={language === 'ar' ? 'رفع نسخة العقد يدوياً' : 'Upload Manual Contract Copy'}
                category="contract-document" entityType="contract"
                value={contractDocumentUrl} fileName={contractDocumentName} accept="image/jpeg,image/png,image/webp,application/pdf"
                onUploaded={({url,fileName}) => { setContractDocumentUrl(url); setContractDocumentName(fileName); }}
                onClear={() => { setContractDocumentUrl(''); setContractDocumentName(''); }}
              />

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetAddContractForm(); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  اعتماد وحفظ العقد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTRACT MODAL */}
      {activeModal.type === 'edit' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="text-base font-bold text-slate-900">
                  تعديل بيانات العقد رقم ({activeModal.contract.contractNo})
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contract No</label>
                    <input
                      type="text"
                      value={editForm.contractNo || ''}
                      onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tenant Name</label>
                    <input
                      type="text"
                      value={editForm.tenantName || ''}
                      onChange={(e) => setEditForm({ ...editForm, tenantName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit #</label>
                    <input
                      type="text"
                      value={editForm.unitNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, unitNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Type</label>
                    <select
                      value={editForm.unitType || ''}
                      onChange={(e) => setEditForm({ ...editForm, unitType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="Villa Duplex">Villa Duplex</option>
                      <option value="Villa">Villa</option>
                      <option value="Warehouse">Warehouse</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mobile</label>
                    <input
                      type="text"
                      value={editForm.tenantMobile || ''}
                      onChange={(e) => setEditForm({ ...editForm, tenantMobile: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
                    <input
                      type="text"
                      value={editForm.emergencyPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">National ID / Iqama</label>
                    <input
                      type="text"
                      value={(editForm as any).nationalId || ''}
                      onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value } as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Monthly Rent</label>
                    <input
                      type="number"
                      min="0" step="0.01" inputMode="decimal"
                      value={editForm.monthlyRent || 0}
                      onChange={(e) => setEditForm({ ...editForm, monthlyRent: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Annual Rent</label>
                    <input
                      type="number"
                      min="0" step="0.01" inputMode="decimal"
                      value={editForm.annualRent || 0}
                      onChange={(e) => setEditForm({ ...editForm, annualRent: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Discount</label>
                    <input
                      type="number"
                      min="0" step="0.01" inputMode="decimal"
                      value={editForm.discount || 0}
                      onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Water Meter Cost (Yearly)</label>
                    <input
                      type="number"
                      min="0" step="0.01" inputMode="decimal"
                      value={editWaterMeterCost}
                      onChange={(e) => setEditWaterMeterCost(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Frequency</label>
                    <select
                      value={editForm.paymentFrequency || 'Quarterly'}
                      onChange={(e) => setEditForm({ ...editForm, paymentFrequency: e.target.value, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Every-4-Months">Every 4 Months - 3 Payments</option>
                      <option value="Quarterly">Quarterly - 4 Payments</option>
                      <option value="Semi-Annual">Semi-Annual - 2 Payments</option>
                      <option value="Annual">Annual - 1 Payment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Number</label>
                    <input
                      type="text"
                      value={editForm.paymentNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, paymentNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Electricity Meter Number</label>
                    <input
                      type="text"
                      value={editForm.electricityMeterNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, electricityMeterNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editForm.leaseStartDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, leaseStartDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={editForm.leaseEndDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, leaseEndDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Duration (Months)</label>
                    <input
                      type="number"
                      min="1" step="1" inputMode="numeric"
                      value={editForm.leaseDurationMonths || 12}
                      onChange={(e) => setEditForm({ ...editForm, leaseDurationMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Insurance</label>
                    <input
                      type="number"
                      min="0" step="0.01" inputMode="decimal"
                      value={editForm.insurance || 0}
                      onChange={(e) => setEditForm({ ...editForm, insurance: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Commission</label>
                    <input
                      type="number"
                      min="0" step="0.01" inputMode="decimal"
                      value={editForm.commission || 0}
                      onChange={(e) => setEditForm({ ...editForm, commission: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={editForm.status || 'Active'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Archived">Archived</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">English Notes</label>
                    <textarea
                      value={editForm.englishNotes || ''}
                      onChange={(e) => setEditForm({ ...editForm, englishNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Arabic Notes</label>
                    <textarea
                      value={editForm.arabicNotes || ''}
                      onChange={(e) => setEditForm({ ...editForm, arabicNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#29b4c4]/10 border border-[#29b4c4]/30 rounded-xl p-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-700">إجمالي الإيجار (الوحدة + المياه)</span>
                    <span className="font-mono font-bold text-[#0e7a87] text-lg">
                      SR {(Number(editForm.annualRent || 0) + Number(editWaterMeterCost || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-700">صافي المستحق بعد الخصم</span>
                    <span className="font-mono font-bold text-emerald-800 text-lg">
                      SR {Math.max(0, Number(editForm.annualRent || 0) + Number(editWaterMeterCost || 0) - Number(editForm.discount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editForm.leaseStartDate || ''}
                    onChange={(e) => setEditForm({ ...editForm, leaseStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1" step="1" inputMode="numeric"
                    value={editForm.leaseDurationMonths || 12}
                    onChange={(e) => setEditForm({ ...editForm, leaseDurationMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal({ type: null, contract: null })}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {activeModal.type === 'details' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#29b4c4]" />
                <h3 className="text-base font-bold text-slate-900">
                  تفاصيل العقد الكاملة - كمبوند أزهار
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">رقم العقد:</span>
                  <span className="font-mono font-bold text-slate-900">{activeModal.contract.contractNo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">المشروع:</span>
                  <span className="font-bold text-[#29b4c4]">Azhar Residence (كمبوند أزهار)</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">رقم الوحدة ونوعها:</span>
                  <span className="font-bold text-slate-900">وحدة {activeModal.contract.unitNumber} ({activeModal.contract.unitType})</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">اسم المستأجر:</span>
                  <span className="font-bold text-slate-900">{activeModal.contract.tenantName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">الجوال:</span>
                  <span className="font-mono">{activeModal.contract.tenantMobile}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">رقم الطوارئ:</span>
                  <span className="font-mono">{activeModal.contract.emergencyPhone || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">تاريخ البداية والمدة:</span>
                  <span>{activeModal.contract.leaseStartDate} ({activeModal.contract.leaseDurationMonths} شهر)</span>
                </div>
              </div>

              <div className="bg-cyan-50/50 p-4 rounded-xl border border-cyan-200 grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">إيجار الوحدة</span>
                  <span className="font-bold font-mono text-slate-900">{Number(activeModal.contract.annualRent || 0).toLocaleString()} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">المياه</span>
                  <span className="font-bold font-mono text-cyan-700">{Number(activeModal.contract.waterYearlyBill || 0).toLocaleString()} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">إجمالي الإيجار</span>
                  <span className="font-bold font-mono text-[#0e7a87]">{contractGrossRent(activeModal.contract).toLocaleString()} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">المدفوع</span>
                  <span className="font-bold font-mono text-emerald-700">{activeModal.contract.paidAmount.toLocaleString()} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">المتبقي</span>
                  <span className="font-bold font-mono text-amber-700">{activeModal.contract.remainingAmount.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="w-full py-2 bg-slate-800 text-white font-bold rounded-xl"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}


      {/* RENT LEDGER MODAL */}
      {activeModal.type === 'ledger' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{language==='ar'?'كشف حساب العقد':'Contract Rent Ledger'} - {activeModal.contract.contractNo}</h3><button onClick={()=>setActiveModal({type:null,contract:null})} className="text-xl">&times;</button></div>
            {ledgerBusy ? <p className="text-center py-10">{language==='ar'?'جارٍ تحميل كشف الحساب...':'Loading account statement...'}</p> : !ledgerData ? <p className="text-center py-10 text-rose-600">{language==='ar'?'تعذر تحميل كشف الحساب':'Could not load ledger'}</p> : <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">{[['Total',ledgerData.finance?.total],['Paid',ledgerData.finance?.paid],['Remaining',ledgerData.finance?.remaining],['Overdue',ledgerData.finance?.overdue],['Next Due',ledgerData.finance?.next_due_date]].map(([k,v])=><div key={String(k)} className="bg-slate-50 border rounded-xl p-3"><div className="text-[10px] text-slate-500">{k}</div><div className="font-bold">{typeof v==='number'?v.toLocaleString():String(v||'-')}</div></div>)}</div>
              <h4 className="font-bold mb-2">{language==='ar'?'الأقساط':'Installments'}</h4>
              <div className="overflow-x-auto mb-5"><table className="w-full text-xs"><thead><tr className="bg-slate-100"><th className="p-2">#</th><th className="p-2">Due</th><th className="p-2">Amount</th><th className="p-2">Paid</th><th className="p-2">Status</th></tr></thead><tbody>{(ledgerData.installments||[]).map((i:any)=><tr key={i.id} className="border-b"><td className="p-2">{i.installmentNo}</td><td className="p-2">{String(i.dueDate).slice(0,10)}</td><td className="p-2">{Number(i.amount||0).toLocaleString()}</td><td className="p-2">{Number(i.paidAmount||0).toLocaleString()}</td><td className="p-2 font-bold">{i.status}</td></tr>)}</tbody></table></div>
              <h4 className="font-bold mb-2">{language==='ar'?'الدفعات والتوزيعات':'Payments & Allocations'}</h4>
              <div className="space-y-2">{(ledgerData.payments||[]).map((p:any)=><div key={p.id} className="border rounded-xl p-3 flex justify-between items-center"><div><b>{p.receiptNo}</b><div className="text-xs text-slate-500">{String(p.paymentDate).slice(0,10)} · {p.paymentMethod} · {p.status}</div></div><div className="text-right"><b>{Number(p.amount||0).toLocaleString()} SAR</b><div className="text-[10px] text-slate-500">Unapplied: {Number(p.unappliedAmount||0).toLocaleString()}</div></div></div>)}</div>
            </>}
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {activeModal.type === 'payment' && activeModal.contract && (
        (() => {
          const c = activeModal.contract;
          const today = new Date();
          const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const buildingNo = (c.unitNumber || '').split('-')[0] || '-';
          const installments: any[] = ledgerData?.contractId === c.id && Array.isArray(ledgerData?.installments)
            ? ledgerData.installments.map((i:any) => ({ ...i, dueDate: String(i.dueDate||'').slice(0,10), amount: Number(i.amount||0), paidAmount: Number(i.paidAmount||0) }))
            : (c.installments || []);
          const totalPaid = ledgerData?.contractId === c.id
            ? Number(ledgerData.finance?.paid || 0)
            : installments.reduce((sum:number, i:any) => sum + Number(i.paidAmount ?? (i.status === 'Paid' ? i.amount : 0) ?? 0), 0);
          const searchQ = paymentSearch.toLowerCase();
          const filteredInst = installments.filter(inst =>
            !searchQ ||
            inst.dueDate.toLowerCase().includes(searchQ) ||
            (inst.receiptNo || '').toLowerCase().includes(searchQ) ||
            (inst.user || '').toLowerCase().includes(searchQ) ||
            (inst.comments || '').toLowerCase().includes(searchQ)
          );
          const totalPages = Math.max(1, Math.ceil(filteredInst.length / paymentEntries));
          const safePage = Math.min(paymentPage, totalPages);
          const pageRows = filteredInst.slice((safePage - 1) * paymentEntries, safePage * paymentEntries);
          const from = filteredInst.length === 0 ? 0 : (safePage - 1) * paymentEntries + 1;
          const to = Math.min(safePage * paymentEntries, filteredInst.length);
          const invoices = installments.filter(i => i.status === 'Paid').map((i, idx) => ({
            id: i.receiptNo || `E-${10000 + idx}`,
            date: i.paidDate || i.dueDate,
            amount: i.amount,
            method: i.paymentMethod || 'Cash',
            type: 'installments'
          }));
          return (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 border border-slate-200 space-y-4 my-6">

                {/* Header like attachment */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">Payment</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{todayLabel}</p>
                  </div>
                  <button
                    onClick={() => setActiveModal({ type: null, contract: null })}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xl"
                  >
                    &times;
                  </button>
                </div>

                {/* Tenant summary like attachment */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Tenant Name</span>
                    <span className="font-bold text-slate-900">{c.tenantName}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Building Number</span>
                    <span className="font-bold text-slate-900">{buildingNo}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Unit Number</span>
                    <span className="font-bold text-slate-900">{c.unitNumber}</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-emerald-600 block text-[10px] font-bold uppercase tracking-wide">Total Payments</span>
                    <span className="font-bold text-emerald-800 font-mono">{totalPaid.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                  </div>
                </div>

                {/* Record Payment */}
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input type="number" min="0.01" step="0.01" max={Number(ledgerData?.finance?.remaining ?? activeModal.contract?.remainingAmount ?? 0)} value={paymentAmount||''} onChange={e=>setPaymentAmount(Number(e.target.value))} placeholder={language==='ar'?'المبلغ':'Amount'} className="border rounded-lg px-3 py-2" />
                    <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="border rounded-lg px-3 py-2"><option>Cash</option><option>Card</option><option>BankTransfer</option><option>Check</option></select>
                    <input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder={language==='ar'?'المرجع':'Reference'} className="border rounded-lg px-3 py-2" />
                    <input value={paymentNotes} onChange={e=>setPaymentNotes(e.target.value)} placeholder={language==='ar'?'ملاحظات':'Notes'} className="border rounded-lg px-3 py-2" />
                  </div>
                  <button onClick={handleRecordPayment} disabled={paymentAmount<=0} className="w-full py-2.5 bg-[#29b4c4] hover:bg-[#229ca9] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" />{language === 'ar' ? 'تسجيل دفعة جديدة' : 'Record New Payment'}</button>
                </div>

                {/* Due Payments Table like attachment */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-semibold">Show</span>
                      <select
                        value={paymentEntries}
                        onChange={(e) => { setPaymentEntries(Number(e.target.value)); setPaymentPage(1); }}
                        className="border border-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                      <span className="text-slate-500 font-semibold">entries</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-semibold">Search:</span>
                      <input
                        type="text"
                        value={paymentSearch}
                        onChange={(e) => { setPaymentSearch(e.target.value); setPaymentPage(1); }}
                        className="border border-slate-300 rounded px-2 py-0.5 text-xs"
                      />
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase">
                        <th className="py-2 px-3 text-start font-bold">#</th>
                        <th className="py-2 px-3 text-start font-bold">Due Date</th>
                        <th className="py-2 px-3 text-start font-bold">Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Remaining Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Paid Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Last payment Date</th>
                        <th className="py-2 px-3 text-start font-bold">User</th>
                        <th className="py-2 px-3 text-start font-bold">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400 italic">No data available in table</td>
                        </tr>
                      ) : (
                        pageRows.map((inst, i) => {
                          const paid = Number((inst as any).paidAmount ?? (inst.status === 'Paid' ? inst.amount : 0) ?? 0);
                          const rem = Math.max(0, Number(inst.amount||0) - paid);
                          return (
                            <tr key={inst.id || i} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-500">{(safePage - 1) * paymentEntries + i + 1}</td>
                              <td className="py-2 px-3 font-mono">{inst.dueDate}</td>
                              <td className="py-2 px-3 font-mono">{Number(inst.amount||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td className="py-2 px-3 font-mono text-amber-600">{Number(rem||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td className="py-2 px-3 font-mono text-emerald-600">{Number(paid||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td className="py-2 px-3 font-mono">{inst.paidDate || '-'}</td>
                              <td className="py-2 px-3">{inst.user || '-'}</td>
                              <td className="py-2 px-3 text-slate-500">{inst.comments || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Showing {from} to {to} of {filteredInst.length} entries
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPaymentPage(Math.max(1, safePage - 1))}
                        disabled={safePage <= 1}
                        className="px-2 py-1 border border-slate-300 rounded text-slate-600 disabled:opacity-40 hover:bg-white"
                      >
                        Previous
                      </button>
                      <span className="px-2.5 py-1 bg-cyan-600 text-white rounded font-bold">{safePage}</span>
                      <button
                        onClick={() => setPaymentPage(Math.min(totalPages, safePage + 1))}
                        disabled={safePage >= totalPages}
                        className="px-2 py-1 border border-slate-300 rounded text-slate-600 disabled:opacity-40 hover:bg-white"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

                {/* Posted Payments / Receipts */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200"><h4 className="font-bold text-slate-800 text-sm">{language==='ar'?'إيصالات الدفعات الفعلية':'Posted Payment Receipts'}</h4></div>
                  <div className="divide-y">{contractPayments.length===0?<div className="p-6 text-center text-slate-400">No payments</div>:contractPayments.map(p=><div key={p.id} className="p-3 flex items-center justify-between gap-3"><div><div className="font-bold">{p.receiptNo||p.id}</div><div className="text-xs text-slate-500">{p.paymentDate} · {p.paymentMethod} · {p.status}</div></div><div className="flex items-center gap-2"><b>{Number(p.amount||0).toLocaleString()} SAR</b>{p.status!=='Reversed'&&<button onClick={()=>handleReversePayment(p)} className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">{language==='ar'?'عكس':'Reverse'}</button>}</div></div>)}</div>
                </div>

                {/* Other Payments Table like attachment */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-sm">Other Payments</h4>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase">
                        <th className="py-2 px-3 text-start font-bold">#</th>
                        <th className="py-2 px-3 text-start font-bold">Insurence</th>
                        <th className="py-2 px-3 text-start font-bold">Commession</th>
                        <th className="py-2 px-3 text-start font-bold">Other</th>
                        <th className="py-2 px-3 text-start font-bold">Total Paid</th>
                        <th className="py-2 px-3 text-start font-bold">MonyFlow</th>
                        <th className="py-2 px-3 text-start font-bold">Payment Date</th>
                        <th className="py-2 px-3 text-start font-bold">User</th>
                        <th className="py-2 px-3 text-start font-bold">Comments</th>
                        <th className="py-2 px-3 text-start font-bold">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 italic">No data available in table</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Invoices Table like attachment */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-sm">Invoices</h4>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase">
                        <th className="py-2 px-3 text-start font-bold">#</th>
                        <th className="py-2 px-3 text-start font-bold">Invoice Id</th>
                        <th className="py-2 px-3 text-start font-bold">Payment Date</th>
                        <th className="py-2 px-3 text-start font-bold">Paid Amount</th>
                        <th className="py-2 px-3 text-start font-bold">Payment Method</th>
                        <th className="py-2 px-3 text-start font-bold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400 italic">No data available in table</td>
                        </tr>
                      ) : (
                        invoices.map((inv, i) => (
                          <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                            <td className="py-2 px-3 font-mono text-cyan-700 font-bold">{inv.id}</td>
                            <td className="py-2 px-3 font-mono">{inv.date}</td>
                            <td className="py-2 px-3 font-mono font-bold">{inv.amount.toLocaleString()}٫00</td>
                            <td className="py-2 px-3">{inv.method}</td>
                            <td className="py-2 px-3 text-slate-500">{inv.type}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          );
        })()
      )}

      {/* NOTES MODAL */}
      {activeModal.type === 'notes' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  ملاحظات العقد - وحدة #{activeModal.contract.unitNumber}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أضف ملاحظة إدارية جديدة للعقد..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={() => handleAddNote(activeModal.contract!)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                >
                  إضافة
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(!activeModal.contract.notes || activeModal.contract.notes.length === 0) ? (
                  <p className="text-slate-400 italic text-center py-4">لا توجد ملاحظات مسجلة بعد.</p>
                ) : (
                  activeModal.contract.notes.map((n) => (
                    <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{n.author}</span>
                        <span>{n.date}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIT HISTORY MODAL */}
      {activeModal.type === 'unit_history' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  سجل الوحدة (Unit History) - وحدة #{activeModal.contract.unitNumber}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <p className="font-bold text-blue-900">كمبوند أزهار - Azhar Residence</p>
                <p className="text-blue-700">رقم الوحدة: {activeModal.contract.unitNumber} | النوع: {activeModal.contract.unitType}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">العقود التاريخية للوحدة:</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>العقد الحالي #{activeModal.contract.contractNo}</span>
                    <span className="text-emerald-600 font-mono">{activeModal.contract.annualRent.toLocaleString()} SAR</span>
                  </div>
                  <p className="text-slate-600 mt-1">المستأجر: {activeModal.contract.tenantName}</p>
                  <p className="text-slate-500 text-[10px]">تاريخ البداية: {activeModal.contract.leaseStartDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TENANT HISTORY MODAL */}
      {activeModal.type === 'tenant_history' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900">
                  سجل المستأجر (Tenant History) - {activeModal.contract.tenantName}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-violet-50 p-3 rounded-xl border border-violet-200">
                <p className="font-bold text-violet-900">{activeModal.contract.tenantName}</p>
                <p className="text-violet-700 font-mono">الجوال: {activeModal.contract.tenantMobile} | الطوارئ: {activeModal.contract.emergencyPhone || '-'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">العقد الحالي بـ كمبوند أزهار</p>
                <p className="text-slate-600">وحدة #{activeModal.contract.unitNumber} - الإيجار: {activeModal.contract.annualRent.toLocaleString()} SAR</p>
                <p className="text-slate-600">حالة السداد: مدفوع {activeModal.contract.paidAmount.toLocaleString()} SAR / متبقي {activeModal.contract.remainingAmount.toLocaleString()} SAR</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT FORMAL CONTRACT MODAL */}
      {activeModal.type === 'print' && activeModal.contract && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 border border-slate-300 space-y-6 text-slate-900 my-8">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <AzharLogo variant="dark" size="lg" />
              <div className="text-left dir-ltr">
                <h2 className="text-lg font-black tracking-widest text-slate-900">LEASE AGREEMENT</h2>
                <p className="text-xs font-mono font-bold text-[#29b4c4]">Contract #: {activeModal.contract.contractNo}</p>
                <p className="text-[10px] text-slate-500">Date: {activeModal.contract.leaseStartDate}</p>
              </div>
            </div>

            <div className="text-center my-4">
              <h1 className="text-xl font-black tracking-tight text-slate-900 underline underline-offset-8 decoration-2">
                عقد إيجار موحد - كمبوند أزهار (Azhar Residence)
              </h1>
            </div>

            {/* Terms Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 p-3 font-bold border-b border-slate-300 grid grid-cols-2">
                <span>الطرف الأول (المؤجر): إدارة كمبوند أزهار</span>
                <span>الطرف الثاني (المستأجر): {activeModal.contract.tenantName}</span>
              </div>
              <div className="p-4 space-y-2 bg-white">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span><strong>رقم الوحدة:</strong> {activeModal.contract.unitNumber}</span>
                  <span><strong>نوع الوحدة:</strong> {activeModal.contract.unitType}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span><strong>رقم الطوارئ:</strong> {activeModal.contract.emergencyPhone || '-'}</span>
                  <span><strong>رقم الجوال:</strong> {activeModal.contract.tenantMobile}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span><strong>مدة العقد:</strong> {activeModal.contract.leaseDurationMonths} شهر</span>
                  <span><strong>تاريخ البداية:</strong> {activeModal.contract.leaseStartDate}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 bg-slate-50 p-2 rounded">
                  <span><strong>الإيجار السنوي:</strong> {activeModal.contract.annualRent.toLocaleString()} SAR</span>
                  <span><strong>المدفوع:</strong> {activeModal.contract.paidAmount.toLocaleString()} SAR</span>
                  <span><strong>المتبقي:</strong> {activeModal.contract.remainingAmount.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800 mb-1">الشروط والأحكام الإيجارية:</p>
              <p>1. يتعهد المستأجر بالمحافظة على العين المؤجرة والمرافق العامة بـ كمبوند أزهار.</p>
              <p>2. يتم سداد المبالغ المتبقية في المواعيد المحددة وحسب الجدول الزمني المعتمد.</p>
              <p>3. هذا العقد موثق ومعتمد رسمياً من قبل إدارة كمبوند أزهار (Azhar Residence).</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs text-center font-bold">
              <div>
                <p className="mb-8">توقيع الطرف الأول (إدارة كمبوند أزهار)</p>
                <p className="text-slate-400 font-normal">___________________________</p>
                
              </div>
              <div>
                <p className="mb-8">توقيع الطرف الثاني (المستأجر)</p>
                <p className="text-slate-400 font-normal">___________________________</p>
                <p className="mt-1 text-[10px] text-slate-500">{activeModal.contract.tenantName}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة العقد الآن (Print Document)
              </button>
              <button
                onClick={() => setActiveModal({ type: null, contract: null })}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
