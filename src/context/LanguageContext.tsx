import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Header & Navigation
    system_title: 'نظام إدارة مجمع أزهار الموحد',
    search_placeholder: 'بحث عن عقد، مستأجر، رقم وحدة (203، 118)، أو هاتف...',
    active_residence: 'مجمع أزهار السكني',
    profile_settings: 'إعدادات الحساب',
    admin_permissions: 'صلاحيات المدير',
    sign_out: 'تسجيل الخروج',

    // Sidebar Groups
    group_dashboards: 'لوحات التحكم',
    overview: 'نظرة عامة',
    dues_and_rents: 'المستحقات والإيجارات',
    maintenance_dashboard: 'لوحة الصيانة',

    group_azhar_residence: 'مجمع أزهار السكني',
    collections: 'سجل المحصلات والمستحقات',
    contracts: 'العقود والتحرير',
    archived_contracts: 'العقود المؤرشفة',
    vacant_units: 'الوحدات المتاحة',
    electricity_meters: 'عدادات الكهرباء',
    tenants: 'دليل المستأجرين',
    buildings_management: 'إدارة المباني',
    units_management: 'إدارة الوحدات',
    maintenance_requests: 'طلبات الصيانة',
    complaints: 'الشكاوى والبلاغات',
    staff: 'فريق العمل والاستاف',
    expenses: 'المصروفات وسندات الصرف',
    letters: 'الخطابات والمراسلات',
    facilities: 'المرافق',
    facility_bookings: 'حجوزات المرافق',
    group_facilities: 'المرافق والحجوزات',

    group_utilities: 'الخدمات والمرافق',
    water_meters: 'عدادات المياه',
    all_electricity_meters: 'عدادات الكهرباء الشاملة',

    group_tenants_directory: 'سجل المستأجرين',
    all_tenants: 'جميع المستأجرين',
    archived_tenants: 'المستأجرين المؤرشفين',

    system_info: 'معلومات النظام والنسخة',

    // Common Buttons & Actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    archive: 'أرشفة',
    unarchive: 'إلغاء الأرشفة',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث',
    filter: 'تصفية',
    export_csv: 'تصدير CSV',
    download_pdf: 'تنزيل تقرير PDF',
    print: 'طباعة',
    details: 'التفاصيل',
    active: 'ساري',
    archived: 'مؤرشف',
    vacant: 'متاحة',
    occupied: 'مؤجرة',
    paid: 'مدفوع',
    overdue: 'متأخر',
    pending: 'قيد الانتظار',

    // Tenants View
    tenants_directory: 'سجل المستأجرين',
    archived_tenants_register: 'سجل المستأجرين المؤرشفين',
    tenants_desc: 'سجلات المستأجرين المسجلة، حالات العقود السارية، واختصارات التواصل الفوري عبر الواتساب.',
    register_new_tenant: 'تسجيل مستأجر جديد',
    tenant_name: 'اسم المستأجر',
    arabic_name: 'الاسم بالعربية',
    email: 'البريد الإلكتروني',
    mobile: 'رقم الجوال',
    emergency_phone: 'هاتف الطوارئ',
    whatsapp: 'رقم الواتساب',
    nationality: 'الجنسية',
    family_count: 'عدد أفراد الأسرة',
    company: 'الشركة',
    tenant_company_name: 'اسم شركة المستأجر',
    work_notes: 'ملاحظات العمل',
    tenant_remarks: 'ملاحظات المستأجر',
    is_married: 'المستأجر متزوج',
    contract_status: 'حالة العقد',
    operations: 'العمليات',
    has_contract: 'عقد ساري',
    no_contract: 'بدون عقد',

    // Contracts View
    contracts_registry: 'العقود والتحرير',
    archived_contracts_registry: 'العقود المؤرشفة',
    contracts_desc: 'إدارة وتوثيق جميع عقود إيجار كمبوند أزهار مع متابعة التحصيل والتنبيهات.',
    draft_new_contract: 'تحرير عقد جديد',
    contract_number: 'رقم العقد',
    unit_number: 'رقم الوحدة',
    building_number: 'رقم المبنى',
    unit_type: 'نوع الوحدة',
    lease_start_date: 'تاريخ بدء العقد',
    lease_end_date: 'تاريخ نهاية العقد',
    lease_duration: 'مدة العقد (ببالأشهر)',
    annual_rent: 'الإيجار السنوي',
    paid_amount: 'المبلغ المدفوع',
    remaining_amount: 'المبلغ المتبقي',
    payment_method: 'طريقة الدفع',
    verified_in_ejar: 'موثق في إيجار',
    yes: 'نعم',
    no: 'لا',

    // Login Screen
    welcome_back: 'مرحباً بك في نظام كمبوند أزهار',
    login_subtitle: 'الرجاء إدخال بيانات الدخول لإدارة العقارات والمستأجرين',
    login_button: 'تسجيل الدخول',
    admin_login: 'دخول المدير (Admin)',
    supervisor_login: 'دخول المشرف (Supervisor)',

    // Switch Language Button
    switch_language: 'English',
    language_label: 'اللغة / Language'
  },
  en: {
    // Header & Navigation
    system_title: 'Azhar Residence Unified Management System',
    search_placeholder: 'Search contract, tenant, unit number (203, 118), or phone...',
    active_residence: 'AZHAR RESIDENCE',
    profile_settings: 'Profile Settings',
    admin_permissions: 'Admin Permissions',
    sign_out: 'Sign Out',

    // Sidebar Groups
    group_dashboards: 'Dashboards',
    overview: 'Overview',
    dues_and_rents: 'Dues & Rents',
    maintenance_dashboard: 'Maintenance Dashboard',

    group_azhar_residence: 'Azhar Residence Compound',
    collections: 'Collections',
    contracts: 'Contracts & Drafting',
    archived_contracts: 'Archived Contracts',
    vacant_units: 'Vacant Units',
    electricity_meters: 'Electricity Meters',
    tenants: 'Tenants Directory',
    buildings_management: 'Buildings Management',
    units_management: 'Units Management',
    maintenance_requests: 'Maintenance Requests',
    complaints: 'Complaints & Issues',
    staff: 'Staff & Team',
    expenses: 'Expenses & Vouchers',
    letters: 'Letters & Correspondence',
    facilities: 'Facilities',
    facility_bookings: 'Facility Bookings',
    group_facilities: 'Facilities & Bookings',

    group_utilities: 'Utilities & Services',
    water_meters: 'Water Meters',
    all_electricity_meters: 'All Electricity Meters',

    group_tenants_directory: 'Tenants Register',
    all_tenants: 'All Tenants',
    archived_tenants: 'Archived Tenants',

    system_info: 'System Info & Version',

    // Common Buttons & Actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    archive: 'Archive',
    unarchive: 'Unarchive',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    export_csv: 'Export CSV',
    download_pdf: 'Download PDF Report',
    print: 'Print',
    details: 'Details',
    active: 'Active',
    archived: 'Archived',
    vacant: 'Vacant',
    occupied: 'Occupied',
    paid: 'Paid',
    overdue: 'Overdue',
    pending: 'Pending',

    // Tenants View
    tenants_directory: 'Tenants Directory',
    archived_tenants_register: 'Archived Tenants Register',
    tenants_desc: 'Registered tenant records, active contract statuses, and instant WhatsApp communication shortcuts.',
    register_new_tenant: 'Register New Tenant',
    tenant_name: 'Tenant Name',
    arabic_name: 'Arabic Name',
    email: 'Email',
    mobile: 'Mobile Number',
    emergency_phone: 'Emergency Phone',
    whatsapp: 'WhatsApp Number',
    nationality: 'Nationality',
    family_count: 'Family Count',
    company: 'Company',
    tenant_company_name: 'Tenant Company Name',
    work_notes: 'Work Notes',
    tenant_remarks: 'Tenant Remarks',
    is_married: 'Tenant is Married',
    contract_status: 'Contract Status',
    operations: 'Operations',
    has_contract: 'Active Contract',
    no_contract: 'No Contract',

    // Contracts View
    contracts_registry: 'Contracts Directory',
    archived_contracts_registry: 'Archived Contracts',
    contracts_desc: 'Manage and document all Azhar Residence lease contracts with collection tracking and alerts.',
    draft_new_contract: 'Draft New Contract',
    contract_number: 'Contract No.',
    unit_number: 'Unit No.',
    building_number: 'Building No.',
    unit_type: 'Unit Type',
    lease_start_date: 'Lease Start Date',
    lease_end_date: 'Lease End Date',
    lease_duration: 'Lease Duration (Months)',
    annual_rent: 'Annual Rent',
    paid_amount: 'Paid Amount',
    remaining_amount: 'Remaining Amount',
    payment_method: 'Payment Method',
    verified_in_ejar: 'Ejar Verified',
    yes: 'Yes',
    no: 'No',

    // Login Screen
    welcome_back: 'Welcome to Azhar Residence Management',
    login_subtitle: 'Please log in to manage real estate units, contracts, and tenants',
    login_button: 'Sign In',
    admin_login: 'Admin Sign In',
    supervisor_login: 'Supervisor Sign In',

    // Switch Language Button
    switch_language: 'العربية',
    language_label: 'Language / اللغة'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('azhar_residence_lang') as Language;
    return saved === 'en' ? 'en' : 'ar';
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('azhar_residence_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language][key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, toggleLanguage, t }}>
      <div dir={direction} className={direction === 'rtl' ? 'font-arabic' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
