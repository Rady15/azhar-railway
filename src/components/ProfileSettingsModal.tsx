import React, { useState, useRef, useEffect } from 'react';
import { X, User, Mail, UserCircle, ShieldCheck, Lock, Save, Camera, Upload, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';
import { notifyUser } from '../utils/userFeedback';

interface ProfileSettingsModalProps {
  user: UserType;
  onClose: () => void;
  onSave: (updatedUser: UserType) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  user,
  onClose,
  onSave
}) => {
  const { language } = useLanguage();

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string>(user.profileImageUrl || user.avatar || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...user,
      name,
      email,
      profileImageUrl: profileImage,
      ...(password ? { password } : {})
    } as UserType);
    onClose();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notifyUser({ kind: 'warning', ar: 'يرجى اختيار ملف صورة صالح.', en: 'Please select a valid image file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notifyUser({ kind: 'warning', ar: 'حجم الصورة يجب أن يكون أقل من 5MB.', en: 'Image size must be less than 5MB.' });
      return;
    }
    setIsUploading(true);
    try {
      const url = await apiService.uploadProfileImage(file);
      setProfileImage(url);
    } catch (err) {
      console.error('Failed to upload image', err);
      notifyUser({ kind: 'error', ar: 'تعذر رفع الصورة. حاول مرة أخرى.', en: 'Could not upload the image. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-[#2b3038] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-[#29b4c4]" />
            <h2 className="text-base font-bold">
              {language === 'ar' ? 'إعدادات الحساب' : 'Profile Settings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800">
         {/* Profile Picture */}
         <div className="flex flex-col items-center gap-3">
           <div className="relative group">
             <img
               src={profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=29b4c4&color=fff'}
               alt={user.name}
               className="w-24 h-24 rounded-full object-cover border-4 border-[#29b4c4] shadow-lg"
               onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=29b4c4&color=fff'; }}
             />
             {isUploading && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                 <Loader2 className="w-8 h-8 text-white animate-spin" />
               </div>
             )}
             {!isUploading && (
               <button
                 type="button"
                 onClick={() => fileInputRef.current?.click()}
                 className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 <Camera className="w-8 h-8 text-white" />
               </button>
             )}
           </div>
           <input
             ref={fileInputRef}
             type="file"
             accept="image/*"
             onChange={handleImageChange}
             className="hidden"
           />
           <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
           >
             {isUploading ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
               </>
             ) : (
               <>
                 <Upload className="w-4 h-4" />
                 {language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}
               </>
             )}
           </button>
           {profileImage && profileImage.startsWith('data:') && (
             <p className="text-[10px] text-slate-400">
               {language === 'ar' ? 'سيتم حفظ الصورة محلياً' : 'Image will be saved locally'}
             </p>
           )}
         </div>

           {/* Current Account Summary */}
           <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
             {user.avatar ? (
               <img
                 src={user.avatar}
                 alt={user.name}
                 className="w-12 h-12 rounded-full object-cover border-2 border-[#29b4c4]"
               />
             ) : (
               <div className="w-12 h-12 rounded-full bg-[#29b4c4]/20 border-2 border-[#29b4c4] flex items-center justify-center">
                 <User className="w-6 h-6 text-[#29b4c4]" />
               </div>
             )}
             <div>
               <p className="font-bold text-slate-900">{user.name}</p>
               <p className="text-[11px] text-slate-500">{user.email}</p>
               <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-[#29b4c4]/15 text-[#0e7a87] rounded text-[10px] font-bold">
                 <ShieldCheck className="w-3 h-3" />
                 {user.role}
               </span>
             </div>
           </div>

          {/* Display Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {language === 'ar' ? 'الاسم المعروض' : 'Display Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              <span className="text-slate-400 font-normal">
                {' '}
                ({language === 'ar' ? 'اختياري' : 'optional'})
              </span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'ar' ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' : 'Leave blank to keep current password'}
                className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#29b4c4]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#29b4c4] hover:bg-[#1f9bad] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
