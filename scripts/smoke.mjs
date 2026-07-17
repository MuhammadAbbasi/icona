// ICONA smoke test: crawls every page route and drives the core API flows
// (companies, project + domain/task/subtask, transaction, photo upload, search).
// Run with the dev server up:  node scripts/smoke.mjs
// Env: SMOKE_BASE (default http://localhost:4266), SMOKE_EMAIL / SMOKE_PASS.
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4266';
const EMAIL = process.env.SMOKE_EMAIL || 'e2e-check@icona-dev.test';
const PASS = process.env.SMOKE_PASS || 'Passw0rd!e2e';

const jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
const store = (res) => {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
  }
};
async function req(p, opts = {}) {
  const res = await fetch(BASE + p, {
    redirect: 'manual',
    ...opts,
    headers: { cookie: cookieHeader(), ...(opts.headers || {}) },
  });
  store(res);
  return res;
}

const results = [];
const record = (name, ok, note = '') => {
  results.push({ name, ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
};
const jsonNote = async (res) => {
  try { const j = await res.json(); return j.error || j.message || ''; } catch { return ''; }
};

// ── auth ────────────────────────────────────────────────────────────────────
async function login() {
  const csrfRes = await req('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();
  const res = await req('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, json: 'true' }),
  });
  const ok = res.ok && jar.has('next-auth.session-token');
  record('auth: credentials login', ok, ok ? '' : `HTTP ${res.status}`);
  return ok;
}

// ── page crawl ──────────────────────────────────────────────────────────────
function pageRoutes() {
  const root = path.join(process.cwd(), 'src', 'app');
  const routes = [];
  (function walk(dir, segs) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) {
        if (e.name === 'page.tsx') routes.push('/' + segs.filter((s) => !s.startsWith('(')).join('/'));
        continue;
      }
      if (e.name === 'api' && segs.length === 0) continue;
      walk(path.join(dir, e.name), [...segs, e.name]);
    }
  })(root, []);
  return [...new Set(routes)].sort();
}

async function crawlPages(dynamicIds) {
  for (const route of pageRoutes()) {
    let target = route;
    if (route.includes('[')) {
      const sub = Object.entries(dynamicIds).find(([prefix]) => route.startsWith(prefix));
      if (!sub) { record(`page ${route}`, true, 'skipped (no test id)'); continue; }
      target = route.replace(/\[[^\]]+\]/, sub[1]);
    }
    const res = await req(target);
    const redirected = res.status >= 300 && res.status < 400;
    const note = redirected ? `redirects to ${res.headers.get('location')}` : res.ok ? '' : `HTTP ${res.status}`;
    record(`page ${target}`, res.ok || redirected, note);
  }
}

// ── api flows ───────────────────────────────────────────────────────────────
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function apiFlows() {
  const ids = {};

  // companies
  let res = await req('/api/companies');
  const companies = res.ok ? await res.json() : [];
  record('api: list companies', res.ok, res.ok ? `${companies.length} found` : `HTTP ${res.status}`);
  const mainCompany = companies.find((c) => c.type === 'MAIN') ?? companies[0];

  res = await req('/api/companies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `Smoke Client ${Date.now()}`, type: 'CLIENT', email: `smoke-${Date.now()}@test.dev` }),
  });
  const company = res.ok ? await res.json() : null;
  record('api: create company', res.ok, res.ok ? '' : await jsonNote(res));
  if (company) ids['/companies/'] = company.id;

  // project with one domain (owned by MAIN so the smoke client stays deletable)
  res = await req('/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: `Smoke Project ${Date.now()}`,
      companyId: mainCompany?.id,
      domains: [{ name: 'Smoke Domain' }],
    }),
  });
  const project = res.ok ? await res.json() : null;
  record('api: create project', res.ok, res.ok ? '' : await jsonNote(res));
  if (!project) return ids;
  ids['/projects/'] = project.id;

  // hierarchy: find the domain id via the hierarchy endpoint
  res = await req(`/api/mobile/projects/${project.id}/hierarchy`);
  const detail = res.ok ? await res.json() : null;
  const domain = detail?.domains?.[0] ?? detail?.project?.domains?.[0];
  record('api: read project hierarchy', !!domain, domain ? '' : `HTTP ${res.status}`);

  // task + subtask
  let task = null;
  if (domain) {
    res = await req('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domainId: domain.id, title: 'Smoke Task' }),
    });
    const t = res.ok ? await res.json() : null;
    task = t?.task ?? t;
    record('api: create task', res.ok, res.ok ? '' : await jsonNote(res));
  }
  if (task) {
    res = await req('/api/subtasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, title: 'Smoke Subtask' }),
    });
    record('api: create subtask', res.ok, res.ok ? '' : await jsonNote(res));
  }

  // BOQ: generate a small workbook, preview it, then import into the project
  try {
    const XLSX = (await import('xlsx')).default;
    const ws = XLSX.utils.aoa_to_sheet([
      ['CIVIL WORKS'],
      ['S.No', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'],
      ['1', 'Earthwork', '', '', '', ''],
      ['1.1', 'Excavation in foundation', 'cft', 100, 50, 5000],
      ['1.2', 'Backfilling', 'cft', 80, 30, 2400],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Civil Works');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    let fd = new FormData();
    fd.append('file', blob, 'smoke-boq.xlsx');
    res = await req('/api/boq/preview', { method: 'POST', body: fd });
    const preview = res.ok ? await res.json() : null;
    record('api: BOQ preview', res.ok && (preview?.domainCount ?? preview?.domains?.length ?? 0) > 0,
      res.ok ? `${preview?.domainCount ?? preview?.domains?.length} domain(s)` : await jsonNote(res));

    fd = new FormData();
    fd.append('file', blob, 'smoke-boq.xlsx');
    fd.append('includeZeroQty', 'false');
    res = await req(`/api/projects/${project.id}/import-boq`, { method: 'POST', body: fd });
    record('api: BOQ import', res.ok, res.ok ? '' : await jsonNote(res));
  } catch (e) {
    record('api: BOQ flow', false, e.message);
  }

  // transaction
  res = await req(`/api/projects/${project.id}/transactions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'INCOME', amount: 1000, description: 'Smoke income' }),
  });
  record('api: record transaction', res.ok, res.ok ? '' : await jsonNote(res));

  // board status move
  res = await req(`/api/projects/${project.id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'ONGOING' }),
  });
  record('api: move board status', res.ok, res.ok ? '' : await jsonNote(res));

  // photo upload (requires a TASK/SUBTASK parent + thumbnail)
  if (task) {
    const fd = new FormData();
    fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'smoke.png');
    fd.append('thumbnail', new Blob([TINY_PNG], { type: 'image/png' }), 'smoke-thumb.png');
    fd.append('parentId', task.id);
    fd.append('parentType', 'TASK');
    res = await req(`/api/projects/${project.id}/photos`, { method: 'POST', body: fd });
    record('api: upload photo', res.ok, res.ok ? '' : await jsonNote(res));
  } else {
    record('api: upload photo', false, 'skipped: no task to attach to');
  }

  // search
  res = await req('/api/search?q=Smoke');
  record('api: global search', res.ok, res.ok ? '' : `HTTP ${res.status}`);

  return ids;
}

// After the page crawl so detail pages still exist while crawled.
async function cleanup(ids) {
  if (ids['/projects/']) {
    const res = await req(`/api/projects/${ids['/projects/']}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: PASS }), // admin password confirms deletion
    });
    record('cleanup: delete project', res.ok, res.ok ? '' : await jsonNote(res));
  }
  if (ids['/companies/']) {
    const res = await req(`/api/companies/${ids['/companies/']}`, { method: 'DELETE' });
    record('cleanup: delete company', res.ok, res.ok ? '' : await jsonNote(res));
  }
}

// ── run ─────────────────────────────────────────────────────────────────────
if (!(await login())) process.exit(1);
const ids = await apiFlows();
await crawlPages(ids);
await cleanup(ids);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
