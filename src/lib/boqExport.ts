// Build the "updated BOQ" workbook by re-opening the EXACT original upload and
// appending revision columns, so the original sheets, sections and styling are
// preserved.
//
// Two execution paths:
//
//  A. Python COM (isStyled = true)
//     The original .xls is converted to .xlsx by Excel itself (lossless: all
//     styles, merges, borders preserved). We then load the result with ExcelJS
//     and append the revision columns there.
//
//  B. SheetJS fallback (isStyled = false)
//     When Python / Excel COM is unavailable (serverless, cPanel, etc.) we use
//     SheetJS to read the .xls and append the revision columns directly, then
//     write back with SheetJS. We NEVER mix SheetJS output with ExcelJS —
//     doing so produces broken worksheet XML ("Line 2, column 0" errors) because
//     the two libraries use incompatible internal XML models.
//
// Both paths produce a workbook with:
//   • the original sheets, each with inline Rev 1, Rev 2 … quantity columns
//     and a trailing New Final Price column;
//   • an Extra Works tab (lines added after import / task-level measured items);
//   • a Measurements tab (length/width/height breakdowns);
//   • a Revisions tab (full per-round history for every priced line).

import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { effectiveQuantity, effectiveRate } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportLine {
  domain: string;
  task: string;
  title: string;
  description: string | null;
  unit: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
  quantity: number | null;
  rate: number | null;
  quantityRevisions: { revisionIndex: number; quantity: number; rate: number | null }[];
}

export interface ExportMeasurementRow {
  description: string | null;
  no: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  computed: number;
}

export interface ExportMeasurementBlock {
  domain: string;
  task: string;
  lineTitle: string;
  unit: string | null;
  rows: ExportMeasurementRow[];
  total: number;
}

export interface ExportRevision {
  index: number;
  label: string | null;
}

const round2 = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);

// ─────────────────────────────────────────────────────────────────────────────
// .xls → .xlsx conversion
// ─────────────────────────────────────────────────────────────────────────────

interface ConvertedBuffer {
  /** The xlsx bytes to load with ExcelJS (only used in the styled path). */
  buffer: Buffer;
  /** true  = Python COM succeeded, styling is intact, use ExcelJS path.
   *  false = SheetJS fallback, use xlsWb directly. */
  isStyled: boolean;
  /** The raw SheetJS workbook. Present only when isStyled=false so the caller
   *  can append data with SheetJS and avoid ever touching ExcelJS. */
  xlsWb?: XLSX.WorkBook;
}

// exceljs only round-trips .xlsx (ZIP, magic bytes "PK"). Legacy .xls files
// (OLE2) must be converted. We try lossless Excel COM automation via Python
// first; if that fails we return the raw SheetJS workbook for the caller to
// use directly (never feeding SheetJS output back into ExcelJS).
function ensureXlsxBuffer(buf: Buffer): ConvertedBuffer {
  // Already an xlsx — hand straight to ExcelJS.
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    return { buffer: buf, isStyled: true };
  }

  const tmpDir = path.join(process.cwd(), 'storage', 'tmp');
  const randomId = Math.random().toString(36).substring(7);
  const xlsPath = path.join(tmpDir, `temp_${randomId}.xls`);
  const xlsxPath = path.join(tmpDir, `temp_${randomId}.xlsx`);

  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(xlsPath, buf);

    const pythonScript = path.join(process.cwd(), 'src', 'lib', 'convert_xls.py');
    execSync(`python "${pythonScript}" "${xlsPath}" "${xlsxPath}"`, { stdio: 'ignore' });
    const xlsxBuf = fs.readFileSync(xlsxPath);
    return { buffer: xlsxBuf, isStyled: true };
  } catch (err) {
    console.error('Python Excel COM conversion failed, falling back to SheetJS:', err);
    try {
      // Return the raw workbook — caller will use SheetJS directly.
      const xlsWb = XLSX.read(buf, { type: 'buffer' });
      return { buffer: Buffer.alloc(0), isStyled: false, xlsWb };
    } catch (sheetJsErr) {
      console.error('SheetJS fallback read also failed:', sheetJsErr);
      throw new Error('Failed to parse legacy Excel workbook');
    }
  } finally {
    try {
      if (fs.existsSync(xlsPath)) fs.unlinkSync(xlsPath);
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
    } catch { /* best effort cleanup */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ExcelJS helpers (used only in the styled / Python COM path)
// ─────────────────────────────────────────────────────────────────────────────

/** Rightmost column that actually holds a value across the given rows, scanning
 *  only a sane window so stray far-flung cells (some originals declare a range
 *  out to column HJ) don't push the appended columns hundreds of columns away. */
function lastUsedColumn(ws: ExcelJS.Worksheet, rowNumbers: number[], maxScan = 40): number {
  let last = 1;
  for (const rn of rowNumbers) {
    const row = ws.getRow(rn);
    for (let c = 1; c <= maxScan; c++) {
      const v = row.getCell(c).value;
      if (v !== null && v !== undefined && v !== '') last = Math.max(last, c);
    }
  }
  return last;
}

const THIN = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } };
const NUM_FMT = '#,##0.##';

function isNumericCell(cell: ExcelJS.Cell): boolean {
  const v = cell.value as any;
  if (typeof v === 'number') return true;
  return !!v && typeof v === 'object' && typeof v.result === 'number';
}

function boldFillRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { ...(cell.font ?? {}), bold: true };
    cell.fill = HEADER_FILL;
  });
}

/** Border every cell of a generated tab, right-align + number-format numeric
 *  cells, and bold/fill the given header rows so the tab reads like a table. */
function gridTab(ws: ExcelJS.Worksheet, boldRows: number[] = []) {
  const lastRow = ws.rowCount;
  const lastCol = ws.columnCount;
  for (let r = 1; r <= lastRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= lastCol; c++) {
      const cell = row.getCell(c);
      cell.border = BORDER;
      if (isNumericCell(cell)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = NUM_FMT;
      } else {
        cell.alignment = { vertical: 'middle', ...(cell.alignment ?? {}) };
      }
    }
    if (boldRows.includes(r)) boldFillRow(row);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Path B: pure-SheetJS fallback builder
// ─────────────────────────────────────────────────────────────────────────────

/** Scan a SheetJS worksheet for the rightmost used column index (0-based)
 *  within the given row indices, stopping at maxScan to avoid bloated ranges. */
function xlsLastUsedCol(ws: XLSX.WorkSheet, rowIdxs: number[], maxScan = 40): number {
  let last = 0;
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const cap = Math.min(range.e.c, maxScan);
  for (const r of rowIdxs) {
    for (let c = cap; c >= 0; c--) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]?.v != null) { last = Math.max(last, c); break; }
    }
  }
  return last;
}

function buildBoqFallbackWithSheetJs(
  xlsWb: XLSX.WorkBook,
  lines: ExportLine[],
  revisions: ExportRevision[],
  measurements: ExportMeasurementBlock[],
): Buffer {
  const sorted = [...revisions].sort((a, b) => a.index - b.index);

  const rateChanged = new Set<number>();
  for (const s of lines) {
    for (const r of s.quantityRevisions) if (r.rate != null) rateChanged.add(r.revisionIndex);
  }

  type Col = { label: string; value: (s: ExportLine) => number };
  const cols: Col[] = [];
  for (const rev of sorted) {
    const name = rev.label || `Rev ${rev.index}`;
    cols.push({ label: name, value: (s) => effectiveQuantity(s, rev.index) });
    if (rateChanged.has(rev.index)) {
      cols.push({ label: `${name} Rate`, value: (s) => effectiveRate(s, rev.index) });
    }
  }
  cols.push({ label: 'New Final Price', value: (s) => effectiveQuantity(s) * effectiveRate(s) });

  const sourced = lines.filter((l) => l.sourceSheet && l.sourceRow != null);
  const bySheet = new Map<string, ExportLine[]>();
  for (const s of sourced) {
    const arr = bySheet.get(s.sourceSheet as string) ?? [];
    arr.push(s);
    bySheet.set(s.sourceSheet as string, arr);
  }

  // ── 1. Append revision columns to each original sheet ──────────────────────
  for (const [sheetName, sheetLines] of Array.from(bySheet.entries())) {
    const ws = xlsWb.Sheets[sheetName];
    if (!ws || !sheetLines.length || !cols.length) continue;

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    // All row indices are 0-based in SheetJS
    const dataRowIdxs = sheetLines.map((l) => l.sourceRow as number);
    const headerRowIdx = Math.max(0, Math.min(...dataRowIdxs) - 1);

    const rightmostCol = xlsLastUsedCol(ws, [headerRowIdx, ...dataRowIdxs]);
    const startColIdx = rightmostCol + 2; // leave one gap column

    // Write header labels
    cols.forEach((col, i) => {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c: startColIdx + i });
      ws[addr] = { t: 's', v: col.label };
    });

    // Write data values
    for (const l of sheetLines) {
      const rowIdx = l.sourceRow as number;
      cols.forEach((col, i) => {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c: startColIdx + i });
        ws[addr] = { t: 'n', v: round2(col.value(l)) ?? 0 };
      });
    }

    // Expand the declared range to include the new columns
    range.e.c = Math.max(range.e.c, startColIdx + cols.length - 1);
    ws['!ref'] = XLSX.utils.encode_range(range);

    // Widen the new columns in !cols so they don't appear squeezed
    const existingCols: XLSX.ColInfo[] = ws['!cols'] ?? [];
    while (existingCols.length <= startColIdx + cols.length - 1) existingCols.push({});
    cols.forEach((col, i) => {
      existingCols[startColIdx + i] = { wch: Math.max(col.label.length + 2, 14) };
    });
    ws['!cols'] = existingCols;
  }

  // ── 2. Extra Works tab ─────────────────────────────────────────────────────
  const extra = lines.filter((l) => !l.sourceSheet || l.sourceRow == null);
  if (extra.length) {
    const data: (string | number | null)[][] = [
      ['Extra Works (items not in the original BOQ)'],
      ['S. No.', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
    ];
    let n = 1;
    let subtotal = 0;
    let lastDomain = '';
    for (const l of extra) {
      if (l.domain !== lastDomain) { data.push([l.domain]); lastDomain = l.domain; }
      const qty = effectiveQuantity(l);
      const rate = effectiveRate(l);
      const amount = qty * rate;
      subtotal += amount;
      data.push([n++, l.title, l.unit ?? '', round2(qty), round2(rate), round2(amount)]);
    }
    data.push(['', 'Total', '', '', '', round2(subtotal)]);
    const extraWs = XLSX.utils.aoa_to_sheet(data);
    extraWs['!cols'] = [8, 55, 12, 12, 14, 16].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(xlsWb, extraWs, 'Extra Works');
  }

  // ── 3. Measurements tab ────────────────────────────────────────────────────
  if (measurements.length) {
    const data: (string | number | null)[][] = [
      ['Domain', 'Task', 'Subtask', 'Description', 'No', 'Length', 'Width', 'Height', 'Total'],
    ];
    for (const block of measurements) {
      for (const r of block.rows) {
        data.push([block.domain, block.task, block.lineTitle, r.description ?? '',
          r.no ?? '', r.length ?? '', r.width ?? '', r.height ?? '', round2(r.computed)]);
      }
      data.push(['', '', '', '', '', '', '', `Total ${block.unit ?? ''}`.trim(), round2(block.total)]);
    }
    const measWs = XLSX.utils.aoa_to_sheet(data);
    measWs['!cols'] = [22, 30, 34, 30, 8, 12, 12, 12, 14].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(xlsWb, measWs, 'Measurements');
  }

  // ── 4. Revisions tab ───────────────────────────────────────────────────────
  if (lines.length) {
    const head: (string | number)[] = ['Domain', 'Task', 'Description', 'Unit', 'Orig Qty', 'Orig Rate'];
    for (const rev of sorted) {
      const name = rev.label || `Rev ${rev.index}`;
      head.push(`${name} Qty`);
      if (rateChanged.has(rev.index)) head.push(`${name} Rate`);
    }
    head.push('Final Qty', 'Final Rate', 'Final Amount');
    const data: (string | number | null)[][] = [head];
    for (const l of lines) {
      const row: (string | number | null)[] = [
        l.domain, l.task, l.title, l.unit ?? '', round2(l.quantity ?? 0), round2(l.rate ?? 0),
      ];
      for (const rev of sorted) {
        row.push(round2(effectiveQuantity(l, rev.index)));
        if (rateChanged.has(rev.index)) row.push(round2(effectiveRate(l, rev.index)));
      }
      const fq = effectiveQuantity(l);
      const fr = effectiveRate(l);
      row.push(round2(fq), round2(fr), round2(fq * fr));
      data.push(row);
    }
    const revWs = XLSX.utils.aoa_to_sheet(data);
    revWs['!cols'] = [22, 28, 50, 14].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(xlsWb, revWs, 'Revisions');
  }

  return Buffer.from(XLSX.write(xlsWb, { type: 'buffer', bookType: 'xlsx' }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Path A: ExcelJS builder (Python COM / styled path only)
// ─────────────────────────────────────────────────────────────────────────────

async function buildBoqWithExcelJs(
  buffer: Buffer,
  lines: ExportLine[],
  revisions: ExportRevision[],
  measurements: ExportMeasurementBlock[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const sorted = [...revisions].sort((a, b) => a.index - b.index);

  const rateChanged = new Set<number>();
  for (const s of lines) {
    for (const r of s.quantityRevisions) if (r.rate != null) rateChanged.add(r.revisionIndex);
  }

  // ── 1. Inline revision columns on each original sheet ──────────────────────
  type Col = { label: string; value: (s: ExportLine) => number };
  const cols: Col[] = [];
  for (const rev of sorted) {
    const name = rev.label || `Rev ${rev.index}`;
    cols.push({ label: name, value: (s) => effectiveQuantity(s, rev.index) });
    if (rateChanged.has(rev.index)) {
      cols.push({ label: `${name} Rate`, value: (s) => effectiveRate(s, rev.index) });
    }
  }
  cols.push({ label: 'New Final Price', value: (s) => effectiveQuantity(s) * effectiveRate(s) });

  const sourced = lines.filter((l) => l.sourceSheet && l.sourceRow != null);
  const bySheet = new Map<string, ExportLine[]>();
  for (const s of sourced) {
    const arr = bySheet.get(s.sourceSheet as string) ?? [];
    arr.push(s);
    bySheet.set(s.sourceSheet as string, arr);
  }

  for (const [sheetName, sheetLines] of Array.from(bySheet.entries())) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws || !sheetLines.length || !cols.length) continue;

    const dataRows = sheetLines.map((l: ExportLine) => (l.sourceRow as number) + 1);
    const headerRow = Math.max(1, Math.min(...dataRows) - 1);
    const startCol = lastUsedColumn(ws, [headerRow, ...dataRows]) + 2;

    cols.forEach((c, i) => {
      const cell = ws.getRow(headerRow).getCell(startCol + i);
      cell.value = c.label;
      cell.font = { ...(cell.font ?? {}), bold: true };
      cell.fill = HEADER_FILL;
      cell.border = BORDER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      const col = ws.getColumn(startCol + i);
      if (!col.width || col.width < 14) col.width = c.label.length > 12 ? 16 : 14;
    });

    for (const l of sheetLines) {
      const excelRow = (l.sourceRow as number) + 1;
      cols.forEach((c, i) => {
        const cell = ws.getRow(excelRow).getCell(startCol + i);
        cell.value = round2(c.value(l));
        cell.border = BORDER;
        cell.numFmt = NUM_FMT;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      });
    }
  }

  // ── 2. Extra Works tab ─────────────────────────────────────────────────────
  const extra = lines.filter((l) => !l.sourceSheet || l.sourceRow == null);
  if (extra.length) {
    const ws = wb.addWorksheet('Extra Works');
    ws.columns = [{ width: 8 }, { width: 55 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 16 }];
    const boldRows: number[] = [];
    ws.addRow(['Extra Works (items not in the original BOQ)']);
    ws.mergeCells('A1:F1');
    boldRows.push(1);
    boldRows.push(ws.addRow(['S. No.', 'Description', 'Unit', 'Qty', 'Rate', 'Amount']).number);
    let n = 1;
    let subtotal = 0;
    let lastDomain = '';
    for (const l of extra) {
      if (l.domain !== lastDomain) {
        boldRows.push(ws.addRow([l.domain]).number);
        lastDomain = l.domain;
      }
      const qty = effectiveQuantity(l);
      const rate = effectiveRate(l);
      const amount = qty * rate;
      subtotal += amount;
      ws.addRow([n++, l.title, l.unit ?? '', round2(qty), round2(rate), round2(amount)]);
    }
    boldRows.push(ws.addRow(['', 'Total', '', '', '', round2(subtotal)]).number);
    gridTab(ws, boldRows);
  }

  // ── 3. Measurements tab ────────────────────────────────────────────────────
  if (measurements.length) {
    const ws = wb.addWorksheet('Measurements');
    ws.columns = [
      { width: 22 }, { width: 30 }, { width: 34 }, { width: 30 },
      { width: 8 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 },
    ];
    const boldRows: number[] = [];
    boldRows.push(ws.addRow(['Domain', 'Task', 'Subtask', 'Description', 'No', 'Length', 'Width', 'Height', 'Total']).number);
    for (const block of measurements) {
      for (const r of block.rows) {
        ws.addRow([
          block.domain, block.task, block.lineTitle, r.description ?? '',
          r.no ?? '', r.length ?? '', r.width ?? '', r.height ?? '', round2(r.computed),
        ]);
      }
      const totalLabel = `Total ${block.unit ?? ''}`.trim();
      boldRows.push(ws.addRow(['', '', '', '', '', '', '', totalLabel, round2(block.total)]).number);
    }
    gridTab(ws, boldRows);
  }

  // ── 4. Revisions tab ───────────────────────────────────────────────────────
  if (lines.length) {
    const ws = wb.addWorksheet('Revisions');
    const head: (string | number)[] = ['Domain', 'Task', 'Description', 'Unit', 'Orig Qty', 'Orig Rate'];
    for (const rev of sorted) {
      const name = rev.label || `Rev ${rev.index}`;
      head.push(`${name} Qty`);
      if (rateChanged.has(rev.index)) head.push(`${name} Rate`);
    }
    head.push('Final Qty', 'Final Rate', 'Final Amount');
    const headerNum = ws.addRow(head).number;

    for (const l of lines) {
      const row: (string | number | null)[] = [
        l.domain, l.task, l.title, l.unit ?? '', round2(l.quantity ?? 0), round2(l.rate ?? 0),
      ];
      for (const rev of sorted) {
        row.push(round2(effectiveQuantity(l, rev.index)));
        if (rateChanged.has(rev.index)) row.push(round2(effectiveRate(l, rev.index)));
      }
      const fq = effectiveQuantity(l);
      const fr = effectiveRate(l);
      row.push(round2(fq), round2(fr), round2(fq * fr));
      ws.addRow(row);
    }
    ws.columns.forEach((c, i) => { c.width = i === 0 ? 22 : i === 1 ? 28 : i === 2 ? 50 : 14; });
    gridTab(ws, [headerNum]);
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the finished workbook as a Buffer.
 */
export async function buildBoqExportWorkbook(
  originalBuf: Buffer,
  lines: ExportLine[],
  revisions: ExportRevision[],
  measurements: ExportMeasurementBlock[],
): Promise<Buffer> {
  const { buffer, isStyled, xlsWb } = ensureXlsxBuffer(originalBuf);

  if (!isStyled && xlsWb) {
    // SheetJS fallback — keep everything in SheetJS to avoid ExcelJS XML corruption
    return buildBoqFallbackWithSheetJs(xlsWb, lines, revisions, measurements);
  }

  // Python COM path — ExcelJS round-trips the styled xlsx cleanly
  return buildBoqWithExcelJs(buffer, lines, revisions, measurements);
}
