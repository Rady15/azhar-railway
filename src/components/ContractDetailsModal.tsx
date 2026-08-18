import React from 'react';
import { X, FileText, Calendar, Building2, User, Phone, Mail, DollarSign, ShieldCheck, Printer, CheckCircle2 } from 'lucide-react';
import { Contract } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ContractDetailsModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ContractDetailsModal: React.FC<ContractDetailsModalProps> = ({
  contract,
  isOpen,
  onClose
}) => {
  const { language } = useLanguage();

  if (!isOpen || !contract) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-auto">
        {/* Modal Header */}
        <div className="bg-[#2b62af] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-cyan-300" />
            <div>
              <h2 className="text-base font-bold">
                {language === 'ar' ? `تفاصيل العقد رقم #${contract.contractNo}` : `Contract Details #${contract.contractNo}`}
              </h2>
              <p className="text-xs text-cyan-200">
                {contract.compoundName} - Unit {contract.unitNumber} ({contract.unitType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              {language === 'ar' ? 'طباعة العقد' : 'Print Contract'}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 text-xs text-slate-800 bg-slate-50/50 max-h-[80vh] overflow-y-auto">
          
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-slate-400 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}
              </span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                SR {contract.annualRent.toLocaleString()}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-cyan-500 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'تكلفة المياه' : 'Water Cost'}
              </span>
              <span className="text-base font-bold text-cyan-700 font-mono mt-0.5 block">
                SR {(contract.waterYearlyBill || 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-emerald-600 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'إجمالي العقد' : 'Total Contract'}
              </span>
              <span className="text-base font-bold text-emerald-700 font-mono mt-0.5 block">
                SR {(contract.totalYearlyRent || (contract.annualRent + (contract.waterYearlyBill || 0))).toLocaleString()}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="block text-rose-500 font-semibold uppercase text-[10px]">
                {language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount'}
              </span>
              <span className="text-base font-bold text-rose-600 font-mono mt-0.5 block">
                SR {contract.remainingAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Section 1: Tenant Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider flex items-center gap-1.5 text-start">
              <User className="w-4 h-4 text-[#2b62af]" />
              {language === 'ar' ? 'بيانات المستأجر' : 'Tenant Info'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-start">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'اسم المستأجر' : 'Tenant Name'}</span>
                <span className="font-bold text-slate-900 text-sm">{contract.tenantName}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'رقم الجوال' : 'Mobile'}</span>
                <span className="font-mono text-slate-800 font-semibold">{contract.tenantMobile}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'رقم الإقامة / الهوية' : 'Iqama / ID No.'}</span>
                <span className="font-mono text-slate-700">{contract.tenantIdOrIqama || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'حالة العقد' : 'Contract Status'}</span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {contract.status}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Unit & Lease Period */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider flex items-center gap-1.5 text-start">
              <Building2 className="w-4 h-4 text-[#2b62af]" />
              {language === 'ar' ? 'تفاصيل الوحدة ومدة الإيجار' : 'Unit & Lease Duration'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-start">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'المبنى والوحدة' : 'Building & Unit'}</span>
                <span className="font-bold text-slate-900">Bld {contract.buildingNumber} - Unit {contract.unitNumber}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}</span>
                <span className="font-semibold text-slate-800">{contract.unitType}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'تاريخ بداية العقد' : 'Start Date'}</span>
                <span className="font-mono text-slate-800">{contract.leaseStartDate}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase">{language === 'ar' ? 'تاريخ انتهاء العقد' : 'End Date'}</span>
                <span className="font-mono text-slate-800 font-bold">{contract.leaseEndDate}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Notes List */}
          {contract.notes && contract.notes.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-start">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                {language === 'ar' ? 'ملاحظات العقد المسجلة' : 'Recorded Contract Notes'}
              </h3>
              <div className="space-y-2">
                {contract.notes.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between text-slate-400 font-mono mb-1 text-[11px]">
                      <span>{n.author}</span>
                      <span>{n.date}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
