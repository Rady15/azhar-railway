export interface User {
  id?: string;
  username: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff' | 'Tenant' | string;
  avatar?: string;
  profileImageUrl?: string;
  staffId?: string;
  tenantId?: string;
  unitNumber?: string;
  buildingNumber?: string;
}

export interface Compound {
  id: string;
  name: string;
  code: string;
  totalBuildings: number;
  totalUnits: number;
}

export interface Building {
  id: string;
  compoundId: string;
  compoundName: string;
  buildingNo: string;
  remarks: string;
  forFamilies: boolean;
}

export interface Unit {
  id: string;
  compoundId: string;
  compoundName: string;
  buildingNumber: string; // legacy compatibility; not displayed in the unit master data
  unitNumber: string;
  rooms: number;
  baths: number;
  living: number; // legacy compatibility
  majlis: number; // legacy compatibility
  area: string; // legacy compatibility
  type: string; // Villa Duplex, Apartment, Warehouse
  electricityMeterNumber?: string;
  isFurnished?: boolean;
  notes?: string;
  status: 'Occupied' | 'Vacant' | 'Maintenance' | 'Blocked';
  annualRent: number;
  currentTenantId?: string;
  currentTenantName?: string;
  owner?: string;
  districtCityCountry?: string;
}

export interface Tenant {
  id: string;
  name: string; // FullName in English
  fullNameArabic?: string;
  email: string;
  username?: string;
  mobile: string; // PhoneNumber
  emergencyPhone?: string; // Emergency Phone
  whatsapp: string;
  password?: string;
  nationality?: string;
  familyCount?: string | number;
  workNotes?: string;
  isMarried?: boolean;
  companyName?: string;
  tenantRemarks?: string;
  company?: string; // Company / Sponsor
  idLetter?: string;
  hasContract: boolean;
  compoundId?: string;
  compoundName?: string;
  unitNumber?: string;
  houseId?: string;
  houseNumber?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  monthlyRent?: number;
  annualRent?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: string;
  paymentDueDay?: string;
  electricityMeter?: string;
  waterCost?: string;
  isActive?: boolean;
  archived?: boolean;
  identityDocumentUrl?: string;
  identityDocumentName?: string;
  manualContractDocumentUrl?: string;
  manualContractDocumentName?: string;
}

export interface PaymentInstallment {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidDate?: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  receiptNo?: string;
  user?: string;
  comments?: string;
  paymentMethod?: string;
}

export interface ContractNote {
  id: string;
  date: string;
  author: string;
  text: string;
}

export interface Contract {
  id: string;
  contractNo: string;
  compoundId: string;
  compoundName: string;
  buildingNumber: string;
  unitNumber: string;
  unitType: 'Appartment' | 'Villa Duplex' | 'Villa' | 'Warehouse' | string;
  unitArea?: string;
  districtCityCountry?: string;
  owner?: string;
  tenantId: string;
  tenantName: string;
  tenantMobile: string;
  emergencyPhone?: string;
  tenantNationality?: string;
  companyPhone?: string;
  workNotes?: string;
  tenantIdOrIqama?: string;
  sponsorPhone?: string;
  contractOf?: string;
  leaseStartDate: string;
  leaseDurationMonths: number;
  leaseEndDate: string;
  annualRent: number;
  waterYearlyBill?: number;
  totalYearlyRent?: number; // Gross annual rent = unit rent + water
  netYearlyRent?: number; // Net amount due after discount
  discount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentFrequency: 'Every-4-Months' | 'Annual' | 'Semi-Annual' | 'Quarterly' | string;
  paymentMethod?: string;
  paymentNumber?: string;
  verifiedInEjar?: boolean;
  reason?: string;
  electricityMeterNumber?: string;
  meterStartReading?: string;
  transferAccountToTenant?: boolean;
  insurance?: number;
  commission?: number;
  unitIncluded?: string;
  contractImage?: string;
  contractDocumentUrl?: string;
  contractDocumentName?: string;
  englishNotes?: string;
  arabicNotes?: string;
  status: 'Active' | 'Archived' | 'Blocked' | 'Pending';
  notes?: ContractNote[];
  installments?: PaymentInstallment[];
  /** Calculated from the contract installment schedule. */
  nextPaymentDate?: string;
  /** Calendar days from today until the next unpaid installment; negative means overdue. */
  nextPaymentDays?: number;
}

export interface DueItem {
  id: string;
  contractId?: string;
  tenantId?: string;
  overdueAmount?: number;
  compoundId: string;
  compoundName: string;
  unitNumber: string;
  tenantName: string;
  mobile: string;
  annualRent: number;
  remainingRents: number;
  rentValue: number;
  rentalDueDate: string;
  contractExpiryDate: string;
  status: 'Paid' | 'Due Soon' | 'Overdue';
}

export type MaintenanceStatus = 
  | 'New'
  | 'Awaiting Supervisor Approval'
  | 'Awaiting Manager Approval'
  | 'Rejected Supervisor'
  | 'Rejected Manager'
  | 'In Progress'
  | 'Done';

export interface MaintenanceRequest {
  id: string;
  rvNo: string;
  compoundId: string;
  compoundName: string;
  buildingNumber: string;
  unitNumber: string;
  responsibleName: string;
  startDate: string;
  targetEndDate: string;
  workActivity: string;
  totalAmount: number;
  status: MaintenanceStatus;
  daysToEnd: number;
  assignedStaffId?: string;
  assignedStaffName?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface WaterMeter {
  id: string;
  unitId?: string;
  building: string;
  unitNumber: string;
  meterNumber: string;
  lastReading?: number;
  readingDate?: string;
}

export interface ElectricityMeter {
  id: string;
  compoundId?: string;
  unitId?: string;
  building: string;
  unitNumber: string;
  type?: string;
  isRented?: boolean;
  meterNumber: string;
  paymentNumber: string;
}

export type ComplaintPriority = 'High' | 'Medium' | 'Low';
export type ComplaintStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed';

export interface Complaint {
  id: string;
  ticketNo: string;
  complainantName: string;
  buildingNumber: string;
  unitNumber: string;
  phone: string;
  category: string;
  priority: ComplaintPriority;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  resolutionNotes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export type StaffStatus = 'Active' | 'On Leave' | 'Suspended';

export interface StaffMember {
  id: string;
  empCode: string;
  username?: string;
  name: string;
  role: string;
  mobile: string;
  email?: string;
  whatsapp: string;
  nationalId: string;
  status: StaffStatus;
  joiningDate: string;
  salary: number;
  password?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  voucherNo: string;
  category: string;
  title: string;
  amount: number;
  recipient: string;
  paymentMethod: string;
  expenseDate: string;
  compoundId?: string;
  notes?: string;
}

export type FacilityCategory = 'Pool' | 'Shuttle' | 'Gym' | 'SecurityPass' | 'BBQ' | 'Hall' | 'WeddingHall' | 'Playground' | 'Restaurant';

export interface Facility {
  id: string;
  name: string;
  nameEn: string;
  category: FacilityCategory;
  iconName: string;
  description: string;
  location: string;
  operatingHours: string;
  capacityLimit?: number;
  isAvailable: boolean;
  image: string;
  imageMediaId?: string;
}

export type FacilityBookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';

export interface FacilityBooking {
  id: string;
  bookingNo: string;
  facilityId: string;
  facilityName?: string;
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  mobile?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestsCount: number;
  purpose: string;
  status: FacilityBookingStatus;
  createdAt: string;
  adminNotes?: string;
  approvedBy?: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  amount: number;
  month?: number;
  year?: number;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  contractId?: string;
  receiptNo?: string;
  referenceNo?: string;
  unappliedAmount?: number;
  allocations?: Array<{ installmentId: string; installmentNo?: number; dueDate?: string; amount: number }>;
}


export interface Company {
  id: string;
  companyName: string;
  contactPerson: string;
  specialization: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface Letter {
  id: string;
  title: string;
  content: string;
  recipientType: string;
  recipientId?: string | null;
  recipientName?: string;
  sentById?: string;
  sentByName?: string;
  sentAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  announcementDate?: string;
  createdAt?: string;
  isActive: boolean;
  imageUrls?: string[];
}

export interface RentReport {
  tenantId: string;
  tenantName: string;
  nextDueDate: string;
  unitNumber: string;
  rentAmount: number;
  rentFrequency: string;
  contractEndDate: string;
  remainingDays: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}



