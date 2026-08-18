import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  ChevronDown, 
  Menu, 
  ShieldCheck, 
  Building,
  Globe,
  CheckCheck,
  X,
  Maximize2
} from 'lucide-react';
import { User } from '../types';
import { AzharLogo } from './AzharLogo';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { apiService } from '../services/api';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  selectedCompoundId: string;
  onSelectCompound: (compoundId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleSidebar: () => void;
  onOpenProfileSettings?: () => void;
  onOpenAdminPermissions?: () => void;
  onSearchResultSelect?: (type: string, id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  searchQuery,
  onSearchChange,
  onToggleSidebar,
  onOpenProfileSettings,
  onOpenAdminPermissions,
  onSearchResultSelect
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ type: string; id: string; title: string; subtitle?: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const { 
    notifications, 
    unreadCount, 
    isDropdownOpen, 
    toggleDropdown, 
    closeDropdown, 
    markAsRead, 
    markAllAsRead,
    pushEnabled,
    pushPermission,
    enablePush
  } = useNotifications();

  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await apiService.globalSearch(q);
        setSearchResults(results);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, closeDropdown]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return language === 'ar' ? 'الآن' : 'Just now';
    if (diff < 3600) return language === 'ar' ? `منذ ${Math.floor(diff / 60)} دقيقة` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return language === 'ar' ? `منذ ${Math.floor(diff / 3600)} ساعة` : `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return language === 'ar' ? `منذ ${Math.floor(diff / 86400)} يوم` : `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'NewComplaint': return 'bg-rose-500';
      case 'NewMaintenanceRequest': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <header className="h-16 bg-[#2b3038] text-white border-b border-slate-700/80 sticky top-0 z-30 flex items-center justify-between px-3 lg:px-6 shadow-md">
      {/* Left: Brand Logo & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors lg:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 py-1">
          <AzharLogo variant="light" size="md" />
          <div className="hidden xl:block border-r border-slate-700 h-7 mx-1" />
          <div className="hidden xl:flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/60 text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 text-[#29b4c4]" />
            <span>{t('system_title')}</span>
          </div>
        </div>
      </div>

      {/* Middle: Global Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg mx-3 sm:mx-6">
        <div className="relative flex-1" ref={searchRef}>
          <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#29b4c4] transition-all ${
              language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className={`absolute top-full mt-2 w-full min-w-[320px] max-h-80 overflow-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 ${language === 'ar' ? 'right-0' : 'left-0'}`}>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                {searchLoading ? (language === 'ar' ? 'جاري البحث...' : 'Searching...') : (language === 'ar' ? 'نتائج البحث' : 'Search results')}
              </div>
              {!searchLoading && searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">{language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results'}</div>
              ) : searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => { onSearchResultSelect?.(result.type, result.id); setSearchOpen(false); }}
                  className="w-full text-start px-4 py-3 hover:bg-slate-800 border-b border-slate-800/60 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{result.title}</div>
                      {result.subtitle && <div className="text-[10px] text-slate-400 mt-1 truncate">{result.subtitle}</div>}
                    </div>
                    <span className="text-[9px] px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase">{result.type}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Notifications, Language Switcher & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Language Switcher Button */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold text-slate-200 transition-colors shadow-sm"
          title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
        >
          <Globe className="w-3.5 h-3.5 text-[#29b4c4]" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        {/* Compound Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>AZHAR RESIDENCE</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button 
            onClick={toggleDropdown}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-[#2b3038] px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <div 
              className={`absolute mt-2 w-80 max-h-[70vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-xs text-slate-200 flex flex-col ${
                language === 'ar' ? 'left-0' : 'right-0'
              }`}
              onMouseLeave={closeDropdown}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[11px] text-[#29b4c4] hover:text-[#29b4c4]/80 transition-colors"
                      title={language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'قراءة الكل' : 'Mark all read'}</span>
                    </button>
                  )}
                  <button 
                    onClick={closeDropdown}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`px-4 py-3 border-b border-slate-800/60 cursor-pointer transition-colors hover:bg-slate-800/60 ${
                        !notification.isRead ? 'bg-[#29b4c4]/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-1 self-stretch rounded-full ${getTypeColor(notification.type)} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-slate-100 truncate ${!notification.isRead ? 'text-white' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {notification.body}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#29b4c4] mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-slate-800 text-center">
                <button
                  onClick={enablePush}
                  className="text-[11px] text-slate-400 hover:text-[#29b4c4] transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  {pushEnabled 
                    ? (language === 'ar' ? '🔔 الإشعارات مفعلة' : '🔔 Notifications enabled') 
                    : (language === 'ar' ? 'تفعيل إشعارات المتصفح' : 'Enable browser notifications')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-700/60 rounded-xl transition-colors text-left"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setShowAvatarPreview(true); }}
              className="block focus:outline-none"
            >
              <img
                src={user.profileImageUrl || user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=29b4c4&color=fff'}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-[#29b4c4] cursor-pointer hover:opacity-80 transition-opacity"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=29b4c4&color=fff'; }}
              />
            </button>
            <div className="hidden lg:block">
              <div className="text-xs font-semibold text-white leading-tight">
                {user.username}
              </div>
              <div className="text-[10px] text-slate-400">{user.role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Avatar Preview Lightbox */}
          {showAvatarPreview && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setShowAvatarPreview(false)}
            >
              <div className="relative max-w-sm w-full">
                <img
                  src={user.profileImageUrl || user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=29b4c4&color=fff'}
                  alt={user.name}
                  className="w-full rounded-2xl shadow-2xl border-4 border-white"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=29b4c4&color=fff'; }}
                />
                <button
                  onClick={() => setShowAvatarPreview(false)}
                  className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg text-slate-700 hover:text-rose-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <p className="text-center text-white mt-3 text-sm font-semibold">{user.name}</p>
              </div>
            </div>
          )}

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div 
              className={`absolute mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-200 ${
                language === 'ar' ? 'left-0' : 'right-0'
              }`}
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-[11px] text-slate-400">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-[#29b4c4]/20 text-[#29b4c4] rounded text-[10px] font-bold">
                  Azhar Residence Manager
                </span>
              </div>

              <a
                href="#profile"
                onClick={(e) => { e.preventDefault(); setShowProfileMenu(false); if (onOpenProfileSettings) onOpenProfileSettings(); }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                {t('profile_settings')}
              </a>

              <a
                href="#admin"
                onClick={(e) => { e.preventDefault(); setShowProfileMenu(false); if (onOpenAdminPermissions) onOpenAdminPermissions(); }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#29b4c4]" />
                {t('admin_permissions')}
              </a>

              <div className="border-t border-slate-800 my-1" />

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('sign_out')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
