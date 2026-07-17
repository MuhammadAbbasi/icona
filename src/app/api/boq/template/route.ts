import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

// Sample BOQ workbook in exactly the layout the importer parses:
// one sheet per domain, a title row, a header row, task rows (no qty/rate),
// and priced subtask lines beneath them.
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
  ],
};

export async function GET() {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(SHEETS)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 48 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="ICONA-BOQ-Template.xlsx"',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
