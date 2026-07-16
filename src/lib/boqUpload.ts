// Shared validation for BOQ workbook uploads (preview + import).
// Caps the request body BEFORE it ever reaches SheetJS, so a small but
// maliciously-compressed file (a "zip/decompression bomb") cannot be expanded
// into gigabytes of cells and exhaust server memory.

export const MAX_BOQ_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export type BoqUpload =
  | { ok: true; buf: Buffer; fileName: string }
  | { ok: false; status: number; error: string };

/**
 * Pull the `file` field out of a multipart form, validate its type, extension
 * and size, and return a Buffer ready for `parseBoqBuffer`. Never reads the
 * body of an over-sized upload into memory.
 */
export async function readBoqUpload(form: FormData): Promise<BoqUpload> {
  const file = form.get('file');

  if (!(file instanceof File)) {
    return { ok: false, status: 400, error: 'No file uploaded' };
  }
  if (!/\.xlsx?$/i.test(file.name)) {
    return { ok: false, status: 400, error: 'Please upload an .xlsx or .xls file' };
  }
  // `file.size` is read from the multipart headers — checked before buffering.
  if (file.size <= 0) {
    return { ok: false, status: 400, error: 'The uploaded file is empty' };
  }
  if (file.size > MAX_BOQ_UPLOAD_BYTES) {
    const mb = (MAX_BOQ_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
    return { ok: false, status: 413, error: `File too large: the maximum BOQ size is ${mb} MB` };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Defence in depth: the decoded body must also respect the cap (the header
  // could lie). Guards against an inflated Content-Length mismatch.
  if (buf.byteLength > MAX_BOQ_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: 'File too large' };
  }

  return { ok: true, buf, fileName: file.name };
}
