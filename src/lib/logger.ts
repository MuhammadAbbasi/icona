// Persistent server-side logging. Patches console.* once per process so every
// existing console.log/warn/error call across the app (auth, mail, BOQ import,
// ledger, etc.) is also written to a rotating daily file under ./logs — without
// touching the ~90 call sites already scattered through the API routes.
// Imported for its side effect by prisma.ts, which every server module already
// pulls in, so this runs exactly once per server process with no new wiring.
import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = process.env.LOG_DIR ? path.resolve(process.env.LOG_DIR) : path.resolve(process.cwd(), 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true }); // once per process, not once per log line

// One append-mode write stream per day, reused across calls — avoids a
// blocking fs.appendFileSync (and its own mkdir check) on every console.* call,
// which would otherwise stall the event loop for the whole process on every
// request, not just the one logging.
// ponytail: no rotation/cleanup — daily files accumulate forever; sweep files
// older than N days from the existing cron route if disk usage becomes a problem.
let currentDay = '';
let stream: fs.WriteStream | null = null;

function writeStreamFor(day: string): fs.WriteStream {
  if (stream && currentDay === day) return stream;
  stream?.end();
  currentDay = day;
  stream = fs.createWriteStream(path.join(LOG_DIR, `app-${day}.log`), { flags: 'a' });
  return stream;
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function appendLine(level: string, args: unknown[]) {
  try {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, rotates daily
    const line = `[${new Date().toISOString()}] [${level}] ${args.map(formatArg).join(' ')}\n`;
    writeStreamFor(day).write(line);
  } catch {
    // Logging must never crash the app — drop the line if the disk write fails.
    // On read-only filesystems (e.g. Vercel) this silently no-ops, which is correct.
  }
}

// Explicit structured logging for new code; console.* keeps working as-is for everything else.
export const logger = {
  info: (...args: unknown[]) => appendLine('INFO', args),
  warn: (...args: unknown[]) => appendLine('WARN', args),
  error: (...args: unknown[]) => appendLine('ERROR', args),
};

declare global {
  // eslint-disable-next-line no-var
  var __iconaLoggerPatched: boolean | undefined;
}

if (!globalThis.__iconaLoggerPatched) {
  globalThis.__iconaLoggerPatched = true;

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args: unknown[]) => { original.log(...args); appendLine('LOG', args); };
  console.info = (...args: unknown[]) => { original.info(...args); appendLine('INFO', args); };
  console.warn = (...args: unknown[]) => { original.warn(...args); appendLine('WARN', args); };
  console.error = (...args: unknown[]) => { original.error(...args); appendLine('ERROR', args); };
}
