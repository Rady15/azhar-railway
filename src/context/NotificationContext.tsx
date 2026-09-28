import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { apiService, ensureAuth, SESSION_EXPIRED_EVENT } from '../services/api';
import type { Notification } from '../types';
import { notifyUser } from '../utils/userFeedback';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isDropdownOpen: boolean;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  pushEnabled: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  enablePush: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const authedRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    // Polling and focus refetches both run on a timer; without this guard they keep
    // firing 401s for the whole lifetime of a dead session.
    if (!authedRef.current) return;
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.warn('Failed to load notifications', err);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => apiService.markNotificationAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  }, [notifications]);

  const toggleDropdown = useCallback(() => setIsDropdownOpen(prev => !prev), []);
  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);

  const registerFcm = useCallback(async (token: string) => {
    try {
      await apiService.registerFcmToken(token, 'web');
      setFcmToken(token);
      setPushEnabled(true);
    } catch (err) {
      console.error('Failed to register FCM token', err);
    }
  }, []);

  const enablePush = useCallback(async () => {
    if (!('Notification' in window)) {
      notifyUser({kind:'warning', ar:'المتصفح الحالي لا يدعم إشعارات سطح المكتب.', en:'This browser does not support desktop notifications.'});
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    setPushPermission(permission);

    if (permission === 'granted') {
      const firebaseApp = (window as any).__FIREBASE_APP__;
      if (!firebaseApp) {
        notifyUser({kind:'warning', ar:'إشعارات المتصفح غير مفعلة على هذا النظام حاليًا.', en:'Browser push notifications are not configured for this system yet.'});
        return;
      }
      try {
        const { getMessaging, getToken } = await import('firebase/messaging');
        const messaging = getMessaging(firebaseApp);
        const vapidKey = (window as any).__FIREBASE_VAPID_KEY__;
        const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
        if (token) {
          await registerFcm(token);
        }
      } catch (err) {
        console.error('Failed to get FCM token', err);
      }
    }
  }, [registerFcm]);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPushPermission('unsupported');
    } else {
      setPushPermission(Notification.permission);
    }

    let disposed = false;
    const stopPolling = () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = undefined; }
    };

    const onSessionExpired = () => {
      authedRef.current = false;
      stopPolling();
      setNotifications([]);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);

    ensureAuth().then((token) => {
      if (disposed || !token) return;
      authedRef.current = true;
      loadNotifications();
      // Start the timer only once the session is known to be good, so a failed boot
      // does not leave a 30s 401 loop running.
      stopPolling();
      pollingRef.current = setInterval(() => {
        loadNotifications();
      }, 30000);
    });

    const handleFocus = () => loadNotifications();
    window.addEventListener('focus', handleFocus);

    return () => {
      disposed = true;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
      stopPolling();
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isDropdownOpen,
      toggleDropdown,
      closeDropdown,
      markAsRead,
      markAllAsRead,
      refresh: loadNotifications,
      pushEnabled,
      pushPermission,
      enablePush
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
