import React from 'react';
import { Heart, PartyPopper, Waves, Droplets, Dumbbell, Flag, Flame, Utensils, Building2 } from 'lucide-react';
import { FacilityBookingStatus } from '../types';
import { Language } from '../context/LanguageContext';

export const CATEGORY_META: Record<string, { color: string; bg: string; icon: string }> = {
  'WeddingHall': { color: '#f43f5e', bg: '#ffe4e6', icon: 'Heart' },
  'Hall': { color: '#8b5cf6', bg: '#ede9fe', icon: 'PartyPopper' },
  'Pool': { color: '#06b6d4', bg: '#cffafe', icon: 'Waves' },
  'Gym': { color: '#f59e0b', bg: '#fef3c7', icon: 'Dumbbell' },
  'Playground': { color: '#10b981', bg: '#d1fae5', icon: 'Flag' },
  'BBQ': { color: '#ef4444', bg: '#fee2e2', icon: 'Flame' },
  'Restaurant': { color: '#f97316', bg: '#ffedd5', icon: 'Utensils' },
  'Shuttle': { color: '#3b82f6', bg: '#dbeafe', icon: 'Building2' },
  'SecurityPass': { color: '#64748b', bg: '#f1f5f9', icon: 'Building2' }
};

export const STATUS_META: Record<FacilityBookingStatus, { color: string; bg: string }> = {
  'Pending': { color: '#f59e0b', bg: '#fef3c7' },
  'Approved': { color: '#10b981', bg: '#d1fae5' },
  'Rejected': { color: '#ef4444', bg: '#fee2e2' },
  'Cancelled': { color: '#64748b', bg: '#f1f5f9' },
  'Completed': { color: '#06b6d4', bg: '#cffafe' }
};

export const PIE_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#64748b', '#06b6d4'];

export function facilityIcon(name: string, className: string) {
  const props = { className };
  switch (name) {
    case 'Heart': return <Heart {...props} />;
    case 'PartyPopper': return <PartyPopper {...props} />;
    case 'Waves': return <Waves {...props} />;
    case 'Droplets': return <Droplets {...props} />;
    case 'Dumbbell': return <Dumbbell {...props} />;
    case 'Flag': return <Flag {...props} />;
    case 'Flame': return <Flame {...props} />;
    case 'Utensils': return <Utensils {...props} />;
    default: return <Building2 {...props} />;
  }
}

export function statusLabel(s: FacilityBookingStatus, language: Language) {
  const labels: Record<FacilityBookingStatus, { ar: string; en: string }> = {
    'Pending': { ar: 'قيد المراجعة', en: 'Pending' },
    'Approved': { ar: 'موافقة', en: 'Approved' },
    'Rejected': { ar: 'مرفوض', en: 'Rejected' },
    'Cancelled': { ar: 'ملغي', en: 'Cancelled' },
    'Completed': { ar: 'منتهي', en: 'Completed' }
  };
  return labels[s][language];
}

export function catLabel(c: string, language: Language) {
  const labels: Record<string, { ar: string; en: string }> = {
    'WeddingHall': { ar: 'قاعة أفراح', en: 'Wedding Hall' },
    'Hall': { ar: 'قاعة مناسبات', en: 'Events Hall' },
    'Pool': { ar: 'مسبح', en: 'Pool' },
    'Gym': { ar: 'جيم', en: 'Gym' },
    'Playground': { ar: 'ملعب', en: 'Playground' },
    'BBQ': { ar: 'شواء', en: 'BBQ' },
    'Restaurant': { ar: 'مطعم', en: 'Restaurant' },
    'Shuttle': { ar: 'شاتل', en: 'Shuttle' },
    'SecurityPass': { ar: 'تصريح أمني', en: 'Security Pass' }
  };
  return labels[c]?.[language] || c;
}