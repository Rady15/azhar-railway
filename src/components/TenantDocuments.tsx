import React from 'react';
import { FileText, Eye, Printer, Download, FolderOpen } from 'lucide-react';
import { apiService } from '../services/api';
import { printMediaDocument } from '../utils/mediaPrint';
import { notifyUser } from '../utils/userFeedback';
import { useLanguage } from '../context/LanguageContext';
import type { Tenant, Contract } from '../types';

export interface TenantDocument {
  key: string;
  labelAr: string;
  labelEn: string;
  url: string;
  fileName: string;
}

/** Collects every attachment reachable for a tenant, from the tenant record and their contracts. */
export function collectTenantDocuments(tenant: Tenant, contracts: Contract[]): TenantDocument[] {
  const docs: TenantDocument[] = [];
  const push = (key: string, labelAr: string, labelEn: string, url?: string, fileName?: string) => {
    if (url) docs.push({ key, labelAr, labelEn, url, fileName: fileName || labelAr });
  };

  push('identity', 'الهوية', 'Identity Document', tenant.identityDocumentUrl, tenant.identityDocumentName);
  push('manualContract', 'عقد المستأجر', 'Tenant Contract', tenant.manualContractDocumentUrl, tenant.manualContractDocumentName);
  push('contract', 'العقد', 'Contract', tenant.contractDocumentUrl, tenant.contractDocumentName);
  push('medical', 'التأمين الطبي', 'Medical Insurance', tenant.medicalInsuranceUrl, tenant.medicalInsuranceName);

  // Lease contracts carry their own scanned copy; prefer the active one.
  const lease = contracts.find(c => c.status === 'Active') || contracts[0];
  if (lease?.contractDocumentUrl) {
    push(
      'lease',
      lease.status === 'Active' ? 'عقد الإيجار الساري' : 'عقد الإيجار',
      'Lease Contract',
      lease.contractDocumentUrl,
      lease.contractDocumentName
    );
  }
  return docs;
}

export const TenantDocuments: React.FC<{ tenant: Tenant; contracts: Contract[]; compact?: boolean }> = ({ tenant, contracts, compact }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const docs = collectTenantDocuments(tenant, contracts);

  // Surface failures instead of leaving an unhandled rejection with no feedback.
  const run = (fn: () => Promise<unknown>) => { fn().catch(() => notifyUser({ kind: 'error', ar: 'تعذر فتح الملف. تأكد من تسجيل الدخول ثم حاول مرة أخرى.', en: 'Could not open the file. Please sign in and try again.' })); };

  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-slate-500 text-xs">
        {ar ? 'لا توجد مرفقات لهذا المستأجر. أضف الهوية أو العقد من زر تعديل.' : 'No attachments for this tenant yet. Add identity or contract files via Edit.'}
      </div>
    );
  }

  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'space-y-2'}>
      {docs.map(doc => (
        <div
          key={doc.key}
          className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white ${compact ? 'px-2 py-1' : 'p-2.5'} min-w-0`}
        >
          <FileText className="w-4 h-4 text-[#29b4c4] shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-800 truncate">{ar ? doc.labelAr : doc.labelEn}</div>
            {!compact && <div className="text-[10px] text-slate-400 truncate" dir="auto">{doc.fileName}</div>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => run(() => apiService.openMedia(doc.url))}
              className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors"
              title={ar ? 'عرض الملف' : 'View file'}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => run(() => printMediaDocument(doc.url, doc.fileName))}
              className="p-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
              title={ar ? 'طباعة الملف' : 'Print file'}
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => run(() => apiService.downloadMedia(doc.url, doc.fileName))}
              className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
              title={ar ? 'تنزيل الملف' : 'Download file'}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TenantDocumentsModal: React.FC<{
  tenant: Tenant | null;
  contracts: Contract[];
  onClose: () => void;
}> = ({ tenant, contracts, onClose }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  if (!tenant) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#2b3038] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#29b4c4]" />
            <div>
              <h3 className="text-base font-bold">{ar ? 'مرفقات المستأجر' : 'Tenant Attachments'}</h3>
              <p className="text-[11px] text-slate-300 mt-0.5">{tenant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white" title={ar ? 'إغلاق' : 'Close'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <TenantDocuments tenant={tenant} contracts={contracts} />
        </div>
      </div>
    </div>
  );
};
