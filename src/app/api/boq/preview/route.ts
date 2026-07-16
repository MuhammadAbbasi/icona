import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseBoqBuffer } from '@/lib/boqParser';
import { readBoqUpload } from '@/lib/boqUpload';

export const runtime = 'nodejs';

// Parse an uploaded BOQ workbook and return the detected hierarchy + estimated
// amounts for the import preview. Does NOT touch the database.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const upload = await readBoqUpload(form);
    if (!upload.ok) {
      return NextResponse.json({ error: upload.error }, { status: upload.status });
    }

    const includeZeroQty = form.get('includeZeroQty') === 'true';
    const parsed = parseBoqBuffer(upload.buf, { includeZeroQty });

    if (!parsed.domainCount) {
      return NextResponse.json({ error: 'No BOQ domains detected in this workbook' }, { status: 422 });
    }
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error('[POST /api/boq/preview]', e);
    return NextResponse.json({ error: 'Could not parse the workbook' }, { status: 500 });
  }
}
