import React, { useState } from 'react';
import { Lock, User, Globe, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { AzharLogo } from './AzharLogo';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';

interface LoginProps { onLogin: (user: UserType) => void; }

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { language, toggleLanguage } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setError(''); setLoading(true);
    try {
      // Role is intentionally omitted: the server detects Admin / Staff / Tenant
      // from the account itself. One login form, one identity, correct portal.
      const result = await apiService.login(identifier.trim(), password);
      if (!result.ok || !result.user) {
        setError(language === 'ar' ? 'اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid username/email or password.');
        return;
      }
      const role = String(result.user.role || '').toLowerCase();
      if (!['admin','staff','tenant'].includes(role)) {
        await apiService.logout();
        setError(language === 'ar' ? 'نوع الحساب غير صالح. تواصل مع الإدارة.' : 'This account has no valid role. Contact administration.');
        return;
      }
      onLogin({
        id: result.user.id,
        username: result.user.username,
        name: result.user.fullName || result.user.username,
        email: result.user.email || '',
        role: result.user.role,
        tenantId: result.user.tenantId || undefined,
        staffId: result.user.staffId || undefined
      });
    } catch (e:any) {
      setError(language === 'ar' ? 'تعذر تسجيل الدخول الآن. تأكد من اتصال الخادم وحاول مرة أخرى.' : 'Unable to sign in right now. Please check the server connection and try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-gradient-to-br from-slate-900 via-slate-800 to-[#1d2024] p-4 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} z-20`}>
        <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-lg text-xs font-bold text-slate-200 shadow-md">
          <Globe className="w-4 h-4 text-[#29b4c4]" /> <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 20% 30%, rgba(41,180,196,0.5) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(245,158,11,0.3) 0%, transparent 40%)'}} />
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-2xl mb-3 inline-block"><AzharLogo variant="light" size="lg" /></div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{language === 'ar' ? 'منظومة إدارة مجمع أزهار السكني' : 'AZHAR RESIDENCE'}</h1>
          <p className="text-cyan-300 text-xs mt-1 font-medium">{language === 'ar' ? 'تسجيل دخول موحد لجميع المستخدمين' : 'Single sign-in for all users'}</p>
        </div>
        <div className="bg-white/95 rounded-2xl shadow-2xl p-6 border border-white/40">
          <div className="flex items-center gap-3 p-3 mb-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 rounded-lg bg-slate-900 text-cyan-300"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="text-sm font-bold text-slate-900">{language === 'ar' ? 'الدخول الذكي' : 'Smart Sign In'}</div>
              <div className="text-[11px] text-slate-500">{language === 'ar' ? 'النظام يحدد صلاحية الحساب تلقائياً' : 'Your role is detected automatically'}</div>
            </div>
          </div>
          {error && <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{language === 'ar' ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}</label>
              <div className="relative">
                <User className={`absolute top-3.5 ${language === 'ar' ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-slate-400`} />
                <input autoComplete="username" type="text" required autoFocus value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="username@example.com" className={`w-full py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4] ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
              <div className="relative">
                <Lock className={`absolute top-3.5 ${language === 'ar' ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-slate-400`} />
                <input autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className={`w-full py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29b4c4] ${language === 'ar' ? 'pr-10 pl-10' : 'pl-10 pr-10'}`} />
                <button type="button" onClick={()=>setShowPassword(v=>!v)} className={`absolute top-3 ${language === 'ar' ? 'left-3.5' : 'right-3.5'} text-slate-400`}>{showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4 text-cyan-300"/>}
              {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-4">{language === 'ar' ? 'استخدم نفس اسم المستخدم أو البريد المرتبط بحسابك.' : 'Use the username or email linked to your account.'}</p>
        </div>
      </div>
    </div>
  );
};
