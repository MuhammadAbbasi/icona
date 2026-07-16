import * as XLSX from 'xlsx';

/**
 * Intelligent BOQ (Bill of Quantities) Excel parser.
 *
 * Maps an arbitrary BOQ workbook onto the app hierarchy:
 *   Sheet            → Domain   (e.g. "A - CIVIL WORKS", "Electrical Works")
 *   SECTION / N.     → Task     (e.g. "1. Dismantling", "5. PCC Works")
 *   a) b) / lines    → Subtask  (description + unit + quantity + rate)
 *
 * Unlike the predefined template import, the Excel import keeps quantity & rate
 * so amounts (quantity × rate) roll up to task / domain / project.
 */

export interface ParsedSubtask {
  title: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number;
  sourceSheet: string;   // origin worksheet (for exact-layout export)
  sourceRow: number;     // origin 0-based absolute row in that worksheet
}
export interface ParsedTask {
  title: string;
  subtasks: ParsedSubtask[];
  amount: number;
}
export interface ParsedDomain {
  name: string;
  color: string;
  tasks: ParsedTask[];
  amount: number;
  subtaskCount: number;
}
export interface ParsedBoq {
  domains: ParsedDomain[];
  totalAmount: number;
  domainCount: number;
  taskCount: number;
  subtaskCount: number;
}

const DOMAIN_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const TOP_LEVEL = /^\d+(\.0)?\.?$/; // 1, 2, 10, 1., 1.0 …

// Upper bound on the cells we will materialize across the whole workbook.
// A 5 MB file decodes to far fewer real BOQ cells than this; the cap only
// trips on a deliberately inflated sheet range (decompression-bomb defence).
const MAX_TOTAL_CELLS = 500_000;

/** Number of cells in a worksheet's declared range (`!ref`), 0 if unbounded. */
function sheetCellCount(ws: XLSX.WorkSheet): number {
  const ref = ws['!ref'];
  if (!ref) return 0;
  const r = XLSX.utils.decode_range(ref);
  const rows = r.e.r - r.s.r + 1;
  const cols = r.e.c - r.s.c + 1;
  return rows > 0 && cols > 0 ? rows * cols : 0;
}

type Row = unknown[];

function clean(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

/** Convert a cell to a number, sanitizing currency strings ("13,546,793" → 13546793). */
function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = clean(v).toLowerCase();
  if (!s || s.includes('rate only') || s.includes('lump')) return null;
  const stripped = s.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (!stripped || stripped === '-' || stripped === '.') return null;
  const n = parseFloat(stripped);
  return Number.isFinite(n) ? n : null;
}


function sectionTitle(text: string): string {
  if (text.includes(':')) return clean(text.split(':').slice(1).join(':'));
  return clean(text.replace(/^section\s*-?\s*[a-z]?\s*/i, ''));
}

// Note / remarks header rows are not work items — skip them on import.
function isNoteRow(desc: string): boolean {
  const d = desc.toLowerCase().replace(/[:.\s]+$/, '').trim();
  return /^(general\s+notes?|notes?|note|n\.?\s*b\.?|remarks?|general)$/.test(d);
}

/**
 * Distinguish a category/section heading ("O.H Tank", "Floor Drain", "Man Hole")
 * from a priced work line. A heading is a SHORT label; a work line is a long
 * descriptive sentence. We rely only on that structural difference — length —
 * not on any wording, verb list or language, so it holds across different
 * companies' BOQ house styles. Together with its caller's guards (the row
 * carries its own serial and no price) this lets a heading open its own Task so
 * the priced items beneath it nest under it, instead of leaking onto the
 * previous task or surfacing as a stray top-level row.
 */
function isSectionHeader(desc: string): boolean {
  const d = clean(desc).replace(/[:.]+$/, '').trim();
  if (!d) return false;
  const words = d.split(/\s+/).filter(Boolean);
  return words.length <= 6 && d.length <= 48;   // headings are short labels
}

function normalizeHeaderVal(v: unknown): string {
  return clean(v).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Check if a normalized string matches a column type exactly
const headerMatchers = {
  sno: (s: string) => /^(sno|srno|sr|no|serialno|serialnumber)$/.test(s),
  desc: (s: string) => /^(description|particulars|particular|item|items|workdescription|itemdescription)$/.test(s),
  unit: (s: string) => /^(unit|units)$/.test(s),
  qty: (s: string) => /^(qty|quantity|quantities|volume|nos)$/.test(s),
  rate: (s: string) => /^(rate|rates|unitrate|unitprice|price|unitcost)$/.test(s),
  amount: (s: string) => /^(amount|amounts|totalamount|totalprice|total|cost)$/.test(s),
};

// Generous matchers that look for substring matches for column mapping
const columnContains = {
  sno: (s: string) => s.includes('sno') || s.includes('srno') || s === 'sr' || s === 'no' || s.includes('serial'),
  desc: (s: string) => s.includes('description') || s.includes('particular') || s === 'item' || s === 'items',
  unit: (s: string) => s.includes('unit'),
  qty: (s: string) => s.includes('qty') || s.includes('quantity') || s.includes('volume') || s === 'nos',
  rate: (s: string) => s.includes('rate') || s.includes('price') || s.includes('cost'),
  amount: (s: string) => s.includes('amount') || s.includes('total') || s === 'cost',
};

function getRowHeaderScore(row: Row): number {
  if (!row) return 0;
  let score = 0;
  row.forEach(cell => {
    const norm = normalizeHeaderVal(cell);
    if (!norm) return;
    if (headerMatchers.sno(norm)) score += 1;
    if (headerMatchers.desc(norm)) score += 2;
    if (headerMatchers.unit(norm)) score += 1;
    if (headerMatchers.qty(norm)) score += 1;
    if (headerMatchers.rate(norm)) score += 1;
    if (headerMatchers.amount(norm)) score += 1;
  });
  return score;
}

interface Cols { sno: number; desc: number; unit: number; qty: number; rate: number; }

function detectCols(rows: Row[]): { cols: Cols; headerIdx: number } {
  let bestIdx = 0;
  let maxScore = -1;
  const scores: number[] = [];
  
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const score = getRowHeaderScore(rows[i]);
    scores.push(score);
    if (score > maxScore) {
      maxScore = score;
      bestIdx = i;
    }
  }

  // If no row has a score > 0, fallback to default first row and default cols
  if (maxScore <= 0) {
    return {
      cols: { sno: 0, desc: 1, unit: 2, qty: 3, rate: 4 },
      headerIdx: 0
    };
  }

  let startHeaderRow = bestIdx;
  while (startHeaderRow > 0 && scores[startHeaderRow - 1] >= 1) {
    startHeaderRow--;
  }

  let endHeaderRow = bestIdx;
  while (endHeaderRow < Math.min(14, rows.length - 1) && scores[endHeaderRow + 1] >= 1) {
    endHeaderRow++;
  }

  const maxCols = Math.max(...rows.slice(0, 15).map(r => r ? r.length : 0), 0);
  const virtualHeader: string[] = [];
  
  for (let c = 0; c < maxCols; c++) {
    let combined = '';
    for (let r = startHeaderRow; r <= endHeaderRow; r++) {
      combined += ' ' + clean(rows[r]?.[c]);
    }
    virtualHeader.push(combined.trim());
  }

  const findCol = (check: (s: string) => boolean, fallback: number) => {
    const i = virtualHeader.findIndex(val => check(normalizeHeaderVal(val)));
    return i >= 0 ? i : fallback;
  };

  return {
    cols: {
      sno: findCol(columnContains.sno, 0),
      desc: findCol(columnContains.desc, 1),
      unit: findCol(columnContains.unit, 2),
      qty: findCol(columnContains.qty, 3),
      rate: findCol(columnContains.rate, 4),
    },
    headerIdx: bestIdx
  };
}

function domainNameFrom(rows: Row[], headerIdx: number, sheetName: string): string {
  for (let i = 0; i < headerIdx; i++) {
    const t = clean(rows[i]?.[0]);
    if (t && !/^bill of quantities$/i.test(t)) {
      // strip a leading "A - " / "G-" letter prefix and any trailing ":"
      return t.replace(/^[A-Za-z]\s*[-–]\s*/, '').replace(/:.*$/, '').trim() || sheetName;
    }
  }
  return sheetName.replace(/[-_]?branch$/i, '').trim() || sheetName;
}

function parseSheet(rows: Row[], sheetName: string, colorIndex: number, baseRow: number, includeZeroQty = false): ParsedDomain[] {
  if (!rows.length) return [];

  const { cols, headerIdx } = detectCols(rows);
  const sheetClean = domainNameFrom(rows, headerIdx, sheetName);

  // Skip summary / cover sheets — they list domains, not tasks.
  if (/summary|cover|index/i.test(sheetClean) || /summary|cover|index/i.test(sheetName)) return [];

  const data = rows.slice(headerIdx + 1);

  const domains: ParsedDomain[] = [];
  let currentDomain: ParsedDomain | null = null;
  let currentTask: ParsedTask | null = null;
  let currentSection = '';
  let groupLabel = '';
  let groupSno = '';
  let colorOffset = colorIndex;

  const openDomain = (dName: string) => {
    currentDomain = {
      name: dName || sheetClean,
      color: DOMAIN_COLORS[colorOffset % DOMAIN_COLORS.length],
      tasks: [],
      amount: 0,
      subtaskCount: 0,
    };
    domains.push(currentDomain);
    colorOffset++;
    currentTask = null;
    groupLabel = '';
    groupSno = '';
  };

  const openTask = (tTitle: string) => {
    if (!currentDomain) {
      openDomain(sheetClean);
    }
    let fullTitle = tTitle;
    if (currentSection) {
      if (!tTitle || tTitle.toLowerCase() === 'general') {
        fullTitle = currentSection;
      } else {
        fullTitle = `${currentSection} - ${tTitle}`;
      }
    } else if (!fullTitle) {
      fullTitle = 'General';
    }
    currentTask = {
      title: fullTitle,
      subtasks: [],
      amount: 0,
    };
    currentDomain!.tasks.push(currentTask);
    groupLabel = '';
    groupSno = '';
  };

  // Start with a single domain representing the sheet
  openDomain(sheetClean);

  for (let di = 0; di < data.length; di++) {
    const r = (data[di] ?? []) as Row;
    // Absolute 0-based row in the original worksheet, so export can write back
    // into the exact source row. `data` began at headerIdx + 1 within the range
    // that itself started at `baseRow`.
    const sourceRow = baseRow + headerIdx + 1 + di;
    const sno = clean(r[cols.sno]);
    const desc = clean(r[cols.desc]);
    if (!sno && !desc) continue;

    const head = (sno || desc).toUpperCase();
    if (head.startsWith('TOTAL')) continue;
    if (isNoteRow(desc)) continue;

    // A row starting with "SECTION" updates the active section name and resets the active task
    if (sno.toUpperCase().startsWith('SECTION') || desc.toUpperCase().startsWith('SECTION')) {
      currentSection = sectionTitle(sno || desc);
      currentTask = null;
      continue;
    }

    const quantity = toNumber(r[cols.qty]);
    const rate = toNumber(r[cols.rate]);
    const unitStr = clean(r[cols.unit]);
    const isPriced = !!desc && (
      (quantity !== null && quantity !== 0) ||
      (rate !== null && rate !== 0)
    );
    // With includeZeroQty on, a described row with a unit (Sft/Cft/Job/No/Rft…)
    // is a real BOQ line even at 0 qty/rate. A unit is the reliable tell: section
    // headers ("PCC Works", "RCC Works") carry no unit, so they stay as headers.
    const isSubtask = isPriced || (includeZeroQty && !!desc && !!unitStr);
    const unit = isSubtask ? (unitStr || null) : null;
    const amount = (quantity ?? 0) * (rate ?? 0);

    const isTopLevelSno = TOP_LEVEL.test(sno);

    // Build item title, keeping the original serial number prefix consistently
    let title = desc;
    if (sno) {
      title = `${sno} ${desc}`.trim();
    }

    // Bare continuation rows (no S.No) inherit the preceding sub-header's text
    if (!sno && groupLabel && desc) {
      title = `${groupSno ? groupSno + ' ' : ''}${groupLabel} - ${desc}`;
    }

    // A top-level group identifier (like 1., 2., 3.) opens a new Task
    if (isTopLevelSno) {
      openTask(title);
      if (isSubtask) {
        currentTask!.subtasks.push({
          title,
          description: desc || null,
          unit,
          quantity,
          rate,
          amount,
          sourceSheet: sheetName,
          sourceRow,
        });
      }
      continue;
    }

    // A short, label-like enumerated row with no price is a category SECTION
    // header (e.g. "i  O.H Tank", "h  Floor Drain") — it opens its own Task so
    // the priced items beneath it nest under it, instead of leaking onto the
    // previous task or being promoted to a stray top-level row.
    if (sno && !isSubtask && isSectionHeader(desc)) {
      openTask(desc);
      continue;
    }

    // A labelled but unpriced row acts as a sub-header
    if (sno) {
      groupLabel = isSubtask ? '' : desc;
      groupSno = isSubtask ? '' : sno;
    }

    // Add cost row as subtask under the active task
    if (isSubtask) {
      if (!currentTask) {
        openTask((currentDomain as any)?.name || 'General');
      }
      currentTask!.subtasks.push({
        title,
        description: desc || null,
        unit,
        quantity,
        rate,
        amount,
        sourceSheet: sheetName,
        sourceRow,
      });
    }
  }

  // Filter out empty domains/tasks and compute rollup sums
  const finalDomains: ParsedDomain[] = [];
  for (const d of domains) {
    const keptTasks = d.tasks.filter((t) => t.subtasks.length > 0);
    if (keptTasks.length > 0) {
      for (const t of keptTasks) {
        t.amount = t.subtasks.reduce((sum, s) => sum + s.amount, 0);
      }
      d.tasks = keptTasks;
      d.amount = keptTasks.reduce((sum, t) => sum + t.amount, 0);
      d.subtaskCount = keptTasks.reduce((sum, t) => sum + t.subtasks.length, 0);
      finalDomains.push(d);
    }
  }

  return finalDomains;
}

export function parseBoqBuffer(buf: ArrayBuffer | Buffer, opts: { includeZeroQty?: boolean } = {}): ParsedBoq {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const domains: ParsedDomain[] = [];
  let cellBudget = MAX_TOTAL_CELLS;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    // Refuse to materialize a sheet whose declared range would blow the budget.
    cellBudget -= sheetCellCount(ws);
    if (cellBudget < 0) {
      throw new Error('BOQ workbook is too large to process');
    }
    // `blankrows: true` keeps the array index aligned with the sheet rows so we
    // can record each line's absolute source row (offset by the range start).
    const baseRow = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.r : 0;
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, blankrows: true, defval: null });
    const parsedDomains = parseSheet(rows, sheetName, domains.length, baseRow, opts.includeZeroQty);
    for (const d of parsedDomains) {
      domains.push(d);
    }
  }
  return {
    domains,
    totalAmount: domains.reduce((s, d) => s + d.amount, 0),
    domainCount: domains.length,
    taskCount: domains.reduce((s, d) => s + d.tasks.length, 0),
    subtaskCount: domains.reduce((s, d) => s + d.subtaskCount, 0),
  };
}
