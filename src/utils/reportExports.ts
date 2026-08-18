
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

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

export function exportStyledPdf(options: PdfOptions) {
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
