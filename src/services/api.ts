import { notifyUser, friendlyApiError, actionSuccess } from '../utils/userFeedback';
import { Tenant, Contract, Unit, ElectricityMeter, MaintenanceRequest, MaintenanceStatus, WaterMeter, Complaint, ComplaintStatus, ComplaintPriority, StaffMember, StaffStatus, Expense, DueItem, PaymentRecord, PaymentInstallment, Company, Letter, Announcement, RentReport, Notification, Facility, FacilityBooking, FacilityBookingStatus } from '../types';

// Allow switching backend via VITE_API_BASE (e.g. local dev server), default to the real Azhar API.
const viteEnv = (import.meta as any).env || {};
export const API_BASE: string = viteEnv.VITE_API_BASE || '/api';

const ACCESS_KEY = 'azhar_residence_access_token';
const REFRESH_KEY = 'azhar_residence_refresh_token';

let authToken: string | null = localStorage.getItem(ACCESS_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);
let refreshInFlight: Promise<boolean> | null = null;

// Extract an access token / refresh token from any server response shape.
function saveSession(data: any) {
  const access = data?.accessToken || data?.token || data?.data?.accessToken || data?.data?.token;
  const refresh = data?.refreshToken || data?.data?.refreshToken;
  if (access) {
    authToken = access;
    localStorage.setItem(ACCESS_KEY, access);
  }
  if (refresh) {
    refreshToken = refresh;
    localStorage.setItem(REFRESH_KEY, refresh);
  }
  return Boolean(authToken);
}

export function clearSession() {
  authToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/Account/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const data = await res.json();
    if (data && data.isSuccess === false) {
      clearSession();
      return false;
    }
    return saveSession(data);
  } catch (err) {
    return false;
  }
}

// Single-flight refresh so parallel 401s trigger one refresh request.
function refresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function ensureAuth(): Promise<string | null> {
  if (authToken) return authToken;
  const ok = await refresh();
  return ok ? authToken : null;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureAuth();
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> || {}) };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const doFetch = () => {
    const requestHeaders: Record<string, string> = { ...headers };
    if (authToken) requestHeaders['Authorization'] = `Bearer ${authToken}`;
    else delete requestHeaders['Authorization'];
    return fetch(`${API_BASE}${path}`, { ...init, headers: requestHeaders });
  };
  let res: Response;
  try { res = await doFetch(); } catch (networkError) {
    notifyUser({ kind: 'error', ar: 'تعذر الاتصال بالنظام. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.', en: 'Could not connect to the system. Check your internet connection and try again.' });
    throw new Error('NETWORK_UNAVAILABLE');
  }
  if (res.status === 401) {
    const hadToken = Boolean(authToken);
    const refreshed = await refresh();
    if (refreshed) {
      res = await doFetch();
    } else if (!hadToken) {
      return res;
    }
  }

  const method = String(init?.method || 'GET').toUpperCase();
  if (!res.ok) {
    let raw = '';
    try {
      const body = await res.clone().json();
      raw = body?.userMessage || body?.message || body?.error || '';
    } catch {
      try { raw = await res.clone().text(); } catch { raw = ''; }
    }
    const friendly = friendlyApiError(res.status, raw, path);
    notifyUser({ kind: res.status === 409 || res.status === 400 || res.status === 422 ? 'warning' : 'error', ...friendly });
  } else if (method !== 'GET') {
    const success = actionSuccess(method, path);
    if (success) notifyUser({ kind: 'success', ...success });
    // Tell the application that server-owned data changed. Views should never
    // require logout/login or a hard refresh to see successful mutations.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('azhar:data-changed', { detail: { method, path } }));
    }
  }
  return res;
}

const asList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.tenants)) return data.tenants;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.payments)) return data.payments;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

const dateOnly = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = Date.parse(s);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : '';
};

export interface FinanceSummary {
  tenantId: string;
  paidAmount: number;
  remainingAmount: number;
  rentValue: number;
  remainingRents: number;
  rentFrequency: string;
  status: string;
  nextDueDate: string;
  contractEndDate: string;
}

export const apiService = {
  // Login — stores access + refresh tokens from the server response.
  async login(email: string, password?: string, role?: 'Admin' | 'Staff' | 'Tenant') {
    const res = await fetch(`${API_BASE}/Account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username: email, identifier: email, password, role })
    });
    const data = await res.json();
    if (res.ok && data && data.isSuccess !== false) {
      saveSession(data);
    }
    return { ok: res.ok, ...data };
  },

  // Logout — revoke the refresh token on the server and clear the local session.
  async logout(): Promise<void> {
    const token = refreshToken;
    clearSession();
    if (!token) return;
    try {
      await fetch(`${API_BASE}/Account/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token })
      });
    } catch (err) {
      // Ignore network errors on logout.
    }
  },

  // Current authenticated user from the server.
  async getSessionUser(): Promise<any | null> {
    const res = await authedFetch('/Account/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  },

  // Finance mapping — the single source of truth for money numbers.
  // Built from the server's /Reports (rent ledger) + /Payment (collections),
  // keyed by tenantId so every section (collections, contracts, dues rents)
  // shows identical paid / remaining amounts.
  async getFinanceSummary(): Promise<Map<string, FinanceSummary>> {
    const res = await authedFetch('/Reports');
    if (!res.ok) throw new Error('Failed to load rent ledger');
    const reports = asList(await res.json());
    const map = new Map<string, FinanceSummary>();
    reports.forEach((r: any) => {
      const tid = String(r.tenantId || ''); if (!tid) return;
      const total = Number(r.rentAmount || 0), paid = Number(r.paidAmount || 0), remaining = Number(r.remainingAmount || 0);
      const freq = String(r.rentFrequency || 'Monthly');
      const parts = freq.toLowerCase().includes('quarter') ? 4 : freq.toLowerCase().includes('semi') ? 2 : freq.toLowerCase().includes('annual') ? 1 : 12;
      map.set(tid,{tenantId:tid,paidAmount:paid,remainingAmount:remaining,rentValue:parts?total/parts:total,remainingRents:remaining>0?Math.ceil(remaining/Math.max(1,total/parts)):0,rentFrequency:freq,status:r.status||'Due Soon',nextDueDate:dateOnly(r.nextDueDate),contractEndDate:dateOnly(r.contractEndDate)});
    });
    return map;
  },

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    const res = await authedFetch('/Tenants');
    if (!res.ok) throw new Error('Failed to fetch tenants');
    const data = await res.json();
    let financeMap = new Map<string, FinanceSummary>();
    try { financeMap = await this.getFinanceSummary(); } catch (err) { /* ignore */ }
    return asList(data).map((t: any) => {
      const fin = financeMap.get(t.id);
      const annualRent = Number(t.annualRent || 0);
      const paidAmount = fin ? fin.paidAmount : Number(t.paidAmount || 0);
      const remainingAmount = fin ? Math.max(0, Number(fin.remainingAmount || 0)) : Number(t.remainingAmount || 0);
      return {
        id: t.id,
        name: t.fullName || t.name || 'Tenant',
        fullNameArabic: t.fullNameArabic || '',
        email: t.email || '',
        username: t.username || '',
        mobile: t.phoneNumber || t.mobile || '',
        emergencyPhone: t.emergencyContactPhone || t.emergencyPhoneNumber || t.emergencyPhone || '',
        whatsapp: t.whatsappNumber || t.whatsapp || t.phoneNumber || '',
        nationality: t.nationality || '',
        familyCount: t.familyCount || '1',
        workNotes: t.workNotes || '',
        isMarried: t.isMarried !== undefined ? t.isMarried : true,
        companyName: t.companyName || t.company || '',
        company: t.company || t.companyName || '',
        tenantRemarks: t.tenantRemarks || '',
        hasContract: Boolean(t.hasActiveContract ?? t.hasContract ?? false),
        unitNumber: t.houseNumber || t.unitNumber || '',
        houseId: t.houseId || '',
        houseNumber: t.houseNumber || '',
        contractNumber: t.contractNumber || '',
        contractStartDate: dateOnly(t.contractStartDate),
        contractEndDate: dateOnly(t.contractEndDate),
        monthlyRent: Number(t.monthlyRent || 0),
        annualRent,
        paidAmount,
        remainingAmount,
        paymentMethod: t.paymentMethod || '',
        waterCost: t.waterCost !== undefined && t.waterCost !== null ? String(t.waterCost) : '',
        electricityMeter: t.electricityMeter || '',
        isActive: t.isActive,
        archived: t.isActive === false,
        identityDocumentUrl: t.identityDocumentUrl || '', identityDocumentName: t.identityDocumentName || '',
        manualContractDocumentUrl: t.manualContractDocumentUrl || '', manualContractDocumentName: t.manualContractDocumentName || ''
      };
    });
  },

  async addTenant(tenantData: Partial<Tenant>): Promise<Tenant> {
    const payload = {
      fullName: tenantData.name,
      fullNameArabic: tenantData.fullNameArabic || '',
      email: tenantData.email,
      username: (tenantData as any).username || '',
      phoneNumber: tenantData.mobile,
      emergencyPhoneNumber: tenantData.emergencyPhone || '',
      nationality: tenantData.nationality || '',
      familyCount: String(tenantData.familyCount || '1'),
      workNotes: tenantData.workNotes || '',
      isMarried: tenantData.isMarried !== undefined ? tenantData.isMarried : true,
      whatsappNumber: tenantData.whatsapp || tenantData.mobile,
      tenantRemarks: tenantData.tenantRemarks || '',
      companyName: tenantData.companyName || tenantData.company || '',
      houseNumber: tenantData.unitNumber || tenantData.houseNumber || '',
      identityDocumentUrl: tenantData.identityDocumentUrl || '', identityDocumentName: tenantData.identityDocumentName || '',
      manualContractDocumentUrl: tenantData.manualContractDocumentUrl || '', manualContractDocumentName: tenantData.manualContractDocumentName || '',
      password: (tenantData as any).password || ''
    };

    const res = await authedFetch('/Tenants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create tenant');
    const t = await res.json();
    return (await this.getTenants()).find(x => x.id === t.id) || {
      id: t.id || String(Date.now()),
      name: t.fullName || tenantData.name || 'Tenant',
      email: t.email || tenantData.email || '',
      mobile: t.phoneNumber || tenantData.mobile || '',
      whatsapp: t.phoneNumber || tenantData.mobile || '',
      hasContract: false,
      unitNumber: t.houseNumber || '',
      archived: false
    };
  },

  async updateTenant(id: string, tenantData: Partial<Tenant>): Promise<Tenant> {
    const payload = {
      fullName: tenantData.name,
      fullNameArabic: tenantData.fullNameArabic,
      email: tenantData.email,
      username: (tenantData as any).username || '',
      phoneNumber: tenantData.mobile,
      emergencyPhoneNumber: tenantData.emergencyPhone,
      nationality: tenantData.nationality,
      familyCount: String(tenantData.familyCount || '1'),
      workNotes: tenantData.workNotes,
      isMarried: tenantData.isMarried,
      whatsappNumber: tenantData.whatsapp,
      tenantRemarks: tenantData.tenantRemarks,
      companyName: tenantData.companyName || tenantData.company,
      houseNumber: tenantData.unitNumber || tenantData.houseNumber,
      isActive: !tenantData.archived,
      password: (tenantData as any).password || '',
      identityDocumentUrl: tenantData.identityDocumentUrl || '', identityDocumentName: tenantData.identityDocumentName || '',
      manualContractDocumentUrl: tenantData.manualContractDocumentUrl || '', manualContractDocumentName: tenantData.manualContractDocumentName || ''
    };

    const res = await authedFetch(`/Tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update tenant');
    return { ...tenantData, id } as Tenant;
  },

  async toggleTenantArchive(id: string) {
    const res = await authedFetch(`/Tenants/${id}/toggle-active`, { method: 'PUT' });
    return res.json();
  },

  async deleteTenant(id: string) {
    const res = await authedFetch(`/Tenants/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      let message = 'تعذر حذف المستأجر';
      try { const body = await res.json(); message = body?.message || message; } catch {}
      throw new Error(message);
    }
    return res.json();
  },

  // Contracts are server-owned in production; API failures are surfaced instead of synthesizing fake records.
  async getContracts(): Promise<Contract[]> {
    const res = await authedFetch('/Contracts');
    if (!res.ok) throw new Error('Failed to fetch contracts');
    const data = await res.json();
    return asList(data).map((c: any) => ({
      id: c.id,
      contractNo: c.contractNo || c.contractNumber || '',
      compoundId: c.compoundId || '1', compoundName: c.compoundName || 'Azhar Residence',
      buildingNumber: c.buildingNumber || '', unitNumber: c.unitNumber || c.houseNumber || '',
      unitType: (c.unitType || 'Apartment') as Contract['unitType'], tenantId: c.tenantId || '', tenantName: c.tenantName || '',
      tenantMobile: c.tenantMobile || '', emergencyPhone: c.emergencyPhone || '', tenantNationality: c.tenantNationality || '',
      contractOf: c.contractOf || '',
      leaseStartDate: dateOnly(c.leaseStartDate || c.contractStartDate), leaseDurationMonths: Number(c.leaseDurationMonths || 12), leaseEndDate: dateOnly(c.leaseEndDate || c.contractEndDate),
      annualRent: Number(c.annualRent || 0), monthlyRent: Number(c.monthlyRent || 0), waterYearlyBill: Number(c.waterYearlyBill || 0), totalYearlyRent: Number(c.annualRent || 0) + Number(c.waterYearlyBill || 0),
      discount: Number(c.discount || 0), paidAmount: Number(c.paidAmount || 0), remainingAmount: Number(c.remainingAmount || 0),
      paymentFrequency: (c.paymentFrequency || c.paymentMethod || 'Quarterly') as Contract['paymentFrequency'], paymentMethod: c.paymentMethod || '', paymentNumber: c.paymentNumber || '',
      electricityMeterNumber: c.electricityMeterNumber || '', verifiedInEjar: Boolean(c.verifiedInEjar), transferAccountToTenant: Boolean(c.transferAccountToTenant),
      insurance: Number(c.insurance || 0), commission: Number(c.commission || 0), englishNotes: c.englishNotes || '', arabicNotes: c.arabicNotes || '',
      status: (c.status || (c.isArchived ? 'Archived' : 'Active')) as Contract['status'], contractDocumentUrl: c.contractDocumentUrl || '', contractDocumentName: c.contractDocumentName || '', notes: c.notes || [], installments: c.installments || [], nextPaymentDate: c.nextPaymentDate ? dateOnly(c.nextPaymentDate) : undefined, nextPaymentDays: Number.isFinite(Number(c.nextPaymentDays)) ? Number(c.nextPaymentDays) : undefined
    }));
  },

  async getUnits(): Promise<Unit[]> {
    const [unitRes, contractRes, meterRes] = await Promise.all([
      authedFetch('/house'),
      authedFetch('/Contracts'),
      authedFetch('/ElectricityMeter')
    ]);
    if (!unitRes.ok) throw new Error('Failed to fetch units');
    const houses = asList(await unitRes.json());
    const contracts = contractRes.ok ? asList(await contractRes.json()) : [];
    const meters = meterRes.ok ? asList(await meterRes.json()) : [];
    const meterByUnit = new Map(meters.map((m:any) => [String(m.unitId || m.houseId || ''), m.meterNumber || '']));
    const today = new Date().toISOString().slice(0,10);
    const activeContracts = contracts.filter((c:any) => {
      const statusActive = String(c.status || 'Active').toLowerCase() === 'active' && !c.isArchived;
      const starts = dateOnly(c.leaseStartDate || c.contractStartDate);
      const ends = dateOnly(c.leaseEndDate || c.contractEndDate);
      return statusActive && (!starts || starts <= today) && (!ends || ends >= today);
    });

    return houses.map((h: any) => {
      const current = activeContracts.find((c:any) =>
        (c.houseId && String(c.houseId) === String(h.id)) ||
        (String(c.unitNumber || c.houseNumber || '') === String(h.houseNumber || h.unitNumber || '') &&
         (!c.buildingNumber || !h.buildingNumber || String(c.buildingNumber) === String(h.buildingNumber)))
      );
      return {
        id: h.id,
        compoundId: h.compoundId || '1',
        compoundName: h.compoundName || (h.compoundId === '2' ? 'Meadow Park Garden' : h.compoundId === '4' ? 'Daar Residence' : 'Azhar Residence'),
        buildingNumber: h.buildingNumber || (h.houseNumber || '').split('-')[0] || '',
        unitNumber: h.houseNumber || h.unitNumber || '',
        rooms: Number(h.roomsCount || 0),
        baths: Number(h.bathroomsCount || 0),
        living: Math.max(Number(h.livingCount || 0), Number(h.living || 0), Number(h.LivingCount || 0)),
        majlis: Math.max(Number(h.majlisCount || 0), Number(h.majlis || 0), Number(h.MajlisCount || 0)),
        area: String(h.area || ''),
        type: h.type || h.unitType || 'Apartment',
        electricityMeterNumber: h.electricityMeterNumber || meterByUnit.get(String(h.id)) || '',
        isFurnished: Boolean(h.isFurnished),
        notes: h.notes || '',
        status: current ? 'Occupied' : 'Vacant',
        annualRent: Number(h.annualRent || 0),
        currentTenantId: current?.tenantId || '',
        currentTenantName: current?.tenantName || ''
      };
    });
  },

  async getUnitHistory(unitId: string): Promise<any> {
    const res = await authedFetch(`/house/${encodeURIComponent(unitId)}/history`);
    if (!res.ok) throw new Error('Failed to fetch unit history');
    return res.json();
  },

  async getTenantHistory(tenantId: string): Promise<any> {
    const res = await authedFetch(`/Tenants/${encodeURIComponent(tenantId)}/history`);
    if (!res.ok) throw new Error('Failed to fetch tenant history');
    return res.json();
  },

  async addUnit(unitData: Partial<Unit>): Promise<Unit> {
    const payload = {
      houseNumber: unitData.unitNumber,
      buildingNumber: unitData.buildingNumber || '',
      compoundId: unitData.compoundId,
      compoundName: unitData.compoundName,
      roomsCount: unitData.rooms,
      bathroomsCount: unitData.baths,
      type: unitData.type,
      isFurnished: Boolean(unitData.isFurnished),
      notes: unitData.notes || '',
      status: unitData.status,
      annualRent: unitData.annualRent
    };
    const res = await authedFetch('/house', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to create unit');
    const h = await res.json();
    return { ...unitData, id: h.id, unitNumber: h.houseNumber || unitData.unitNumber || '', buildingNumber: h.buildingNumber || unitData.buildingNumber || '', rooms: Number(h.roomsCount ?? h.rooms ?? unitData.rooms ?? 0), baths: Number(h.bathroomsCount ?? h.baths ?? unitData.baths ?? 0), living: Number(h.livingCount ?? h.living ?? unitData.living ?? 0), majlis: Number(h.majlisCount ?? h.majlis ?? unitData.majlis ?? 0), annualRent: Number(h.annualRent ?? unitData.annualRent ?? 0) } as Unit;
  },

  async addContract(contractData: Partial<Contract>): Promise<Contract> {
    const res = await authedFetch('/Contracts', {
      method: 'POST',
      body: JSON.stringify(contractData)
    });
    if (!res.ok) throw new Error('Failed to create contract');
    return res.json();
  },

  async updateContract(id: string, contractData: Partial<Contract>): Promise<Contract> {
    const res = await authedFetch(`/Contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contractData)
    });
    if (!res.ok) throw new Error('Failed to update contract');
    return res.json();
  },

  async deleteContract(id: string): Promise<void> {
    const res = await authedFetch(`/Contracts/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || 'Failed to delete contract');
    }
  },

  // Dues (derived from server rent reports — same source as finance mapping)
  async getDues(): Promise<DueItem[]> {
    const [financeMap, tenants] = await Promise.all([
      this.getFinanceSummary().catch(() => new Map<string, FinanceSummary>()),
      this.getTenants().catch(() => [] as Tenant[])
    ]);

    if (financeMap.size === 0) {
      return tenants
        .filter(t => t.annualRent > 0)
        .map(t => {
          const expired = t.contractEndDate && new Date(t.contractEndDate).getTime() < Date.now();
          return {
            id: t.id,
            compoundId: '1',
            compoundName: 'Azhar Residence',
            unitNumber: t.houseNumber || t.unitNumber || '',
            tenantName: t.name,
            mobile: t.mobile,
            annualRent: Number(t.annualRent || 0) + Number(t.waterCost || 0),
            remainingRents: 1,
            rentValue: t.monthlyRent || Math.round(t.annualRent / 12),
            rentalDueDate: '',
            contractExpiryDate: t.contractEndDate || '',
            status: (expired ? 'Overdue' : 'Due Soon') as DueItem['status']
          };
        });
    }

    const tenantBy = new Map<string, Tenant>(tenants.map(t => [t.id, t] as [string, Tenant]));
    const finList: FinanceSummary[] = Array.from(financeMap.values());
    return finList.map((fin) => {
      const tn = tenantBy.get(fin.tenantId);
      const parts = String(fin.rentFrequency || '').toLowerCase().includes('quarter') ? 4 : String(fin.rentFrequency || '').toLowerCase().includes('semi') ? 2 : String(fin.rentFrequency || '').toLowerCase().includes('annual') ? 1 : 12;
      const annualRent = Number(fin.rentValue || 0) * parts || (Number(tn?.annualRent || 0) + Number(tn?.waterCost || 0));
      const remainingAmount = Math.max(0, Number(fin.remainingAmount || 0));
      return {
        id: fin.tenantId,
        compoundId: '1',
        compoundName: 'Azhar Residence',
        unitNumber: tn?.houseNumber || tn?.unitNumber || '',
        tenantName: tn?.name || '',
        mobile: tn?.mobile || '',
        annualRent,
        remainingRents: remainingAmount > 0 && fin.rentValue > 0 ? Math.max(1, Math.ceil(remainingAmount / fin.rentValue)) : (fin.status === 'Paid' ? 0 : 1),
        rentValue: fin.rentValue,
        rentalDueDate: fin.nextDueDate,
        contractExpiryDate: fin.contractEndDate,
        status: fin.status as DueItem['status']
      };
    });
  },

  // Maintenance
  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    const res = await authedFetch('/Maintenance');
    if (!res.ok) throw new Error('Failed to fetch maintenance');
    const data = asList(await res.json());
    const statusMap: Record<string, MaintenanceStatus> = {
      New: 'New', Open: 'New', Assigned: 'New', 'In Progress': 'In Progress',
      InProgress: 'In Progress', Done: 'Done', Closed: 'Done', Completed: 'Done',
      Rejected: 'Rejected Supervisor', RejectedSupervisor: 'Rejected Supervisor',
      Approved: 'In Progress'
    };
    return data.map((m: any) => ({
      id: m.id,
      rvNo: m.requestNumber || `MNT-${(m.id || '').slice(0, 4).toUpperCase()}`,
      compoundId: '1',
      compoundName: 'Azhar Residence',
      buildingNumber: (m.houseNumber || '').split('-')[0] || '',
      unitNumber: m.houseNumber || '',
      responsibleName: m.userName || m.assignedToName || '',
      startDate: m.createdAt ? String(m.createdAt).slice(0, 10) : '',
      targetEndDate: dateOnly(m.targetEndDate),
      workActivity: m.title || m.category || 'Maintenance',
      totalAmount: Number(m.totalAmount || 0),
      status: statusMap[m.status] || 'New',
      daysToEnd: 0,
      assignedStaffId: m.assignedStaffId || m.assignedToId || '',
      assignedStaffName: m.assignedStaffName || m.assignedToName || '',
      notes: m.adminNotes || m.description || ''
    }));
  },

  async addMaintenanceRequest(req: Omit<MaintenanceRequest, 'id'>): Promise<MaintenanceRequest> {
    const payload = {
      houseNumber: req.unitNumber,
      title: req.workActivity,
      category: req.workActivity,
      priority: 'Normal',
      description: req.notes || ''
    };
    const res = await authedFetch('/Maintenance', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create maintenance request');
    const saved = await res.json().catch(()=>null); return { ...req, ...(saved || {}), id: String(saved?.id || Date.now()), assignedStaffId: saved?.assignedStaffId || saved?.assignedToId || req.assignedStaffId || '', assignedStaffName: saved?.assignedStaffName || saved?.assignedToName || req.assignedStaffName || '' } as MaintenanceRequest;
  },

  async updateMaintenanceStatus(id: string, status: MaintenanceStatus): Promise<any> {
    const res = await authedFetch(`/Maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    return res.ok ? res.json() : null;
  },

  // Complaints
  async getComplaints(): Promise<Complaint[]> {
    const res = await authedFetch('/Complaints');
    if (!res.ok) throw new Error('Failed to fetch complaints');
    const data = asList(await res.json());
    const statusMap: Record<string, ComplaintStatus> = {
      Open: 'New', New: 'New', 'In Progress': 'In Progress', InProgress: 'In Progress',
      Resolved: 'Resolved', Closed: 'Closed', Done: 'Resolved'
    };
    const priorityMap: Record<string, ComplaintPriority> = {
      High: 'High', Urgent: 'High', Medium: 'Medium', Low: 'Low'
    };
    return data.map((c: any) => ({
      id: c.id,
      ticketNo: c.ticketNumber || c.ticketNo || `TKT-${(c.id || '').slice(0, 8).toUpperCase()}`,
      complainantName: c.userName || c.complainantName || 'Tenant',
      buildingNumber: (c.houseNumber || '').split('-')[0] || '',
      unitNumber: c.houseNumber || '',
      phone: c.phoneNumber || '',
      category: c.category || 'General',
      priority: priorityMap[c.priority] || 'Medium',
      description: c.description || c.title || '',
      status: statusMap[c.status] || 'New',
      createdAt: dateOnly(c.createdAt),
      resolutionNotes: c.adminReply || ''
    }));
  },

  async addComplaint(complaint: Omit<Complaint, 'id'>): Promise<Complaint> {
    const payload = {
      houseNumber: complaint.unitNumber,
      title: complaint.category,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority
    };
    const res = await authedFetch('/Complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create complaint');
    return { ...complaint, id: String(Date.now()) } as Complaint;
  },

  async updateComplaintStatus(id: string, status: ComplaintStatus, resolutionNotes?: string): Promise<any> {
    const res = await authedFetch(`/Complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminReply: resolutionNotes || '' })
    });
    return res.ok ? res.json() : null;
  },

  // Staff
  async getStaffMembers(): Promise<StaffMember[]> {
    const res = await authedFetch('/staff');
    if (!res.ok) throw new Error('Failed to fetch staff');
    const data = asList(await res.json());
    return data.map((s: any, i: number) => ({
      id: s.id,
      empCode: s.empCode || `EMP-${String(i + 1).padStart(3, '0')}`,
      name: s.fullName || s.name || 'Staff',
      role: s.position || s.specialization || s.role || 'Maintenance',
      mobile: s.phoneNumber || s.mobile || '',
      email: s.email || '',
      username: s.username || s.empCode || '',
      whatsapp: s.whatsappNumber || s.phoneNumber || '',
      nationalId: s.nationalId || '',
      status: (s.isActive === false ? 'Suspended' : 'Active') as StaffStatus,
      joiningDate: s.createdAt ? String(s.createdAt).slice(0, 10) : '',
      salary: Number(s.salary || 0),
      password: s.password || '',
      notes: s.notes || ''
    }));
  },

  async addStaff(staff: Omit<StaffMember, 'id'>): Promise<StaffMember> {
    const payload = {
      empCode: staff.empCode, username: (staff as any).username || staff.empCode || '', fullName: staff.name, phoneNumber: staff.mobile,
      email: staff.email || '', position: staff.role, nationalId: staff.nationalId,
      salary: staff.salary, notes: staff.notes || '', whatsappNumber: staff.whatsapp,
      password: (staff as any).password || '',
      isActive: staff.status !== 'Suspended'
    };
    const res = await authedFetch('/staff', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || 'Failed to create staff');
    const saved = await res.json();
    return { ...staff, id: saved.id, username: saved.username || (staff as any).username || staff.empCode || '', email: saved.email || staff.email || '', password: '' } as StaffMember;
  },

  async updateStaffStatus(id: string, status: StaffStatus): Promise<any> {
    const res = await authedFetch(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: status !== 'Suspended' })
    });
    return res.ok ? res.json() : null;
  },

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    const res = await authedFetch('/Expense');
    if (!res.ok) throw new Error('Failed to fetch expenses');
    const data = asList(await res.json());
    return data.map((x: any) => ({
      id: x.id,
      voucherNo: x.voucherNumber || x.voucherNo || `V-${(x.id || '').slice(0, 8).toUpperCase()}`,
      category: x.category || 'Other',
      title: x.description || x.title || 'Expense',
      amount: Number(x.amount || 0),
      recipient: x.payee || x.recipient || x.vendor || '',
      paymentMethod: x.paymentMethod || 'Cash',
      expenseDate: dateOnly(x.date || x.expenseDate),
      compoundId: '1',
      notes: x.notes || ''
    }));
  },

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const payload = {
      description: expense.title || expense.category,
      category: expense.category,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      date: expense.expenseDate,
      notes: expense.notes || '',
      recipient: expense.recipient,
      voucherNo: expense.voucherNo
    };
    const res = await authedFetch('/Expense', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create expense');
    const x: any = await res.json();
    return {
      id: String(x.id),
      voucherNo: x.voucherNo || x.voucherNumber || expense.voucherNo,
      category: x.category || expense.category,
      title: x.description || x.title || expense.title,
      amount: Number(x.amount ?? expense.amount),
      recipient: x.payee || x.recipient || x.vendor || expense.recipient,
      paymentMethod: x.paymentMethod || expense.paymentMethod,
      expenseDate: dateOnly(x.date || x.expenseDate || expense.expenseDate),
      compoundId: expense.compoundId || '1',
      notes: x.notes ?? expense.notes ?? ''
    } as Expense;
  },

  // Meters
  async getElectricityMeters(): Promise<ElectricityMeter[]> {
    const res = await authedFetch('/ElectricityMeter');
    if (!res.ok) throw new Error('Failed to fetch electricity meters');
    const data = asList(await res.json());
    return data.map((m: any) => ({
      id: m.id,
      compoundId: '1',
      unitId: m.unitId || m.houseId || undefined,
      building: m.building || (m.houseNumber || '').split('-')[0] || '',
      unitNumber: m.unitNumber || m.houseNumber || '',
      meterNumber: m.meterNumber || '',
      paymentNumber: m.paymentNumber || '',
      isRented: Boolean(m.houseId)
    }));
  },

  async addElectricityMeter(meter: Omit<ElectricityMeter, 'id'>): Promise<ElectricityMeter> {
    const payload = {
      meterNumber: meter.meterNumber,
      houseId: meter.unitId,
      unitId: meter.unitId,
      houseNumber: meter.unitNumber,
      building: meter.building,
      unitNumber: meter.unitNumber,
      paymentNumber: meter.paymentNumber,
      type: meter.type
    };
    const res = await authedFetch('/ElectricityMeter', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create electricity meter');
    const data = await res.json();
    return { ...meter, ...data, id: data.id } as ElectricityMeter;
  },
  async updateElectricityMeter(id:string, updates:Partial<ElectricityMeter>):Promise<ElectricityMeter>{const res=await authedFetch(`/ElectricityMeter/${id}`,{method:'PUT',body:JSON.stringify(updates)});if(!res.ok)throw new Error('Failed to update electricity meter');return res.json();},
  async deleteElectricityMeter(id:string):Promise<void>{const res=await authedFetch(`/ElectricityMeter/${id}`,{method:'DELETE'});if(!res.ok)throw new Error('Failed to delete electricity meter');},

  // Water meters — real PostgreSQL entity.
  async getWaterMeters(): Promise<WaterMeter[]> {
    const res = await authedFetch('/WaterMeter'); if(!res.ok) throw new Error('Failed to fetch water meters');
    return asList(await res.json()).map((m:any)=>({id:m.id,unitId:m.unitId||undefined,building:m.building||'',unitNumber:m.unitNumber||'',meterNumber:m.meterNumber||'',lastReading:m.lastReading==null?undefined:Number(m.lastReading),readingDate:dateOnly(m.readingDate)}));
  },
  async addWaterMeter(meter: Omit<WaterMeter, 'id'>): Promise<WaterMeter> {
    const res=await authedFetch('/WaterMeter',{method:'POST',body:JSON.stringify(meter)}); if(!res.ok) throw new Error('Failed to create water meter'); return res.json();
  },
  async updateWaterMeter(id:string, updates:Partial<WaterMeter>):Promise<WaterMeter>{const res=await authedFetch(`/WaterMeter/${id}`,{method:'PUT',body:JSON.stringify(updates)});if(!res.ok)throw new Error('Failed to update water meter');return res.json();},
  async deleteWaterMeter(id:string):Promise<void>{const res=await authedFetch(`/WaterMeter/${id}`,{method:'DELETE'});if(!res.ok)throw new Error('Failed to delete water meter');},

  // Payments
  async getPayments(): Promise<PaymentRecord[]> {
    const res = await authedFetch('/Payment');
    if (!res.ok) throw new Error('Failed to fetch payments');
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
    return list.map((p: any) => ({
      id: p.id,
      tenantId: p.tenantId || '',
      tenantName: p.tenantName || '',
      unitNumber: p.unitNumber || '',
      amount: Number(p.amount || 0),
      month: p.month,
      year: p.year,
      paymentMethod: p.paymentMethod || '',
      status: p.status || 'Paid',
      paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : '', contractId:p.contractId, receiptNo:p.receiptNo, referenceNo:p.referenceNo, unappliedAmount:Number(p.unappliedAmount||0), allocations:p.allocations||[]
    }));
  },

  async addPayment(payment: { tenantId: string; tenantName: string; unitNumber: string; amount: number; month?: number; year?: number; paymentMethod: string; status?: string; contractId?: string; paymentDate?: string; referenceNo?: string; notes?: string }): Promise<PaymentRecord> {
    const res = await authedFetch('/Payment', {
      method: 'POST',
      body: JSON.stringify(payment)
    });
    if (!res.ok) throw new Error('Failed to create payment');
    const data = await res.json();
    return {
      id: data.id,
      tenantId: data.tenantId || '',
      tenantName: data.tenantName || '',
      unitNumber: data.unitNumber || '',
      amount: Number(data.amount || 0),
      month: data.month,
      year: data.year,
      paymentMethod: data.paymentMethod || '',
      status: data.status || 'Paid',
      paymentDate: data.paymentDate ? String(data.paymentDate).slice(0, 10) : '', contractId:data.contractId, receiptNo:data.receiptNo, referenceNo:data.referenceNo, unappliedAmount:Number(data.unappliedAmount||0), allocations:data.allocations||[]
    };
  },
  async reversePayment(id:string,reason:string):Promise<void>{const res=await authedFetch(`/Payment/${id}/reverse`,{method:'POST',body:JSON.stringify({reason})});if(!res.ok)throw new Error('Failed to reverse payment');},
  async getRentLedger(contractId:string):Promise<any>{const res=await authedFetch(`/Rental/ledger/${contractId}`);if(!res.ok)throw new Error('Failed to fetch rent ledger');return res.json();},
  async getOverdueInstallments():Promise<any[]>{const res=await authedFetch('/Rental/overdue');if(!res.ok)throw new Error('Failed to fetch overdue installments');return asList(await res.json());},
  async getFinalSettlement(id:string,effectiveDate:string):Promise<any>{const res=await authedFetch(`/Contracts/${id}/final-settlement?effectiveDate=${encodeURIComponent(effectiveDate)}`);if(!res.ok)throw new Error('Failed to calculate final settlement');return res.json();},
  async terminateContract(id:string,effectiveDate:string,reason:string):Promise<Contract>{const res=await authedFetch(`/Contracts/${id}/terminate`,{method:'POST',body:JSON.stringify({effectiveDate,reason})});if(!res.ok)throw new Error('Failed to terminate contract');return res.json();},
  async renewContract(id:string,data:Partial<Contract>):Promise<Contract>{const res=await authedFetch(`/Contracts/${id}/renew`,{method:'POST',body:JSON.stringify(data)});if(!res.ok)throw new Error('Failed to renew contract');return res.json();},

  async getBuildings(): Promise<any[]> { const res=await authedFetch('/Buildings'); if(!res.ok) throw new Error('Failed to fetch buildings'); return asList(await res.json()); },
  async addBuilding(building:any): Promise<any> { const res=await authedFetch('/Buildings',{method:'POST',body:JSON.stringify({buildingNumber:building.buildingNo||building.buildingNumber,name:building.name||'',notes:building.remarks||building.notes||''})}); if(!res.ok) throw new Error('Failed to create building'); return res.json(); },
  async updateBuilding(id:string,building:any): Promise<any> { const res=await authedFetch(`/Buildings/${id}`,{method:'PUT',body:JSON.stringify(building)}); if(!res.ok) throw new Error('Failed to update building'); return res.json(); },
  async deleteBuilding(id:string): Promise<void> { const res=await authedFetch(`/Buildings/${id}`,{method:'DELETE'}); if(!res.ok) throw new Error('Failed to delete building'); },

  // Companies
  async getCompanies(): Promise<Company[]> {
    const res = await authedFetch('/Company');
    if (!res.ok) throw new Error('Failed to fetch companies');
    const data = asList(await res.json());
    return data.map((c: any) => ({
      id: c.id,
      companyName: c.companyName || '',
      contactPerson: c.contactPerson || '',
      specialization: c.specialization || '',
      email: c.email || '',
      phone: c.phone || '',
      notes: c.notes || ''
    }));
  },

  async addCompany(data:Partial<Company>):Promise<Company>{const res=await authedFetch('/Company',{method:'POST',body:JSON.stringify(data)});if(!res.ok)throw new Error('Failed to create company');return res.json();},
  async updateCompany(id:string,data:Partial<Company>):Promise<Company>{const res=await authedFetch(`/Company/${id}`,{method:'PUT',body:JSON.stringify(data)});if(!res.ok)throw new Error('Failed to update company');return res.json();},
  async deleteCompany(id:string):Promise<void>{const res=await authedFetch(`/Company/${id}`,{method:'DELETE'});if(!res.ok)throw new Error('Failed to delete company');},

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await authedFetch('/Announcements');
    if (!res.ok) throw new Error('Failed to fetch announcements');
    const data = asList(await res.json());
    return data.map((a: any) => ({
      id: a.id,
      title: a.title || '',
      description: a.description || '',
      announcementDate: a.announcementDate && a.announcementDate.startsWith('0001') ? a.createdAt : a.announcementDate,
      createdAt: a.createdAt || '',
      isActive: a.isActive !== false,
      imageUrls: a.imageUrls || []
    }));
  },

  async addAnnouncement(data:Partial<Announcement>):Promise<Announcement>{const res=await authedFetch('/Announcements',{method:'POST',body:JSON.stringify(data)});if(!res.ok)throw new Error('Failed to create announcement');return res.json();},
  async updateAnnouncement(id:string,data:Partial<Announcement>):Promise<Announcement>{const res=await authedFetch(`/Announcements/${id}`,{method:'PUT',body:JSON.stringify(data)});if(!res.ok)throw new Error('Failed to update announcement');return res.json();},
  async deleteAnnouncement(id:string):Promise<void>{const res=await authedFetch(`/Announcements/${id}`,{method:'DELETE'});if(!res.ok)throw new Error('Failed to delete announcement');},

  // Letters
  async getLetters(): Promise<Letter[]> {
    const res = await authedFetch('/letters');
    if (!res.ok) throw new Error('Failed to fetch letters');
    const data = asList(await res.json());
    return data.map((l: any) => ({
      id: l.id,
      title: l.title || '',
      content: l.content || '',
      recipientType: l.recipientType || '',
      recipientId: l.recipientId || null,
      recipientName: l.recipientName || '',
      sentById: l.sentById || '',
      sentByName: l.sentByName || '',
      sentAt: l.sentAt || ''
    }));
  },

  async createLetter(letterData: { title: string; content: string; recipientType?: string; recipientName?: string }): Promise<Letter> {
    const payload = {
      title: letterData.title,
      content: letterData.content,
      recipientType: letterData.recipientType || 'AllTenants',
      recipientId: null,
      recipientName: letterData.recipientName || ''
    };

    const res = await authedFetch('/letters', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create letter');

    const letters = await this.getLetters();
    const created = letters.find(l => l.title === payload.title);
    return created || {
      id: String(Date.now()),
      title: payload.title,
      content: payload.content,
      recipientType: payload.recipientType,
      recipientId: null,
      recipientName: payload.recipientName,
      sentById: '',
      sentByName: 'Admin',
      sentAt: new Date().toISOString()
    };
  },

  // Backend exposes no PUT/PATCH for letters → implement edit as create + delete
  // (create first so a failure never leaves the letter deleted).
  async updateLetter(id: string, letterData: { title: string; content: string; recipientType?: string; recipientName?: string }): Promise<Letter> {
    const created = await this.createLetter(letterData);
    try {
      await this.deleteLetter(id);
    } catch {
      // old copy couldn't be removed from server; keep the new one
    }
    return created;
  },

  async deleteLetter(id: string) {
    const res = await authedFetch(`/letters/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete letter');
    return res.json();
  },

  // Facilities
  async getFacilities(): Promise<Facility[]> {
    const res = await authedFetch('/Facilities');
    if (!res.ok) throw new Error('Failed to fetch facilities');
    return asList(await res.json()).map((f: any) => ({
      id: f.id,
      name: f.name || f.nameAr || '',
      nameEn: f.nameEn || f.name || '',
      category: f.category || 'Hall',
      iconName: f.iconName || '',
      description: f.description || '',
      location: f.location || '',
      operatingHours: f.operatingHours || '',
      capacityLimit: Number(f.capacityLimit || 0),
      isAvailable: f.isAvailable !== false,
      image: f.image || ''
    }));
  },

  async createFacility(data: Omit<Facility, 'id'>): Promise<Facility> {
    const res = await authedFetch('/Facilities', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create facility');
    const created = await res.json();
    return { ...data, id: created.id || String(Date.now()) };
  },

  async updateFacility(id: string, data: Partial<Facility>): Promise<Facility> {
    const res = await authedFetch(`/Facilities/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update facility');
    const updated = await res.json();
    return { ...data, id } as Facility;
  },

  async deleteFacility(id: string): Promise<void> {
    const res = await authedFetch(`/Facilities/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete facility');
  },

  // Facility Bookings
  async getFacilityBookings(): Promise<FacilityBooking[]> {
    const res = await authedFetch('/FacilityBookings');
    if (!res.ok) throw new Error('Failed to fetch facility bookings');
    return asList(await res.json()).map((b: any) => ({
      id: b.id,
      bookingNo: b.bookingNo || b.bookingNumber || '',
      facilityId: b.facilityId || '',
      facilityName: b.facilityName || '',
      tenantId: b.tenantId || '',
      tenantName: b.tenantName || '',
      unitNumber: b.unitNumber || '',
      mobile: b.mobile || '',
      bookingDate: dateOnly(b.bookingDate),
      startTime: b.startTime || '',
      endTime: b.endTime || '',
      guestsCount: Number(b.guestsCount || 0),
      purpose: b.purpose || '',
      status: b.status || 'Pending',
      createdAt: b.createdAt || '',
      adminNotes: b.adminNotes || '',
      approvedBy: b.approvedBy || ''
    }));
  },

  async createFacilityBooking(data: Omit<FacilityBooking, 'id' | 'bookingNo' | 'createdAt' | 'status'> & { status?: FacilityBookingStatus }): Promise<FacilityBooking> {
    const res = await authedFetch('/FacilityBookings', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create facility booking');
    const created = await res.json();
    return {
      ...data,
      status: (data.status || 'Pending') as FacilityBookingStatus,
      id: created.id || String(Date.now()),
      bookingNo: created.bookingNo || `FBK-${Date.now()}`,
      createdAt: created.createdAt || new Date().toISOString()
    };
  },

  async updateFacilityBooking(id: string, data: Partial<FacilityBooking>): Promise<FacilityBooking> {
    const res = await authedFetch(`/FacilityBookings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update facility booking');
    const updated = await res.json();
    return { ...data, id } as FacilityBooking;
  },

  async deleteFacilityBooking(id: string): Promise<void> {
    const res = await authedFetch(`/FacilityBookings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete facility booking');
  },

  // Reports
  async updateUnit(id: string, data: Partial<Unit>): Promise<Unit> { const payload:any={...data, houseNumber:data.unitNumber, roomsCount:data.rooms, bathroomsCount:data.baths, livingCount:data.living, majlisCount:data.majlis}; const r=await authedFetch(`/house/${id}`,{method:'PUT',body:JSON.stringify(payload)}); if(!r.ok) throw new Error('Failed to update unit'); return await r.json(); },
  async deleteUnit(id: string): Promise<void> { const r=await authedFetch(`/house/${id}`,{method:'DELETE'}); if(!r.ok) throw new Error('Failed to delete unit'); },
  async deleteMaintenanceRequest(id: string): Promise<void> { const r=await authedFetch(`/Maintenance/${id}`,{method:'DELETE'}); if(!r.ok) throw new Error('Failed to delete maintenance request'); },
  async updateMaintenance(id: string, data: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> { const r=await authedFetch(`/Maintenance/${id}`,{method:'PUT',body:JSON.stringify(data)}); if(!r.ok) throw new Error('Failed to update maintenance request'); return await r.json(); },
  async deleteComplaint(id: string): Promise<void> { const r=await authedFetch(`/Complaints/${id}`,{method:'DELETE'}); if(!r.ok) throw new Error('Failed to delete complaint'); },
  async updateStaff(id: string, data: Partial<StaffMember>): Promise<StaffMember> { const r=await authedFetch(`/staff/${id}`,{method:'PUT',body:JSON.stringify(data)}); if(!r.ok) throw new Error('Failed to update staff'); return await r.json(); },
  async deleteStaff(id: string): Promise<void> { const r=await authedFetch(`/staff/${id}`,{method:'DELETE'}); if(!r.ok) throw new Error('Failed to delete staff'); },
  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> { const r=await authedFetch(`/Expense/${id}`,{method:'PUT',body:JSON.stringify(data)}); if(!r.ok) throw new Error('Failed to update expense'); return await r.json(); },
  async deleteExpense(id: string): Promise<void> { const r=await authedFetch(`/Expense/${id}`,{method:'DELETE'}); if(!r.ok) throw new Error('Failed to delete expense'); },
  async getRoles(): Promise<any[]> { const r=await authedFetch('/admin/roles'); if(!r.ok) throw new Error('Failed to load roles'); return await r.json(); },
  async updateRolePermissions(roleId: string, permissions: string[]): Promise<void> { const r=await authedFetch(`/admin/roles/${roleId}/permissions`,{method:'PUT',body:JSON.stringify({permissions})}); if(!r.ok) throw new Error('Failed to update role permissions'); },
  async getUsers(): Promise<any[]> { const r=await authedFetch('/admin/users'); if(!r.ok) throw new Error('Failed to load users'); return await r.json(); },

  async setTenantPassword(id:string,password:string):Promise<void>{const r=await authedFetch(`/admin/tenants/${id}/password`,{method:'PUT',body:JSON.stringify({password})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).message||'Failed to update tenant password');},
  async setStaffPassword(id:string,password:string):Promise<void>{const r=await authedFetch(`/admin/staff/${id}/password`,{method:'PUT',body:JSON.stringify({password})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).message||'Failed to update staff password');},

  async getDashboardStats(): Promise<any> { const r=await authedFetch('/admin/dashboard-stats'); if(!r.ok) throw new Error('Failed to load dashboard stats'); return await r.json(); },

  async getReports(): Promise<RentReport[]> {
    const res = await authedFetch('/Reports');
    if (!res.ok) throw new Error('Failed to fetch reports');
    const data = asList(await res.json());
    return data.map((r: any) => ({
      tenantId: r.tenantId || '',
      tenantName: r.tenantName || '',
      nextDueDate: dateOnly(r.nextDueDate),
      unitNumber: r.unitNumber || '',
      rentAmount: Number(r.rentAmount || 0),
      rentFrequency: r.rentFrequency || '',
      contractEndDate: dateOnly(r.contractEndDate),
      remainingDays: Number(r.remainingDays || 0),
      paidAmount: Number(r.paidAmount || 0),
      remainingAmount: Number(r.remainingAmount || 0),
      status: r.status || ''
    }));
  },

  async globalSearch(query: string): Promise<Array<{ type: string; id: string; title: string; subtitle?: string }>> {
    const q = query.trim();
    if (q.length < 2) return [];
    const res = await authedFetch(`/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Failed to search');
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.results || []);
  },

  // Profile
  async getProfile(): Promise<any> {
    const res = await authedFetch('/Profile');
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const res = await authedFetch('/Notifications');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
    return list.map((n: any) => ({
      id: n.id,
      title: n.title || '',
      body: n.body || '',
      type: n.type || '',
      relatedEntityId: n.relatedEntityId || '',
      isRead: Boolean(n.isRead),
      createdAt: n.createdAt || ''
    }));
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const res = await authedFetch(`/Notifications/${id}/read`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to mark notification as read');
  },

  async registerFcmToken(fcmToken: string, deviceType: string = 'web'): Promise<void> {
    const res = await authedFetch('/Account/fcm-token', {
      method: 'PUT',
      body: JSON.stringify({ fcmToken, deviceType })
    });
    if (!res.ok) throw new Error('Failed to register FCM token');
  },

  async updateProfile(data: { displayName?: string; email?: string; profileImageUrl?: string }): Promise<void> {
    const res = await authedFetch('/Profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
  },

  async uploadMedia(file: File, category: string, entityType?: string, entityId?: string): Promise<{ id: string; url: string; fileName: string; mimeType: string; fileSize: number }> {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('FILE_READ_FAILED'));
      reader.readAsDataURL(file);
    });
    const res = await authedFetch('/Media', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64, category, entityType, entityId })
    });
    if (!res.ok) { const raw = await res.text(); throw new Error(friendlyApiError(res.status, raw, '/Media').ar); }
    const data = await res.json();
    return { id: data.id, url: data.url, fileName: data.file_name || data.fileName || file.name, mimeType: data.mime_type || data.mimeType || file.type, fileSize: Number(data.file_size || data.fileSize || file.size) };
  },

  async uploadProfileImage(file: File): Promise<string> {
    const uploaded = await this.uploadMedia(file, 'profile', 'profile');
    const res = await authedFetch('/Profile', { method: 'PUT', body: JSON.stringify({ profileImageUrl: uploaded.url }) });
    if (!res.ok) { const raw = await res.text(); throw new Error(friendlyApiError(res.status, raw, '/Profile').ar); }
    return uploaded.url;
  },

  async openMedia(url: string): Promise<void> {
    if (!url) return;
    if (url.startsWith('/media/')) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    const path = url.startsWith('/api/') ? url.slice(4) : url;
    const res = await authedFetch(path);
    if (!res.ok) { const raw = await res.text(); throw new Error(friendlyApiError(res.status, raw, '/Media').ar); }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  },

  async deleteMedia(id: string): Promise<void> {
    const res = await authedFetch(`/Media/${id}`, { method: 'DELETE' });
    if (!res.ok) { const raw = await res.text(); throw new Error(friendlyApiError(res.status, raw, '/Media').ar); }
  },

  async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await authedFetch('/Account/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
    if (!res.ok) { const raw = await res.text(); throw new Error(friendlyApiError(res.status, raw, '/Account/change-password').ar); }
  },

  async getTenantPortalData(): Promise<any> {
    const [me, contracts, installments, payments, ledger, maintenance, complaints, announcements, facilities, bookings, letters, documents] = await Promise.all([
      authedFetch('/tenant-portal/me').then(r=>r.ok?r.json():Promise.reject(new Error('TENANT_ME_FAILED'))),
      authedFetch('/tenant-portal/contracts').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/installments').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/payments').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/ledger').then(r=>r.ok?r.json():null),
      authedFetch('/tenant-portal/maintenance').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/complaints').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/announcements').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/facilities').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/facility-bookings').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/letters').then(r=>r.ok?r.json():[]),
      authedFetch('/tenant-portal/documents').then(r=>r.ok?r.json():[])
    ]);
    return { me, contracts, installments, payments, ledger, maintenance, complaints, announcements, facilities, bookings, letters, documents };
  },

  async tenantCreateMaintenance(data: any): Promise<any> { const r=await authedFetch('/tenant-portal/maintenance',{method:'POST',body:JSON.stringify(data)}); if(!r.ok)throw new Error('TENANT_MAINTENANCE_FAILED'); return r.json(); },
  async tenantCreateComplaint(data: any): Promise<any> { const r=await authedFetch('/tenant-portal/complaints',{method:'POST',body:JSON.stringify(data)}); if(!r.ok)throw new Error('TENANT_COMPLAINT_FAILED'); return r.json(); },
  async tenantCreateBooking(data: any): Promise<any> { const r=await authedFetch('/tenant-portal/facility-bookings',{method:'POST',body:JSON.stringify(data)}); if(!r.ok)throw new Error('TENANT_BOOKING_FAILED'); return r.json(); },
  async tenantUpdateProfile(data: any): Promise<any> { const r=await authedFetch('/tenant-portal/profile',{method:'PUT',body:JSON.stringify(data)}); if(!r.ok)throw new Error('TENANT_PROFILE_FAILED'); return r.json(); },
  async tenantCancelBooking(id: string, reason?: string): Promise<any> { const r=await authedFetch(`/tenant-portal/facility-bookings/${id}/cancel`,{method:'PUT',body:JSON.stringify({reason:reason||''})}); if(!r.ok)throw new Error('TENANT_CANCEL_BOOKING_FAILED'); return r.json(); },

  async getStaffPortalData(): Promise<any> {
    const [me, dashboard, maintenance, complaints, units, tenants, announcements] = await Promise.all([
      authedFetch('/staff-portal/me').then(r=>r.ok?r.json():Promise.reject(new Error('STAFF_ME_FAILED'))),
      authedFetch('/staff-portal/dashboard').then(r=>r.ok?r.json():null),
      authedFetch('/staff-portal/maintenance').then(r=>r.ok?r.json():[]),
      authedFetch('/staff-portal/complaints').then(r=>r.ok?r.json():[]),
      authedFetch('/staff-portal/units').then(r=>r.ok?r.json():[]),
      authedFetch('/staff-portal/tenants').then(r=>r.ok?r.json():[]),
      authedFetch('/staff-portal/announcements').then(r=>r.ok?r.json():[])
    ]);
    return { me, dashboard, maintenance, complaints, units, tenants, announcements };
  },
  async staffUpdateMaintenanceStatus(id:string,status:string): Promise<any> { const r=await authedFetch(`/staff-portal/maintenance/${id}/status`,{method:'PUT',body:JSON.stringify({status})}); if(!r.ok)throw new Error('STAFF_MAINT_STATUS_FAILED'); return r.json(); },
  async staffUpdateMaintenanceNotes(id:string,notes:string): Promise<any> { const r=await authedFetch(`/staff-portal/maintenance/${id}/notes`,{method:'PUT',body:JSON.stringify({notes})}); if(!r.ok)throw new Error('STAFF_MAINT_NOTES_FAILED'); return r.json(); }
};
