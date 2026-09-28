import { apiService } from '../services/api';
import { notifyUser } from './userFeedback';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|svg)$/i;

function looksLikeImage(url: string, mimeType?: string): boolean {
  if (mimeType) return mimeType.toLowerCase().startsWith('image/');
  return IMAGE_EXT.test(url.split('?')[0]);
}

/**
 * Prints an uploaded attachment itself (scan or PDF) rather than a data sheet.
 * Images are laid out to fit the page; PDFs are embedded so the browser renders
 * its native viewer and print pipeline.
 */
export async function printMediaDocument(url: string, fileName?: string): Promise<void> {
  if (!url) return;

  const popup = window.open('', '_blank', 'width=900,height=760');
  if (!popup) {
    notifyUser({
      kind: 'warning',
      ar: 'تعذر فتح صفحة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مرة أخرى.',
      en: 'The print page could not be opened. Allow pop-ups for this site and try again.'
    });
    return;
  }

  let objectUrl = '';
  try {
    const blob = await apiService.getMediaBlob(url);
    objectUrl = URL.createObjectURL(blob);
    const isImage = looksLikeImage(url, blob.type);
    const title = (fileName || 'مستند').replace(/[<>"]/g, '');

    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { display: flex; flex-direction: column; background: #f1f5f9; font-family: Arial, Tahoma, sans-serif; }
  .bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: #0f172a; color: #fff; }
  .bar .name { font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar .actions { display: flex; gap: 8px; flex-shrink: 0; }
  .bar button { border: 0; border-radius: 8px; padding: 8px 16px; font-weight: 700; font-size: 12px; cursor: pointer; }
  .print { background: #29b4c4; color: #062a2e; }
  .close { background: #e2e8f0; color: #334155; }
  .viewer { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 12px; }
  .viewer img { max-width: 100%; max-height: 100%; object-fit: contain; background: #fff; box-shadow: 0 2px 12px rgba(15,23,42,.18); }
  .viewer iframe { width: 100%; height: 100%; border: 0; background: #fff; }
  .hint { padding: 6px 14px; font-size: 11px; color: #64748b; text-align: center; background: #fff; border-top: 1px solid #e2e8f0; }
  @media print { .bar, .hint { display: none !important; } body { background: #fff; } .viewer { padding: 0; } .viewer img { box-shadow: none; max-height: 100vh; } }
</style>
</head>
<body>
  <div class="bar">
    <div class="name">${title}</div>
    <div class="actions">
      <button class="print" onclick="window.print()">طباعة / حفظ PDF</button>
      <button class="close" onclick="window.close()">إغلاق</button>
    </div>
  </div>
  <div class="viewer">
    ${isImage
      ? `<img src="${objectUrl}" alt="${title}" />`
      : `<iframe src="${objectUrl}" title="${title}"></iframe>`}
  </div>
  <div class="hint">${isImage
    ? 'يمكنك الطباعة مباشرة أو الحفظ بصيغة PDF.'
    : 'يمكنك الطباعة من الزر أعلاه أو من شريط أدوات عرض ملف PDF.'}</div>
</body>
</html>`);
    popup.document.close();
    popup.focus();
    // Give the embedded document a moment to lay out before any print is triggered.
    setTimeout(() => { try { popup.focus(); } catch { /* popup already closed */ } }, 400);
  } catch (err) {
    popup.close();
    notifyUser({
      kind: 'error',
      ar: 'تعذر فتح الملف للطباعة. حاول مرة أخرى.',
      en: 'The file could not be opened for printing. Please try again.'
    });
  } finally {
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
  }
}
