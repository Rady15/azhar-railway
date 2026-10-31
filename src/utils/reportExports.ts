
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import { notifyUser } from './userFeedback';

const NAVY = '17324D';
const TEAL = '1AA6A6';
const LIGHT = 'F3F7FA';
const BORDER = 'D9E2EC';
const MUTED = '667085';
const GOLD = 'D9A441';

type ExcelOptions = {
  sheetName: string;
  fileName: string;
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  kpis?: Array<{ label: string; value: string | number }>;
  totalRow?: Array<string | number>;
};

const setCell = (ws: any, addr: string, value: any, style: any) => {
  ws[addr] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
};

export function exportStyledExcel(options: ExcelOptions) {
  const ws: any = {};
  const rangeRows = 8 + options.rows.length + (options.totalRow ? 1 : 0);
  const rangeCols = options.columns.length;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rangeRows - 1, c: rangeCols - 1 } });

  const titleStyle = {
    font: { name: 'Aptos Display', sz: 18, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'right', vertical: 'center' },
  };
  const subtitleStyle = {
    font: { name: 'Aptos', sz: 10, color: { rgb: 'DCE6F0' } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'right', vertical: 'center' },
  };
  const kpiLabelStyle = {
    font: { name: 'Aptos', sz: 9, bold: true, color: { rgb: MUTED } },
    fill: { fgColor: { rgb: LIGHT } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: { bottom: { style: 'thin', color: { rgb: BORDER } } },
  };
  const kpiValueStyle = {
    font: { name: 'Aptos', sz: 15, bold: true, color: { rgb: NAVY } },
    fill: { fgColor: { rgb: LIGHT } },
    alignment: { horizontal: 'right', vertical: 'center' },
  };
  const headStyle = {
    font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: TEAL } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { top: { style: 'thin', color: { rgb: TEAL } }, bottom: { style: 'thin', color: { rgb: TEAL } } },
  };
  const cellStyle = {
    font: { name: 'Aptos', sz: 10, color: { rgb: '253858' } },
    alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
    border: { bottom: { style: 'hair', color: { rgb: BORDER } } },
  };
  const altStyle = {
    ...cellStyle,
    fill: { fgColor: { rgb: 'F8FAFC' } },
  };
  const totalStyle = {
    font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: NAVY } },
    fill: { fgColor: { rgb: 'E7F5F4' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: { top: { style: 'medium', color: { rgb: TEAL } } },
  };

  // Branded title band
  for (let c = 0; c < rangeCols; c++) {
    setCell(ws, XLSX.utils.encode_cell({ r: 0, c }), '', titleStyle);
    setCell(ws, XLSX.utils.encode_cell({ r: 1, c }), '', subtitleStyle);
  }
  setCell(ws, 'A1', options.title, titleStyle);
  setCell(ws, 'A2', options.subtitle || `Generated ${new Date().toLocaleString('en-GB')}`, subtitleStyle);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: rangeCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: rangeCols - 1 } },
  ];

  // KPI strip
  const kpis = options.kpis || [];
  const kpiWidth = Math.max(1, Math.floor(rangeCols / Math.max(1, kpis.length)));
  kpis.forEach((k, i) => {
    const start = i * kpiWidth;
    const end = i === kpis.length - 1 ? rangeCols - 1 : Math.min(rangeCols - 1, start + kpiWidth - 1);
    setCell(ws, XLSX.utils.encode_cell({ r: 3, c: start }), k.label, kpiLabelStyle);
    setCell(ws, XLSX.utils.encode_cell({ r: 4, c: start }), k.value, kpiValueStyle);
    if (end > start) {
      ws['!merges'].push({ s: { r: 3, c: start }, e: { r: 3, c: end } });
      ws['!merges'].push({ s: { r: 4, c: start }, e: { r: 4, c: end } });
      for (let c = start + 1; c <= end; c++) {
        setCell(ws, XLSX.utils.encode_cell({ r: 3, c }), '', kpiLabelStyle);
        setCell(ws, XLSX.utils.encode_cell({ r: 4, c }), '', kpiValueStyle);
      }
    }
  });

  const headerRow = 6;
  options.columns.forEach((col, c) => setCell(ws, XLSX.utils.encode_cell({ r: headerRow, c }), col, headStyle));
  options.rows.forEach((row, r) => {
    row.forEach((value, c) => {
      const style = r % 2 === 1 ? altStyle : cellStyle;
      setCell(ws, XLSX.utils.encode_cell({ r: headerRow + 1 + r, c }), value, style);
    });
  });

  if (options.totalRow) {
    const r = headerRow + 1 + options.rows.length;
    options.totalRow.forEach((value, c) => setCell(ws, XLSX.utils.encode_cell({ r, c }), value, totalStyle));
  }

  ws['!cols'] = options.columns.map((_, i) => ({
    wch: Math.max(12, Math.min(28, Math.max(12, ...options.rows.map(r => String(r[i] ?? '').length + 2), String(options.columns[i]).length + 2))),
  }));
  ws['!rows'] = [
    { hpt: 34 }, { hpt: 22 }, { hpt: 8 }, { hpt: 22 }, { hpt: 28 }, { hpt: 8 },
    { hpt: 30 },
  ];
  ws['!freeze'] = { xSplit: 0, ySplit: headerRow + 1 };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: headerRow + options.rows.length, c: rangeCols - 1 } }) };
  ws['!sheetViews'] = [{ rightToLeft: true }];

  // Set numeric formats for financial columns.
  Object.keys(ws).forEach(addr => {
    if (!addr.startsWith('!')) {
      const cell = ws[addr];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName.slice(0, 31));
  XLSX.writeFile(wb, options.fileName);
}

type PdfOptions = {
  title: string;
  subtitle?: string;
  headers: string[];
  body: any[][];
  kpis?: Array<{ label: string; value: string }>;
  fileName: string;
  totals?: any[];
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const containsArabic = (value: unknown): boolean => ARABIC_RE.test(String(value ?? ''));
const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function openArabicPrintReport(options: PdfOptions): void {
  const popup = window.open('', '_blank', 'width=1100,height=800');
  if (!popup) {
    notifyUser({
      kind: 'warning',
      ar: 'تعذر فتح تقرير الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مرة أخرى.',
      en: 'The print report could not be opened. Allow pop-ups for this site and try again.'
    });
    return;
  }

  const subtitle = options.subtitle || `تم الإنشاء ${new Date().toLocaleString('ar-EG')}`;
  const kpis = (options.kpis || []).map(k => `
    <div class="kpi"><div class="kpi-label">${escapeHtml(k.label)}</div><div class="kpi-value">${escapeHtml(k.value)}</div></div>`).join('');
  const head = options.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const body = options.body.length
    ? options.body.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${options.headers.length}">لا توجد بيانات للطباعة</td></tr>`;
  const totals = options.totals
    ? `<tfoot><tr>${options.totals.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr></tfoot>`
    : '';

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(options.title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #0f172a; font-family: Arial, Tahoma, sans-serif; }
  .page { padding: 4px; }
  .hero { background: #17324d; color: #fff; padding: 16px 18px; border-bottom: 4px solid #1aa6a6; border-radius: 8px 8px 0 0; }
  .brand { font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #cbd5e1; }
  h1 { margin: 6px 0 0; font-size: 20px; }
  .sub { margin-top: 6px; font-size: 11px; color: #d6e2ee; }
  .kpis { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
  .kpi { flex: 1 1 140px; border: 1px solid #d9e2ec; background: #f6f9fb; border-radius: 8px; padding: 10px 12px; }
  .kpi-label { font-size: 9px; font-weight: 700; color: #667085; margin-bottom: 4px; }
  .kpi-value { font-size: 16px; font-weight: 700; color: #17324d; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background: #1aa6a6; color: #fff; padding: 7px 6px; border: 1px solid #148f8f; text-align: center; font-weight: 700; }
  td { padding: 6px; border: 1px solid #d9e2ec; text-align: right; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tfoot td { background: #e7f5f4; color: #17324d; font-weight: 700; border-top: 2px solid #1aa6a6; }
  .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #d9e2ec; font-size: 9px; color: #94a3b8; text-align: center; }
  .actions { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }
  .actions button { border: 0; border-radius: 9px; padding: 10px 18px; font-weight: 700; cursor: pointer; }
  .print { background: #17324d; color: #fff; }
  .close { background: #e2e8f0; color: #334155; }
  @media print { .actions { display: none !important; } .page { padding: 0; } }
</style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div class="brand">AZHAR RESIDENCE</div>
      <h1>${escapeHtml(options.title)}</h1>
      <div class="sub">${escapeHtml(subtitle)}</div>
    </header>
    ${kpis ? `<section class="kpis">${kpis}</section>` : ''}
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
      ${totals}
    </table>
    <div class="footer">تم إصدار هذا التقرير من نظام إدارة مجمع أزهار السكني.</div>
    <div class="actions">
      <button class="print" onclick="window.print()">طباعة / حفظ PDF</button>
      <button class="close" onclick="window.close()">إغلاق</button>
    </div>
  </main>
</body>
</html>`);
  popup.document.close();
  popup.focus();
  setTimeout(() => { try { popup.print(); } catch { /* popup already closed */ } }, 700);
}

export function exportStyledPdf(options: PdfOptions) {
  const hasArabic =
    containsArabic(options.title) ||
    containsArabic(options.subtitle) ||
    options.headers.some(containsArabic) ||
    options.body.some(row => row.some(containsArabic)) ||
    (options.kpis || []).some(k => containsArabic(k.label) || containsArabic(k.value)) ||
    (options.totals || []).some(containsArabic);

  // jsPDF's built-in fonts cannot shape Arabic, so route Arabic reports to the
  // browser's native print pipeline (Save as PDF) where the text renders correctly.
  if (hasArabic) {
    openArabicPrintReport(options);
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Premium branded header
  doc.setFillColor(23, 50, 77);
  doc.rect(0, 0, W, 34, 'F');
  doc.setFillColor(26, 166, 166);
  doc.rect(0, 34, W, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('AZHAR RESIDENCE', 14, 12);
  doc.setFontSize(11);
  doc.text(options.title, 14, 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(214, 226, 238);
  doc.text(options.subtitle || `Generated ${new Date().toLocaleString('en-GB')}`, 14, 28);

  // KPI cards
  let x = 14;
  const gap = 4;
  const cardW = options.kpis?.length ? (W - 28 - gap * (options.kpis.length - 1)) / options.kpis.length : 0;
  (options.kpis || []).forEach((k, i) => {
    x = 14 + i * (cardW + gap);
    doc.setFillColor(246, 249, 251);
    doc.setDrawColor(217, 226, 236);
    doc.roundedRect(x, 41, cardW, 17, 3, 3, 'FD');
    doc.setTextColor(102, 112, 133);
    doc.setFontSize(7.5);
    doc.text(k.label, x + 5, 47);
    doc.setTextColor(23, 50, 77);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(k.value, x + 5, 54);
    doc.setFont('helvetica', 'normal');
  });

  const startY = options.kpis?.length ? 64 : 43;
  autoTable(doc, {
    startY,
    head: [options.headers],
    body: options.body,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3,
      textColor: [37, 56, 80],
      lineColor: [217, 226, 236],
      lineWidth: 0.25,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [26, 166, 166],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    foot: options.totals ? [options.totals] : undefined,
    footStyles: {
      fillColor: [231, 245, 244],
      textColor: [23, 50, 77],
      fontStyle: 'bold',
    },
    didDrawPage: (data) => {
      doc.setDrawColor(217, 226, 236);
      doc.line(14, H - 13, W - 14, H - 13);
      doc.setTextColor(102, 112, 133);
      doc.setFontSize(7);
      doc.text('AZHAR RESIDENCE • Official Report', 14, H - 7);
      doc.text(`Page ${data.pageNumber}`, W - 30, H - 7);
    },
  });

  doc.save(options.fileName);
}
