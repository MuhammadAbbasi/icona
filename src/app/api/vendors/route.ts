import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(vendors);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
