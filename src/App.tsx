import React, { useState, useEffect } from 'react';
import { User, Unit, Building, Tenant, Contract, DueItem, MaintenanceRequest, MaintenanceStatus, WaterMeter, ElectricityMeter, Complaint, StaffMember, Expense, ComplaintStatus, StaffStatus, PaymentRecord, Company, Letter, Announcement, Facility, FacilityBooking, FacilityBookingStatus } from './types';
import { apiService, ensureAuth } from './services/api';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardMain } from './views/DashboardMain';
import { DashboardDues } from './views/DashboardDues';
import { DashboardDuesStats } from './views/DashboardDuesStats';
import { DashboardMaintenance } from './views/DashboardMaintenance';
import { DashboardMaintenanceStats } from './views/DashboardMaintenanceStats';
import { CompoundContracts } from './views/CompoundContracts';
import { CompoundUnits } from './views/CompoundUnits';
import { TenantsList } from './views/TenantsList';
import { MetersView } from './views/MetersView';
import { ComplaintsView } from './views/ComplaintsView';
import { StaffView } from './views/StaffView';
import { StaffPortalView } from './views/StaffPortalView';
import { TenantPortalView } from './views/TenantPortalView';
import { ExpensesView } from './views/ExpensesView';
import { LettersView } from './views/LettersView';
import { FacilitiesView } from './views/FacilitiesView';
import { FacilityBookingsView } from './views/FacilityBookingsView';
import { PatchNotesView } from './views/PatchNotesView';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { AdminPermissionsModal } from './components/AdminPermissionsModal';
import { AdminContentView } from './views/AdminContentView';
import { AppToast } from './components/AppToast';
import { AppDialog } from './components/AppDialog';

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <AppToast />
        <AppDialog />
        <MainApp />
      </NotificationProvider>
    </LanguageProvider>
  );
}

function MainApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('azhar_residence_user');
    if (!saved) return null;
    const user = JSON.parse(saved) as User;
    if (user.role === 'Admin') {
      return { ...user, name: 'Admin', email: 'admin@azhar.com' };
    }
    return user;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('azhar_contracts');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showProfileSettings, setShowProfileSettings] = useState<boolean>(false);
  const [showAdminPermissions, setShowAdminPermissions] = useState<boolean>(false);

  // Production state is server-owned; no demo-data fallback is used.
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [dues, setDues] = useState<DueItem[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [waterMeters, setWaterMeters] = useState<WaterMeter[]>([]);
  const [electricityMeters, setElectricityMeters] = useState<ElectricityMeter[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>([]);
  const [serverProfile, setServerProfile] = useState<any>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Any successful API mutation triggers a silent background refresh.
  // Debounced so compound operations (e.g. payment + persistence) cause one reload.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChanged = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setDataVersion(v => v + 1), 180);
    };
    window.addEventListener('azhar:data-changed', onChanged as EventListener);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('azhar:data-changed', onChanged as EventListener);
    };
  }, []);

  // Load state from real Azhar backend server
  useEffect(() => {
    async function loadBackendData() {
      if (!currentUser) return;
      const token = await ensureAuth();
      if (!token) return;

      if (currentUser.role === 'Tenant') {
        try {
          const d = await apiService.getTenantPortalData();
          const t:any = d.me?.tenant || {};
          setCurrentUser(prev => prev ? { ...prev, tenantId: t.id || prev.tenantId, unitNumber: t.unitNumber || t.houseNumber || prev.unitNumber } : prev);
          setTenants([{ id:t.id, name:t.fullName||t.name||'', fullNameArabic:t.fullNameArabic||'', email:t.email||'', mobile:t.phoneNumber||t.mobile||'', emergencyPhone:t.emergencyPhoneNumber||t.emergencyPhone||'', whatsapp:t.whatsappNumber||t.whatsapp||'', nationality:t.nationality||'', familyCount:t.familyCount||'', hasContract:(d.contracts||[]).length>0, compoundId:'1', compoundName:'Azhar Residence', unitNumber:t.unitNumber||t.houseNumber||'', houseNumber:t.houseNumber||t.unitNumber||'', annualRent:Number(t.annualRent||0), monthlyRent:Number(t.monthlyRent||0), paidAmount:Number(t.paidAmount||0), remainingAmount:Number(t.remainingAmount||0), contractStartDate:t.contractStartDate||'', contractEndDate:t.contractEndDate||'', identityDocumentUrl:t.identityDocumentUrl||'', identityDocumentName:t.identityDocumentName||'', manualContractDocumentUrl:t.manualContractDocumentUrl||'', manualContractDocumentName:t.manualContractDocumentName||'' } as Tenant]);
          setContracts((d.contracts||[]) as Contract[]);
          setMaintenanceRequests((d.maintenance||[]) as MaintenanceRequest[]);
          setComplaints((d.complaints||[]) as Complaint[]);
          setPayments((d.payments||[]).map((x:any)=>({id:x.id,tenantId:t.id,tenantName:t.fullName||t.name||'',unitNumber:t.unitNumber||t.houseNumber||'',amount:Number(x.amount||0),paymentMethod:x.paymentMethod||'',status:x.status||'',paymentDate:String(x.paymentDate||''),contractId:x.contractId,receiptNo:x.receiptNo,referenceNo:x.referenceNo})) as PaymentRecord[]);
          setAnnouncements((d.announcements||[]) as Announcement[]);
          setFacilities((d.facilities||[]) as Facility[]);
          setFacilityBookings((d.bookings||[]) as FacilityBooking[]);
        } catch (err) { console.error('Failed to load tenant portal data', err); }
        return;
      }

      if (currentUser.role === 'Staff') {
        try {
          const d = await apiService.getStaffPortalData(); const st:any=d.me?.staff||{};
          setCurrentUser(prev => prev ? { ...prev, staffId: st.id || prev.staffId } : prev);
          setStaffMembers([{id:st.id,empCode:st.empCode||st.employeeCode||'',name:st.fullName||st.name||currentUser.name,role:st.role||st.jobTitle||'Staff',mobile:st.phoneNumber||st.mobile||'',whatsapp:st.whatsapp||st.whatsappNumber||'',nationalId:st.nationalId||'',status:(st.status||'Active') as StaffStatus,joiningDate:st.joiningDate||'',salary:Number(st.salary||0)}]);
          setMaintenanceRequests((d.maintenance||[]) as MaintenanceRequest[]); setComplaints((d.complaints||[]) as Complaint[]); setUnits((d.units||[]) as Unit[]); setTenants((d.tenants||[]) as Tenant[]); setAnnouncements((d.announcements||[]) as Announcement[]);
        } catch (err) { console.error('Failed to load staff portal data', err); }
        return;
      }

      const all = await Promise.allSettled([
        apiService.getTenants(),
        apiService.getUnits(),
        apiService.getContracts(),
        apiService.getDues(),
        apiService.getMaintenanceRequests(),
        apiService.getComplaints(),
        apiService.getStaffMembers(),
        apiService.getExpenses(),
        apiService.getElectricityMeters(),
        apiService.getWaterMeters(),
        apiService.getPayments(),
        apiService.getCompanies(),
        apiService.getLetters(),
        apiService.getAnnouncements(),
        apiService.getFacilities(),
        apiService.getFacilityBookings(),
        apiService.getProfile(),
        apiService.getBuildings()
      ]);

      const [tenantsRes, unitsRes, contractsRes, duesRes, maintRes, complaintsRes, staffRes, expensesRes, elecRes, waterRes, paymentsRes, companiesRes, lettersRes, announcementsRes, facilitiesRes, facilityBookingsRes, profileRes, buildingsRes] = all;

      if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value);
      if (unitsRes.status === 'fulfilled') setUnits(unitsRes.value);
      if (contractsRes.status === 'fulfilled') setContracts(contractsRes.value);
      if (duesRes.status === 'fulfilled') setDues(duesRes.value);
      if (maintRes.status === 'fulfilled') setMaintenanceRequests(maintRes.value);
      if (complaintsRes.status === 'fulfilled') setComplaints(complaintsRes.value);
      if (staffRes.status === 'fulfilled') setStaffMembers(staffRes.value);
      if (expensesRes.status === 'fulfilled') setExpenses(expensesRes.value);
      if (elecRes.status === 'fulfilled') setElectricityMeters(elecRes.value);
      if (waterRes.status === 'fulfilled') setWaterMeters(waterRes.value);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value);
      if (companiesRes.status === 'fulfilled') setCompanies(companiesRes.value);
      if (lettersRes.status === 'fulfilled') setLetters(lettersRes.value);
      if (announcementsRes.status === 'fulfilled') setAnnouncements(announcementsRes.value);
      if (facilitiesRes.status === 'fulfilled') setFacilities(facilitiesRes.value);
      if (facilityBookingsRes.status === 'fulfilled') setFacilityBookings(facilityBookingsRes.value);
      if (buildingsRes.status === 'fulfilled') setBuildings(buildingsRes.value.map((b:any)=>({id:b.id,compoundId:'1',compoundName:'Azhar Residence',buildingNo:b.buildingNumber||'',remarks:b.notes||'',forFamilies:true})));
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setServerProfile(profileRes.value);
        const profileImageUrl = profileRes.value.profileImageUrl;
        if (profileImageUrl) {
          setCurrentUser(prev => prev ? { ...prev, profileImageUrl } : prev);
        }
      }

      // Derive buildings from real units
      if (buildingsRes.status !== 'fulfilled' || buildingsRes.value.length === 0) {
      if (unitsRes.status === 'fulfilled' && unitsRes.value.length > 0) {
        const seen = new Set<string>();
        const derived: Building[] = unitsRes.value
          .filter(u => u.buildingNumber && !seen.has(u.buildingNumber) && seen.add(u.buildingNumber))
          .map((u, i) => ({
            id: `bld-${i}`,
            compoundId: '1',
            compoundName: 'Azhar Residence',
            buildingNo: u.buildingNumber,
            remarks: '',
            forFamilies: true
          }));
        setBuildings(derived);
      }
      }
    }

    loadBackendData();
  }, [currentUser?.id, currentUser?.role, dataVersion]);

  // Validate stored session against the server; expired sessions force a real login.
  useEffect(() => {
    const storedUser = localStorage.getItem('azhar_residence_user');
    if (!storedUser) return;
    let cancelled = false;
    (async () => {
      const token = await ensureAuth();
      if (cancelled) return;
      if (!token) {
        setCurrentUser(null);
        localStorage.removeItem('azhar_residence_user');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = (user: User) => {
    const normalized = user.role === 'Admin' ? { ...user, name: 'Admin', email: 'admin@azhar.com' } : user;
    setCurrentUser(normalized);
    localStorage.setItem('azhar_residence_user', JSON.stringify(normalized));
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('azhar_residence_user', JSON.stringify(updatedUser));
    try {
      await apiService.updateProfile({
        displayName: updatedUser.name,
        email: updatedUser.email,
        profileImageUrl: updatedUser.profileImageUrl || updatedUser.avatar || ''
      });
    } catch (err) {
      console.error('Failed to update profile on server', err);
    }
  };

  const handleLogout = async () => {
    await apiService.logout();
    setCurrentUser(null);
    localStorage.removeItem('azhar_residence_user');
  };

  // Handlers
  const reloadFinanceData = async () => {
    const [contractsRes, duesRes, paymentsRes, tenantsRes] = await Promise.all([
      apiService.getContracts(), apiService.getDues(), apiService.getPayments(), apiService.getTenants()
    ]);
    setContracts(contractsRes); setDues(duesRes); setPayments(paymentsRes); setTenants(tenantsRes);
  };

  const handleRecordPayment = async (payload: { contractId: string; tenantId: string; tenantName: string; unitNumber: string; amount: number; paymentMethod: string; referenceNo?: string; notes?: string }) => {
    try {
      await apiService.addPayment({ ...payload, paymentDate: new Date().toISOString().slice(0,10), status: 'Paid' });
      await reloadFinanceData();
    } catch (err) { console.error('Failed to record payment', err); throw err; }
  };

  const handleAddMaintenanceRequest = async (req: Omit<MaintenanceRequest, 'id'>) => {
    try { const saved=currentUser?.role==='Tenant' ? await apiService.tenantCreateMaintenance(req) : await apiService.addMaintenanceRequest(req); setMaintenanceRequests(prev=>[saved,...prev]); } catch(err){ console.error('Failed to add maintenance request',err); }
  };
  const handleUpdateMaintenanceStatus = async (id:string,newStatus:MaintenanceStatus) => { try{if(currentUser?.role==='Staff') await apiService.staffUpdateMaintenanceStatus(id,newStatus); else await apiService.updateMaintenance(id,{status:newStatus});setMaintenanceRequests(prev=>prev.map(r=>r.id===id?{...r,status:newStatus}:r));}catch(err){console.error(err);} };
  const handleDeleteMaintenanceRequest = async (id:string) => { try{await apiService.deleteMaintenanceRequest(id);setMaintenanceRequests(prev=>prev.filter(r=>r.id!==id));}catch(err){console.error(err);} };
  const handleAssignStaffToMaintenance = async (requestId:string,staffId:string,staffName:string) => { try{await apiService.updateMaintenance(requestId,{assignedStaffId:staffId,assignedStaffName:staffName});setMaintenanceRequests(prev=>prev.map(r=>r.id===requestId?{...r,assignedStaffId:staffId,assignedStaffName:staffName}:r));}catch(err){console.error(err);} };
  const handleUpdateMaintenanceNotes = async (requestId:string,notes:string) => { try{if(currentUser?.role==='Staff') await apiService.staffUpdateMaintenanceNotes(requestId,notes); else await apiService.updateMaintenance(requestId,{notes});setMaintenanceRequests(prev=>prev.map(r=>r.id===requestId?{...r,notes}:r));}catch(err){console.error(err);} };

  const handleAddContract = async (contract: Omit<Contract, 'id'>) => { try{const saved=await apiService.addContract(contract);setContracts(prev=>[saved,...prev]);}catch(err){console.error('Failed to add contract',err);} };
  const handleUpdateContract = async (updated:Contract) => { try{const saved=await apiService.updateContract(updated.id,updated);setContracts(prev=>prev.map(c=>c.id===saved.id?saved:c));}catch(err){console.error('Failed to update contract',err);} };
  const handleToggleArchiveContract = async (id:string) => { const c=contracts.find(x=>x.id===id); if(!c)return; const nextStatus=c.status==='Archived'?'Active':'Archived'; try{const saved=await apiService.updateContract(id,{status:nextStatus});setContracts(prev=>prev.map(x=>x.id===id?saved:x));}catch(err){console.error(err);} };
  const handleDeleteContract = async (id:string) => { try{await apiService.deleteContract(id);setContracts(prev=>prev.filter(c=>c.id!==id));setDues(prev=>prev.filter((d:any)=>String((d as any).contractId || (d as any).id)!==String(id)));}catch(err){console.error('Failed to delete contract',err);throw err;} };

  const handleAddUnit = async (unit: Omit<Unit,'id'>) => { try{const created=await apiService.addUnit(unit);setUnits(prev=>[created,...prev]);}catch(err){console.error('Failed to add unit',err);} };
  const handleUpdateUnit = async (id:string,updates:Partial<Unit>) => { try{const saved=await apiService.updateUnit(id,updates);setUnits(prev=>prev.map(u=>u.id===id?saved:u));}catch(err){console.error(err);} };
  const handleDeleteUnit = async (id:string) => { try{await apiService.deleteUnit(id);setUnits(prev=>prev.filter(u=>u.id!==id));}catch(err){console.error(err);} };
  const handleAddBuilding = async (bld: Omit<Building,'id'>) => { try{const saved=await apiService.addBuilding(bld);setBuildings(prev=>[...prev,{...bld,id:saved.id,buildingNo:saved.buildingNumber||bld.buildingNo}]);}catch(err){console.error('Failed to add building',err);} };
  const handleUpdateBuilding = async (id:string,updates:Partial<Building>) => { try{const saved=await apiService.updateBuilding(id,{buildingNumber:updates.buildingNo,notes:updates.remarks});setBuildings(prev=>prev.map(b=>b.id===id?{...b,...updates,buildingNo:saved.buildingNumber||updates.buildingNo||b.buildingNo,remarks:saved.notes??updates.remarks??b.remarks}:b));}catch(err){console.error('Failed to update building',err);} };
  const handleDeleteBuilding = async (id:string) => { try{await apiService.deleteBuilding(id);setBuildings(prev=>prev.filter(b=>b.id!==id));}catch(err){console.error('Failed to archive building',err);} };

  const handleAddTenant = async (tenant:Omit<Tenant,'id'>) => { try{const created=await apiService.addTenant(tenant); setTenants(prev=>[created,...prev]);}catch(err){console.error('Failed to add tenant',err); throw err;} };
  const handleUpdateTenant = async (updatedTenant:Tenant) => { try{const updated=await apiService.updateTenant(updatedTenant.id,updatedTenant); setTenants(prev=>prev.map(t=>t.id===updated.id?updated:t));}catch(err){console.error(err); throw err;} };
  const handleToggleArchiveTenant = async (id:string) => { try{await apiService.toggleTenantArchive(id);setTenants(prev=>prev.map(t=>t.id===id?{...t,archived:!t.archived}:t));}catch(err){console.error(err);} };
  const handleDeleteTenant = async (id:string) => { try{await apiService.deleteTenant(id);setTenants(prev=>prev.filter(t=>t.id!==id));setPayments(prev=>prev.filter(x=>x.tenantId!==id));}catch(err){console.error(err);} };

  const handleAddWaterMeter = async (meter:Omit<WaterMeter,'id'>) => { try{const saved=await apiService.addWaterMeter(meter);setWaterMeters(prev=>[saved,...prev]);}catch(err){console.error(err);} };
  const handleAddElectricityMeter = async (meter:Omit<ElectricityMeter,'id'>) => { try{const saved=await apiService.addElectricityMeter(meter);setElectricityMeters(prev=>[saved,...prev]);}catch(err){console.error(err);} };
  const handleUpdateWaterMeter = async (id:string,updates:Partial<WaterMeter>)=>{try{const saved=await apiService.updateWaterMeter(id,updates);setWaterMeters(prev=>prev.map(m=>m.id===id?{...m,...saved}:m));}catch(err){console.error(err);}};
  const handleDeleteWaterMeter = async (id:string)=>{try{await apiService.deleteWaterMeter(id);setWaterMeters(prev=>prev.filter(m=>m.id!==id));}catch(err){console.error(err);}};
  const handleUpdateElectricityMeter = async (id:string,updates:Partial<ElectricityMeter>)=>{try{const saved=await apiService.updateElectricityMeter(id,updates);setElectricityMeters(prev=>prev.map(m=>m.id===id?{...m,...saved}:m));}catch(err){console.error(err);}};
  const handleDeleteElectricityMeter = async (id:string)=>{try{await apiService.deleteElectricityMeter(id);setElectricityMeters(prev=>prev.filter(m=>m.id!==id));}catch(err){console.error(err);}};

  const handleAddComplaint = async (complaint:Omit<Complaint,'id'>) => { try{const saved=currentUser?.role==='Tenant' ? await apiService.tenantCreateComplaint(complaint) : await apiService.addComplaint(complaint);setComplaints(prev=>[saved,...prev]);}catch(err){console.error(err);} };
  const handleUpdateComplaintStatus = async (id:string,status:ComplaintStatus,resolutionNotes?:string) => { try{await apiService.updateComplaintStatus(id,status,resolutionNotes);setComplaints(prev=>prev.map(c=>c.id===id?{...c,status,resolutionNotes:resolutionNotes||c.resolutionNotes}:c));}catch(err){console.error(err);} };
  const handleDeleteComplaint = async (id:string) => { try{await apiService.deleteComplaint(id);setComplaints(prev=>prev.filter(c=>c.id!==id));}catch(err){console.error(err);} };

  const handleAddStaff = async (staff:Omit<StaffMember,'id'>) => { try{const saved=await apiService.addStaff(staff); setStaffMembers(prev=>[saved,...prev]);}catch(err){console.error(err); throw err;} };
  const handleUpdateStaffStatus = async (id:string,status:StaffStatus) => { try{await apiService.updateStaffStatus(id,status);setStaffMembers(prev=>prev.map(x=>x.id===id?{...x,status}:x));}catch(err){console.error(err);} };
  const handleUpdateStaff = async (updated:StaffMember) => { try{const saved=await apiService.updateStaff(updated.id,updated); setStaffMembers(prev=>prev.map(x=>x.id===saved.id?saved:x));}catch(err){console.error(err); throw err;} };
  const handleDeleteStaff = async (id:string) => { try{await apiService.deleteStaff(id);setStaffMembers(prev=>prev.filter(x=>x.id!==id));}catch(err){console.error(err);} };
  const handleAddExpense = async (expense:Omit<Expense,'id'>) => { try{const saved=await apiService.addExpense(expense);setExpenses(prev=>[saved,...prev]);}catch(err){console.error(err);} };
  const handleAddCompany = async (data:Partial<Company>)=>{const saved=await apiService.addCompany(data);setCompanies(prev=>[saved,...prev]);};
  const handleUpdateCompany = async (id:string,data:Partial<Company>)=>{const saved=await apiService.updateCompany(id,data);setCompanies(prev=>prev.map(x=>x.id===id?{...x,...saved}:x));};
  const handleDeleteCompany = async (id:string)=>{await apiService.deleteCompany(id);setCompanies(prev=>prev.filter(x=>x.id!==id));};
  const handleAddAnnouncement = async (data:Partial<Announcement>)=>{const saved=await apiService.addAnnouncement(data);setAnnouncements(prev=>[saved,...prev]);};
  const handleUpdateAnnouncement = async (id:string,data:Partial<Announcement>)=>{const saved=await apiService.updateAnnouncement(id,data);setAnnouncements(prev=>prev.map(x=>x.id===id?{...x,...saved}:x));};
  const handleDeleteAnnouncement = async (id:string)=>{await apiService.deleteAnnouncement(id);setAnnouncements(prev=>prev.filter(x=>x.id!==id));};

  const handleUpdateExpense = async (expense:Expense)=>{try{const saved=await apiService.updateExpense(expense.id,expense);setExpenses(prev=>prev.map(e=>e.id===expense.id?{...expense,...saved}:e));}catch(err){console.error(err);}};
  const handleDeleteExpense = async (id:string)=>{try{await apiService.deleteExpense(id);setExpenses(prev=>prev.filter(e=>e.id!==id));}catch(err){console.error(err);}};

  const handleAddLetter = async (letter: Omit<Letter, 'id' | 'sentById' | 'sentByName' | 'sentAt'>) => {
    try {
      const created = await apiService.createLetter(letter);
      setLetters(prev => [created, ...prev.filter(l => l.title !== created.title)]);
    } catch (err) { console.error('Failed to create letter', err); }
  };

  const handleUpdateLetter = async (updated: Letter) => {
    try {
      const replaced = await apiService.updateLetter(updated.id, {
        title: updated.title,
        content: updated.content,
        recipientType: updated.recipientType,
        recipientName: updated.recipientName
      });
      setLetters(prev => prev.map(l => l.id === updated.id ? { ...replaced, sentByName: updated.sentByName || replaced.sentByName } : l));
    } catch (err) { console.error('Failed to update letter', err); }
  };

  const handleDeleteLetter = async (id: string) => {
    try {
      await apiService.deleteLetter(id);
    } catch (err) { console.error('Failed to delete letter', err); return; }
    setLetters(prev => prev.filter(l => l.id !== id));
  };

  const handleAddFacility = async (facility: Omit<Facility, 'id'>) => {
    try {
      const created = await apiService.createFacility(facility);
      setFacilities(prev => [created, ...prev.filter(f => f.name !== created.name)]);
    } catch (err) { console.error('Failed to create facility', err); }
  };

  const handleUpdateFacility = async (updated: Facility) => {
    try {
      const replaced = await apiService.updateFacility(updated.id, updated);
      setFacilities(prev => prev.map(f => f.id === updated.id ? replaced : f));
    } catch (err) { console.error('Failed to update facility', err); }
  };

  const handleDeleteFacility = async (id: string) => {
    try {
      await apiService.deleteFacility(id);
    } catch (err) { console.error('Failed to delete facility', err); return; }
    setFacilities(prev => prev.filter(f => f.id !== id));
  };

  const handleAddBooking = async (booking: Omit<FacilityBooking, 'id' | 'bookingNo' | 'createdAt'>) => {
    try {
      const created = await apiService.createFacilityBooking(booking);
      setFacilityBookings(prev => [created, ...prev.filter(b => b.bookingNo !== created.bookingNo)]);
    } catch (err) { console.error('Failed to create booking', err); }
  };

  const handleUpdateBookingStatus = async (id: string, status: FacilityBookingStatus, adminNotes?: string) => {
    const adminName = currentUser?.name || 'Admin';
    try {
      const replaced = await apiService.updateFacilityBooking(id, {
        status,
        adminNotes,
        approvedBy: status === 'Approved' ? adminName : undefined
      });
      setFacilityBookings(prev => prev.map(b => b.id === id ? replaced : b));
    } catch (err) { console.error('Failed to update booking', err); }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await apiService.deleteFacilityBooking(id);
    } catch (err) { console.error('Failed to delete booking', err); return; }
    setFacilityBookings(prev => prev.filter(b => b.id !== id));
  };

  const handleUpdateStaffPassword = async (_staffId: string, currentPass: string, newPass: string) => { try{await apiService.changeOwnPassword(currentPass,newPass);}catch(err){console.error('Failed to update staff password',err);} };

  const handleUpdateTenantPassword = async (_tenantId: string, currentPass: string, newPass: string) => { try{await apiService.changeOwnPassword(currentPass,newPass);}catch(err){console.error('Failed to update tenant password',err);} };

  const handleGlobalSearchResult = (type: string, _id: string) => {
    const tabMap: Record<string, ActiveTab> = {
      tenant: 'azhar_tenants',
      contract: 'azhar_contracts',
      unit: 'azhar_units',
      payment: 'azhar_collections',
      meter: 'azhar_electricity'
    };
    const nextTab = tabMap[type];
    if (nextTab) setActiveTab(nextTab);
  };

  // If unauthenticated, render Login Screen
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Render Staff Portal
  if (currentUser.role === 'Staff') {
    return (
      <StaffPortalView
        currentUser={currentUser}
        staffList={staffMembers}
        maintenanceRequests={maintenanceRequests}
        onUpdateMaintenanceStatus={handleUpdateMaintenanceStatus}
        onUpdateMaintenanceNotes={handleUpdateMaintenanceNotes}
        onUpdateStaffPassword={(staffId, currentPass, newPass) => handleUpdateStaffPassword(staffId, currentPass, newPass)}
        onLogout={handleLogout}
      />
    );
  }

  // Render Tenant Portal
  if (currentUser.role === 'Tenant') {
    return (
      <TenantPortalView
        currentUser={currentUser}
        tenants={tenants}
        contracts={contracts}
        maintenanceRequests={maintenanceRequests}
        complaints={complaints}
        onAddMaintenanceRequest={handleAddMaintenanceRequest}
        onAddComplaint={handleAddComplaint}
        onUpdateTenantPassword={(tenantId, currentPass, newPass) => handleUpdateTenantPassword(tenantId, currentPass, newPass)}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      {/* Top Navigation Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        selectedCompoundId={selectedCompoundId}
        onSelectCompound={setSelectedCompoundId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenProfileSettings={() => setShowProfileSettings(true)}
        onOpenAdminPermissions={() => setShowAdminPermissions(true)}
        onSearchResultSelect={handleGlobalSearchResult}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Content Region */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[96rem] mx-auto">
            {activeTab === 'dashboard_main' && (
              <DashboardMain
                units={units}
                contracts={contracts}
                dues={dues}
                payments={payments}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'dashboard_dues' && (
              <DashboardDuesStats
                dues={dues}
                contracts={contracts}
                payments={payments}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'dashboard_maintenance' && (
              <DashboardMaintenanceStats
                maintenanceRequests={maintenanceRequests}
                staffMembers={staffMembers}
                onNavigate={setActiveTab}
              />
            )}

            {/* Azhar Residence Tabs */}
            {activeTab === 'azhar_collections' && (
              <DashboardDues
                dues={dues}
                contracts={contracts}
                tenants={tenants}
                onRecordPayment={handleRecordPayment}
                onUpdateContract={handleUpdateContract}
                onDeleteContract={handleDeleteContract}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_contracts' && (
              <CompoundContracts
                contracts={contracts}
                tenants={tenants}
                units={units}
                onAddContract={handleAddContract}
                onUpdateContract={handleUpdateContract}
                onToggleArchive={handleToggleArchiveContract}
                onDeleteContract={handleDeleteContract}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_archived_contracts' && (
              <CompoundContracts
                contracts={contracts}
                tenants={tenants}
                units={units}
                showArchivedOnly
                onAddContract={handleAddContract}
                onUpdateContract={handleUpdateContract}
                onToggleArchive={handleToggleArchiveContract}
                onDeleteContract={handleDeleteContract}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_non_rented' && (
              <CompoundUnits
                units={units}
                contracts={contracts}
                buildings={buildings}
                mode="non_rented"
                onAddUnit={handleAddUnit}
                onAddBuilding={handleAddBuilding}
                onUpdateBuilding={handleUpdateBuilding}
                onDeleteBuilding={handleDeleteBuilding}
                onUpdateUnit={handleUpdateUnit}
                onDeleteUnit={handleDeleteUnit}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_electricity' && (
              <MetersView
                type="electricity"
                units={units}
                waterMeters={waterMeters}
                electricityMeters={electricityMeters}
                onAddWaterMeter={handleAddWaterMeter}
                onAddElectricityMeter={handleAddElectricityMeter}
                onUpdateWaterMeter={handleUpdateWaterMeter}
                onDeleteWaterMeter={handleDeleteWaterMeter}
                onUpdateElectricityMeter={handleUpdateElectricityMeter}
                onDeleteElectricityMeter={handleDeleteElectricityMeter}
              />
            )}

            {activeTab === 'azhar_tenants' && (
              <TenantsList
                tenants={tenants}
                contracts={contracts}
                onAddTenant={handleAddTenant}
                onUpdateTenant={handleUpdateTenant}
                onToggleArchiveTenant={handleToggleArchiveTenant}
                onDeleteTenant={handleDeleteTenant}
              />
            )}

            {activeTab === 'azhar_buildings' && (
              <CompoundUnits
                units={units}
                contracts={contracts}
                buildings={buildings}
                mode="buildings"
                onAddUnit={handleAddUnit}
                onAddBuilding={handleAddBuilding}
                onUpdateBuilding={handleUpdateBuilding}
                onDeleteBuilding={handleDeleteBuilding}
                onUpdateUnit={handleUpdateUnit}
                onDeleteUnit={handleDeleteUnit}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_units' && (
              <CompoundUnits
                units={units}
                contracts={contracts}
                buildings={buildings}
                mode="units"
                onAddUnit={handleAddUnit}
                onAddBuilding={handleAddBuilding}
                onUpdateBuilding={handleUpdateBuilding}
                onDeleteBuilding={handleDeleteBuilding}
                onUpdateUnit={handleUpdateUnit}
                onDeleteUnit={handleDeleteUnit}
                selectedCompoundId="1"
              />
            )}

            {activeTab === 'azhar_maintenance' && (
              <DashboardMaintenance
                maintenanceRequests={maintenanceRequests}
                onAddRequest={handleAddMaintenanceRequest}
                onUpdateStatus={handleUpdateMaintenanceStatus}
                onDeleteRequest={handleDeleteMaintenanceRequest}
                onAssignStaff={handleAssignStaffToMaintenance}
                onUpdateNotes={handleUpdateMaintenanceNotes}
                selectedCompoundId="1"
                staffMembers={staffMembers}
              />
            )}

            {activeTab === 'azhar_complaints' && (
              <ComplaintsView
                complaints={complaints}
                onAddComplaint={handleAddComplaint}
                onUpdateStatus={handleUpdateComplaintStatus}
                onDeleteComplaint={handleDeleteComplaint}
              />
            )}

            {activeTab === 'azhar_staff' && (
              <StaffView
                staffMembers={staffMembers}
                maintenanceRequests={maintenanceRequests}
                onAddStaff={handleAddStaff}
                onUpdateStaffStatus={handleUpdateStaffStatus}
                onUpdateStaff={handleUpdateStaff}
                onDeleteStaff={handleDeleteStaff}
              />
            )}

            {activeTab === 'azhar_expenses' && (
              <ExpensesView
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'azhar_letters' && (
              <LettersView
                letters={letters}
                tenants={tenants}
                staffMembers={staffMembers}
                onAddLetter={handleAddLetter}
                onUpdateLetter={handleUpdateLetter}
                onDeleteLetter={handleDeleteLetter}
              />
            )}

            {activeTab === 'azhar_facilities' && (
              <FacilitiesView
                facilities={facilities}
                bookings={facilityBookings}
                onAddFacility={handleAddFacility}
                onUpdateFacility={handleUpdateFacility}
                onDeleteFacility={handleDeleteFacility}
              />
            )}

            {activeTab === 'azhar_facility_bookings' && (
              <FacilityBookingsView
                facilities={facilities}
                bookings={facilityBookings}
                tenants={tenants}
                onAddBooking={handleAddBooking}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onDeleteBooking={handleDeleteBooking}
              />
            )}

            {/* Water & Electricity Meters */}
            {activeTab === 'water_meters' && (
              <MetersView
                type="water"
                units={units}
                waterMeters={waterMeters}
                electricityMeters={electricityMeters}
                onAddWaterMeter={handleAddWaterMeter}
                onAddElectricityMeter={handleAddElectricityMeter}
                onUpdateWaterMeter={handleUpdateWaterMeter}
                onDeleteWaterMeter={handleDeleteWaterMeter}
                onUpdateElectricityMeter={handleUpdateElectricityMeter}
                onDeleteElectricityMeter={handleDeleteElectricityMeter}
              />
            )}

            {activeTab === 'electricity_meters' && (
              <MetersView
                type="electricity"
                units={units}
                waterMeters={waterMeters}
                electricityMeters={electricityMeters}
                onAddWaterMeter={handleAddWaterMeter}
                onAddElectricityMeter={handleAddElectricityMeter}
                onUpdateWaterMeter={handleUpdateWaterMeter}
                onDeleteWaterMeter={handleDeleteWaterMeter}
                onUpdateElectricityMeter={handleUpdateElectricityMeter}
                onDeleteElectricityMeter={handleDeleteElectricityMeter}
              />
            )}

            {/* All Tenants */}
            {activeTab === 'all_tenants' && (
              <TenantsList
                tenants={tenants}
                contracts={contracts}
                onAddTenant={handleAddTenant}
                onUpdateTenant={handleUpdateTenant}
                onToggleArchiveTenant={handleToggleArchiveTenant}
                onDeleteTenant={handleDeleteTenant}
              />
            )}

            {activeTab === 'archived_tenants' && (
              <TenantsList
                tenants={tenants}
                contracts={contracts}
                showArchivedOnly
                onAddTenant={handleAddTenant}
                onUpdateTenant={handleUpdateTenant}
                onToggleArchiveTenant={handleToggleArchiveTenant}
                onDeleteTenant={handleDeleteTenant}
              />
            )}

            {/* Patch Notes */}
            {activeTab === 'azhar_companies' && <AdminContentView mode="companies" companies={companies} announcements={announcements} onAddCompany={handleAddCompany} onUpdateCompany={handleUpdateCompany} onDeleteCompany={handleDeleteCompany} onAddAnnouncement={handleAddAnnouncement} onUpdateAnnouncement={handleUpdateAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} />}
            {activeTab === 'azhar_announcements' && <AdminContentView mode="announcements" companies={companies} announcements={announcements} onAddCompany={handleAddCompany} onUpdateCompany={handleUpdateCompany} onDeleteCompany={handleDeleteCompany} onAddAnnouncement={handleAddAnnouncement} onUpdateAnnouncement={handleUpdateAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} />}

            {activeTab === 'patch_notes' && (
              <PatchNotesView />
            )}
          </div>
        </main>
      </div>

      {/* Profile Settings Modal */}
      {showProfileSettings && currentUser && (
        <ProfileSettingsModal
          user={currentUser}
          onClose={() => setShowProfileSettings(false)}
          onSave={handleUpdateUser}
        />
      )}

      {/* Admin Permissions Modal */}
      {showAdminPermissions && (
        <AdminPermissionsModal onClose={() => setShowAdminPermissions(false)} />
      )}
    </div>
  );
}
