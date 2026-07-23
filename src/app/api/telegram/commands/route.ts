import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registerTelegramCommands } from '@/lib/telegram';

// GET or POST to sync native Telegram command menus
export async function GET() {
  const result = await registerTelegramCommands();
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await registerTelegramCommands();
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
