export type DialogKind = 'confirm' | 'prompt';

export interface DialogRequest {
  kind: DialogKind;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  inputLabel?: string;
  inputType?: 'text' | 'number' | 'date';
  tone?: 'default' | 'danger' | 'warning';
  resolve: (value: boolean | string | null) => void;
}

function requestDialog(req: Omit<DialogRequest, 'resolve'>): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(req.kind === 'confirm' ? false : null);
  return new Promise(resolve => {
    window.dispatchEvent(new CustomEvent<DialogRequest>('azhar:ui-dialog', { detail: { ...req, resolve } }));
  });
}

export function confirmUi(options: Omit<DialogRequest, 'kind' | 'resolve' | 'defaultValue' | 'inputLabel' | 'inputType'>): Promise<boolean> {
  return requestDialog({ ...options, kind: 'confirm' });
}

export function promptUi(options: Omit<DialogRequest, 'kind' | 'resolve'>): Promise<string | null> {
  return requestDialog({ ...options, kind: 'prompt' });
}
