// A measurement line's quantity contribution. Dimensions left blank count as 1
// so a 1-D length, a 2-D area, or a 3-D volume all work (matching how BOQ
// measurement sheets are written). A fully empty row contributes 0.
export interface MeasurementInput {
  description?: string | null;
  no?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function computeMeasurement(row: MeasurementInput): number {
  const no = num(row.no);
  const length = num(row.length);
  const width = num(row.width);
  const height = num(row.height);
  if (no == null && length == null && width == null && height == null) return 0;
  const product = (no ?? 1) * (length ?? 1) * (width ?? 1) * (height ?? 1);
  return Number.isFinite(product) ? Math.round(product * 1000) / 1000 : 0;
}

/** Normalize a raw row into stored fields (nulls for blanks) plus `computed`. */
export function normalizeMeasurement(row: MeasurementInput, order: number) {
  return {
    description: row.description ? String(row.description) : null,
    no: num(row.no),
    length: num(row.length),
    width: num(row.width),
    height: num(row.height),
    computed: computeMeasurement(row),
    order,
  };
}
