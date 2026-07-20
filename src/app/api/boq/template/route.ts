import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

// Sample BOQ workbook in exactly the layout the importer parses: one sheet per
// domain, a title row, a header row, task (group) rows with no qty/rate, and
// priced subtask lines beneath them. Styled to match the ICONA brand so the
// download itself looks like a real deliverable, not a bare data dump.
const BRAND = {
  navy: 'FF0F172A',
  blue: 'FF2563EB',
  blueLight: 'FFDBEAFE',
  grayLight: 'FFF1F5F9',
  border: 'FFCBD5E1',
  white: 'FFFFFFFF',
};

const SHEETS: Record<string, (string | number)[][]> = {
  'Civil Works': [
    ['CIVIL WORKS'],
    ['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
    ['1', 'Earthwork', '', '', '', ''],
    ['1.1', 'Excavation in foundation up to required depth', 'cft', 4500, 25, 112500],
    ['1.2', 'Backfilling with excavated earth, compacted', 'cft', 3200, 15, 48000],
    ['2', 'Concrete Works', '', '', '', ''],
    ['2.1', 'PCC 1:4:8 under foundations', 'cft', 850, 320, 272000],
    ['2.2', 'RCC 1:2:4 in columns and beams', 'cft', 1200, 580, 696000],
    ['3', 'Masonry', '', '', '', ''],
    ['3.1', '9" brick masonry in 1:6 cement mortar', 'cft', 2600, 190, 494000],
  ],
  'Electrical Works': [
    ['ELECTRICAL WORKS'],
    ['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
    ['1', 'Wiring & Conduits', '', '', '', ''],
    ['1.1', 'PVC conduit 20mm recessed in wall/slab', 'rft', 3800, 85, 323000],
    ['1.2', '3/29 copper wiring in conduit', 'rft', 3800, 120, 456000],
    ['2', 'Fixtures', '', '', '', ''],
    ['2.1', 'Supply & fix switch socket outlets', 'nos', 120, 950, 114000],
    ['2.2', 'Supply & fix LED panel light 18W', 'nos', 85, 1450, 123250],
  ],
  'Plumbing & Sanitary': [
    ['PLUMBING & SANITARY'],
    ['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
    ['1', 'Water Supply', '', '', '', ''],
    ['1.1', 'UPVC pipe 3/4" for cold water supply', 'rft', 1400, 110, 154000],
    ['1.2', 'CPVC pipe 1/2" for hot water supply', 'rft', 900, 140, 126000],
    ['2', 'Drainage & Fixtures', '', '', '', ''],
    ['2.1', 'PVC drain pipe 4" with fittings', 'rft', 620, 260, 161200],
    ['2.2', 'Supply & fix wash basin with fittings', 'nos', 14, 18500, 259000],
  ],
  'Air Conditioning': [
    ['AIR CONDITIONING'],
    ['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
    ['1', 'Ducting', '', '', '', ''],
    ['1.1', 'GI sheet ducting, insulated', 'sft', 1800, 340, 612000],
    ['2', 'Equipment', '', '', '', ''],
    ['2.1', 'Split AC unit 1.5 ton, supply & install', 'nos', 18, 145000, 2610000],
  ],
  'IT & Telecom': [
    ['IT & TELECOM'],
    ['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
    ['1', 'Structured Cabling', '', '', '', ''],
    ['1.1', 'Cat6 data cable, in conduit', 'rft', 2200, 65, 143000],
    ['1.2', 'Data outlet with faceplate, supply & fix', 'nos', 40, 1200, 48000],
    ['2', 'Network Equipment', '', '', '', ''],
    ['2.1', '24-port network switch, supply & install', 'nos', 3, 42000, 126000],
  ],
  'Security Systems': [
    ['SECURITY SYSTEMS'],
    ['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
    ['1', 'CCTV', '', '', '', ''],
    ['1.1', 'IP dome camera, supply & install', 'nos', 22, 18500, 407000],
    ['1.2', 'NVR 16-channel with 4TB storage', 'nos', 2, 65000, 130000],
    ['2', 'Access Control', '', '', '', ''],
    ['2.1', 'Card reader access control point', 'nos', 6, 32000, 192000],
  ],
};

const COL_WIDTHS = [8, 52, 8, 10, 12, 14];

export async function GET() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ICONA';
  wb.created = new Date();

  for (const [sheetName, rows] of Object.entries(SHEETS)) {
    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 2 }] });
    ws.columns = COL_WIDTHS.map((width) => ({ width }));

    rows.forEach((rowValues, i) => {
      const row = ws.addRow(rowValues);
      const rowNum = i + 1;

      if (rowNum === 1) {
        // Title band: full-width dark navy, merged, white bold text.
        ws.mergeCells(1, 1, 1, COL_WIDTHS.length);
        row.height = 26;
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.navy } };
          cell.font = { bold: true, color: { argb: BRAND.white }, size: 13 };
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        });
        return;
      }

      if (rowNum === 2) {
        // Column header row: brand blue fill, white bold text, borders.
        row.height = 20;
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.blue } };
          cell.font = { bold: true, color: { argb: BRAND.white }, size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = borderAll(BRAND.border);
        });
        return;
      }

      const isGroupHeader = !rowValues[3] && !rowValues[4]; // no qty/rate = a section/group row
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.border = borderAll(BRAND.border);
        cell.font = { bold: isGroupHeader, size: 10 };
        if (isGroupHeader) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.blueLight } };
        } else if ((i - 2) % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.grayLight } };
        }
        if (colNum === 2) cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        else if (colNum === 1) cell.alignment = { vertical: 'middle', horizontal: 'center' };
        else cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if ((colNum === 5 || colNum === 6) && !isGroupHeader) cell.numFmt = '#,##0';
        if (colNum === 4 && !isGroupHeader) cell.numFmt = '#,##0';
      });
    });
  }

  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="ICONA-BOQ-Template.xlsx"',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

function borderAll(argb: string): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb } };
  return { top: side, left: side, bottom: side, right: side };
}
