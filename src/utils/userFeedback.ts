export type FeedbackKind = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackPayload {
  kind: FeedbackKind;
  ar: string;
  en: string;
  duration?: number;
}

export function notifyUser(payload: FeedbackPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('azhar:user-feedback', { detail: payload }));
}

export function friendlyApiError(status: number, rawMessage = '', path = ''): { ar: string; en: string } {
  const msg = String(rawMessage || '').toLowerCase();
  const p = String(path || '').toLowerCase();
  if (status === 401 || msg.includes('invalid token') || msg.includes('jwt')) return { ar: 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', en: 'Your session has expired. Please sign in again.' };
  if (status === 403 || msg.includes('admin access required') || msg.includes('permission')) return { ar: 'ليس لديك صلاحية لتنفيذ هذه العملية.', en: 'You do not have permission to perform this action.' };
  if (status === 503 || msg.includes('database unavailable')) return { ar: 'الخدمة غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.', en: 'The service is temporarily unavailable. Please try again shortly.' };
  if (msg.includes('meter number already exists')) return { ar: 'رقم العداد مسجل بالفعل. استخدم رقم عداد مختلفًا.', en: 'This meter number is already registered.' };
  if (msg.includes('valid unit is required')) return { ar: 'يجب اختيار وحدة صحيحة مرتبطة بالعداد.', en: 'Please select a valid unit for this meter.' };
  if (msg.includes('meter number is required')) return { ar: 'رقم العداد مطلوب.', en: 'Meter number is required.' };
  if ((msg.includes('مبلغ مستحق') || msg.includes('outstanding')) && p.includes('contract')) return { ar: rawMessage || 'لا يمكن حذف العقد قبل تسوية جميع المستحقات المفتوحة.', en: 'The contract cannot be deleted until all outstanding amounts are settled.' };
  if (msg.includes('financial history') && msg.includes('contract')) return { ar: 'يمكن حذف العقد بعد تسوية جميع المستحقات. إذا ظهر هذا التنبيه، راجع الرصيد المفتوح للعقد.', en: 'The contract can be deleted after all outstanding amounts are settled.' };
  if ((msg.includes('مبلغ مستحق') || msg.includes('outstanding')) && p.includes('tenant')) return { ar: rawMessage || 'لا يمكن حذف المستأجر قبل تسوية جميع المستحقات المفتوحة.', en: 'The tenant cannot be removed until all outstanding amounts are settled.' };
  if (msg.includes('financial history') && (msg.includes('tenant') || p.includes('tenant'))) return { ar: 'لا يمكن حذف المستأجر قبل تسوية المستحقات المفتوحة. السجل المالي القديم لا يمنع الحذف بعد التسوية.', en: 'The tenant cannot be removed until open balances are settled. Historical transactions do not block removal after settlement.' };
  if (msg.includes('financial schedule fields cannot be changed') || msg.includes('لا يمكن تعديل قيمة الإيجار')) return { ar: 'لا يمكن تعديل قيمة الإيجار أو بيانات الجدول المالي بعد تسجيل دفعات على العقد.', en: 'Financial contract fields cannot be changed after payments are posted.' };
  if (msg.includes('password must be at least 8')) return { ar: 'كلمة المرور يجب ألا تقل عن 8 أحرف.', en: 'Password must be at least 8 characters.' };
  if (msg.includes('email before creating login credentials')) return { ar: 'يجب تسجيل بريد إلكتروني صحيح أولًا قبل إنشاء بيانات الدخول.', en: 'A valid email is required before creating login credentials.' };
  if (msg.includes('not found')) {
    if (p.includes('contract')) return { ar: 'العقد المطلوب غير موجود أو تم حذفه.', en: 'The requested contract was not found.' };
    if (p.includes('tenant')) return { ar: 'المستأجر المطلوب غير موجود.', en: 'The requested tenant was not found.' };
    if (p.includes('meter')) return { ar: 'العداد المطلوب غير موجود.', en: 'The requested meter was not found.' };
    if (p.includes('building')) return { ar: 'المبنى المطلوب غير موجود.', en: 'The requested building was not found.' };
    return { ar: 'السجل المطلوب غير موجود أو لم يعد متاحًا.', en: 'The requested record was not found.' };
  }
  if (status === 409) return { ar: 'تعذر تنفيذ العملية بسبب تعارض مع بيانات مسجلة بالفعل. راجع البيانات وحاول مرة أخرى.', en: 'The action conflicts with existing data. Review the information and try again.' };
  if (status === 400 || status === 422) return { ar: 'بعض البيانات المدخلة غير صحيحة أو ناقصة. راجع الحقول وحاول مرة أخرى.', en: 'Some entered information is invalid or incomplete. Please review the fields.' };
  if (status >= 500) return { ar: 'حدث خطأ أثناء تنفيذ العملية. لم يتم حفظ أي تغييرات غير مكتملة. حاول مرة أخرى.', en: 'Something went wrong while processing the action. Please try again.' };
  return { ar: 'تعذر تنفيذ العملية. تحقق من البيانات والاتصال ثم حاول مرة أخرى.', en: 'The action could not be completed. Check your data and connection, then try again.' };
}

export function actionSuccess(method: string, path: string): { ar: string; en: string } | null {
  const m = method.toUpperCase();
  const p = path.toLowerCase();
  if (m === 'GET') return null;
  if (p.includes('/notifications/') || p.includes('/fcm-token')) return null;
  if (p.includes('/payment/') && p.includes('/reverse')) return { ar: 'تم عكس الدفعة بنجاح وحفظ الحركة في السجل المالي.', en: 'Payment reversed successfully and retained in the financial history.' };
  if (p.includes('/payment')) return { ar: 'تم تسجيل الدفعة بنجاح.', en: 'Payment recorded successfully.' };
  if (p.includes('/renew')) return { ar: 'تم تجديد العقد وإنشاء جدول الاستحقاقات الجديد بنجاح.', en: 'Contract renewed and the new payment schedule was created.' };
  if (p.includes('/terminate')) return { ar: 'تم إنهاء العقد وحساب التسوية النهائية بنجاح.', en: 'Contract terminated and final settlement calculated successfully.' };
  if (p.includes('/password')) return { ar: 'تم تحديث كلمة المرور بنجاح.', en: 'Password updated successfully.' };
  if (m === 'POST') return { ar: 'تمت الإضافة بنجاح.', en: 'Added successfully.' };
  if (m === 'PUT' || m === 'PATCH') return { ar: 'تم حفظ التعديلات بنجاح.', en: 'Changes saved successfully.' };
  if (m === 'DELETE') return { ar: 'تم الحذف أو الأرشفة بنجاح.', en: 'Deleted or archived successfully.' };
  return { ar: 'تم تنفيذ العملية بنجاح.', en: 'Action completed successfully.' };
}
