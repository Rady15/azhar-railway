import React, { useState } from 'react';
import { X, Check, Calendar, User, FileText, Phone, Mail, Globe, Image as ImageIcon } from 'lucide-react';
import { Tenant } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface EditTenantModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTenant: Tenant) => void;
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave
}) => {
  const { language, t } = useLanguage();

  const [formData, setFormData] = useState<Partial<Tenant>>(() => ({
    name: tenant?.name || '',
    fullNameArabic: tenant?.fullNameArabic || '',
    mobile: tenant?.mobile || '',
    emergencyPhone: tenant?.emergencyPhone || '',
    nationality: tenant?.nationality || '',
    idLetter: tenant?.idLetter || '',
    company: tenant?.company || '',
    tenantRemarks: tenant?.tenantRemarks || '',
    familyCount: tenant?.familyCount || 1,
    email: tenant?.email || '',
    workNotes: tenant?.workNotes || '',
    isMarried: tenant?.isMarried ?? true,
    whatsapp: tenant?.whatsapp || '',
    password: '',
    companyName: tenant?.companyName || ''
  }));

  if (!isOpen) return null;

  const handleChange = (field: keyof Tenant, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tenant) {
      onSave({
        ...tenant,
        ...formData
      } as Tenant);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-300 my-auto">
        {/* Top Header Banner matching Image 1 */}
        <div className="bg-[#2b62af] px-6 py-3.5 flex items-center justify-between text-white relative">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-300" />
            <h2 className="text-base font-bold tracking-wide">
              {language === 'ar' ? 'تعديل بيانات المستأجر' : 'Edit Tenant'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Gold Status Circle from screenshot */}
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-amber-300 shadow-sm" title="Status Indicator" />
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 bg-[#f8fafc] text-xs text-slate-800 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Tenant Name * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'اسم المستأجر *' : 'Tenant Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-medium"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Tenant Name In Arabic */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'اسم المستأجر بالعربية' : 'Tenant Name In Arabic'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.fullNameArabic || ''}
                    onChange={(e) => handleChange('fullNameArabic', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-medium text-right"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Tenant Mobile * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'جوال المستأجر *' : 'Tenant Mobile *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.mobile || ''}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-mono"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Emergency Phone * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'هاتف الطوارئ *' : 'Emergency Phone *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.emergencyPhone || ''}
                    onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-mono"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Password for Portal */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'كلمة المرور للدخول لبوابة المستأجر' : 'Tenant Portal Password'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder={language === 'ar' ? 'اتركها فارغة للإبقاء على كلمة المرور الحالية' : 'Leave blank to keep current password'}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-mono font-bold"
                  />
                  <Check className="w-4 h-4 text-amber-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Nationality * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'الجنسية *' : 'Nationality *'}
                </label>
                <div className="relative">
                  <select
                    value={formData.nationality || ''}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b62af] text-slate-900 appearance-none font-medium"
                  >
                    <option value="">{language === 'ar' ? 'اختر الجنسية' : 'Select nationality'}</option>
                    <option value="Sudan">Sudan</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="Jordanian">Jordanian</option>
                    <option value="Syrian">Syrian</option>
                    <option value="Lebanese">Lebanese</option>
                    <option value="Egyptian">Egyptian</option>
                    <option value="Italian">Italian</option>
                    <option value="Greek">Greek</option>
                    <option value="British">British</option>
                  </select>
                  <X className="w-4 h-4 text-rose-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Iqama No */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'رقم الإقامة / الهوية' : 'Iqama No'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.idLetter || '2364941266'}
                    onChange={(e) => handleChange('idLetter', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-mono"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Tents Company Name* */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'اسم شركة الخيام *' : 'Tents Company Name*'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.companyName || '.'}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Company * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'الشركة *' : 'Company *'}
                </label>
                <div className="relative">
                  <select
                    value={formData.company || 'AZ'}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b62af] text-slate-900 appearance-none font-medium"
                  >
                    <option value="AZ">AZ</option>
                    <option value="Other">Other</option>
                  </select>
                  <X className="w-4 h-4 text-rose-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Tenant Remarks */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'ملاحظات المستأجر' : 'Tenant Remarks'}
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={formData.tenantRemarks || ''}
                    onChange={(e) => handleChange('tenantRemarks', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Tenant Family Count * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'عدد أفراد الأسرة *' : 'Tenant Family Count *'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={formData.familyCount || 4}
                    onChange={(e) => handleChange('familyCount', Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-bold"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Tenant Email * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'البريد الإلكتروني *' : 'Tenant Email *'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-mono"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Current Iqama Picture */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'صورة الإقامة الحالية' : 'Current Iqama Picture'}
                </label>
                <span className="inline-block px-3 py-1 bg-slate-200 text-slate-600 rounded text-xs font-semibold">
                  No Picture
                </span>
              </div>

              {/* Iqama Picture File Chooser */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'رفع صورة الإقامة' : 'Iqama Picture'}
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-medium cursor-pointer transition-colors text-slate-700">
                    Choose file
                    <input type="file" className="hidden" accept="image/*" />
                  </label>
                  <span className="text-slate-500 text-xs">No file chosen</span>
                </div>
              </div>

              {/* Iqama Expiration Date * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'تاريخ انتهاء الإقامة *' : 'Iqama Expiration Date *'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    defaultValue="28/05/2024"
                    className="w-full pl-3 pr-14 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 font-mono"
                  />
                  <div className="absolute right-2 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-teal-500" />
                    <button type="button" className="p-1 bg-slate-100 rounded border border-slate-200 text-slate-600">
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ID Letter */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'خطاب التعريف / ID' : 'ID Letter'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.idLetter || '.'}
                    onChange={(e) => handleChange('idLetter', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Work Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'ملاحظات العمل' : 'Work Notes'}
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={formData.workNotes || ''}
                    onChange={(e) => handleChange('workNotes', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  />
                  <Check className="w-4 h-4 text-teal-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Tenant is Married Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-slate-700 font-semibold text-xs">
                  {language === 'ar' ? 'المستأجر متزوج' : 'Tenant is Married'}
                </span>
                <button
                  type="button"
                  onClick={() => handleChange('isMarried', !formData.isMarried)}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                    formData.isMarried ? 'bg-[#0075ff] text-white' : 'bg-slate-200 text-transparent border border-slate-300'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Tenant Whatsapp * */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-start">
                  {language === 'ar' ? 'واتساب المستأجر *' : 'Tenant Whatsapp *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.whatsapp || ''}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-rose-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-900 font-mono"
                  />
                  <X className="w-4 h-4 text-rose-500 absolute right-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight text-start">
                  If a mobile number is the same as a WhatsApp number please set mobile number here again and don't forget country code
                </p>
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#2b62af] hover:bg-[#224f8d] text-white font-bold rounded-lg text-xs shadow-md transition-colors"
            >
              {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
