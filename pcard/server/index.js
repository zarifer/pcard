// Minimal Express + SQLite API (better-sqlite3)
// Resources:
// - /health
// - /stages: GET/POST/PATCH/DELETE (json-server pagination + X-Total-Count)
// - /kanban: GET list/by id, POST, PATCH, DELETE (checklist/comments/assignees JSON)
// - /calendar: GET list/by id, POST, DELETE
// - /calendar_events: GET list/by id, POST, DELETE (useCalendarLogger)
// - /companies: GET list/by id, POST, PATCH by id, DELETE (Licenses + Companies)
// - /categories: GET (with ids[]), POST, PATCH, DELETE (Incident log categories)
// - /incident_logs: GET list/by id (filter by ?status=...), POST, PATCH, DELETE
// - /resultsMeta: GET ?year&month, POST, PATCH (Results config + lock/snapshot)
// - /resultsRows: GET ?year&month[&productId], POST, PATCH (Results monthly rows)

const express = require('express');
const cors = require('cors');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // allow large payloads (e.g., base64 logos)

// DB file
const dbPath = path.join(__dirname, 'pcard.db');

// Defaults
const DEFAULT_STAGES = [
  { id: 'todo',           key: 'todo',           title: 'To Do',              order: 0 },
  { id: 'in-progress',    key: 'in-progress',    title: 'In Progress',        order: 1 },
  { id: 'review',         key: 'review',         title: 'Review',             order: 2 },
  { id: 'waiting-vendor', key: 'waiting-vendor', title: 'Waiting for vendor', order: 3 },
  { id: 'done',           key: 'done',           title: 'Done',               order: 4 },
];

// Helpers
function sanitize(raw) {
  return String(raw ?? '').replace(/<[^>]*>/g, '').trim();
}
function slugify(s) {
  return sanitize(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function parseRange(q) {
  const start = Math.max(0, Number(q._start ?? 0) | 0);
  const end = Number.isFinite(Number(q._end)) ? Math.max(start, Number(q._end) | 0) : (start + 50);
  const limit = Math.max(0, end - start);
  return { start, end, limit };
}
function parseSort(q, allowedCols = []) {
  const allowed = new Set(allowedCols);
  const sort = String(q._sort || '');
  const order = String(q._order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const col = allowed.has(sort) ? sort : null;
  const expr = col === 'order' ? '"order"' : col; // 'order' needs quotes
  return { expr, order };
}
function parseJSON(text, fallback) {
  try {
    if (text == null || text === '') return fallback;
    const v = JSON.parse(text);
    return v ?? fallback;
  } catch { return fallback; }
}
function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function toBoolInt(v) {
  return v ? 1 : 0;
}
function strOrEmpty(v) {
  return v == null ? '' : String(v);
}
function getDbStatus() {
  if (!Database) return { ok: false, error: 'better-sqlite3 not installed' };
  try {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT 1 as ok').get();
    db.close();
    return { ok: row?.ok === 1 };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Init schema
function initStages() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE,
      title TEXT,
      "order" INTEGER
    );
  `);
  const row = db.prepare('SELECT COUNT(1) as c FROM stages').get();
  const count = Number(row?.c || 0);
  if (count === 0) {
    const insert = db.prepare('INSERT INTO stages (id, key, title, "order") VALUES (?, ?, ?, ?)');
    const txn = db.transaction((rows) => { for (const r of rows) insert.run(r.id, r.key, r.title, r.order); });
    txn(DEFAULT_STAGES);
  }
  db.close();
}
function initKanban() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kanban (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stage TEXT NOT NULL,
      description TEXT,
      dueDate TEXT,
      calendarId TEXT,
      checklist TEXT,   -- JSON
      comments TEXT,    -- JSON
      assignees TEXT    -- JSON
    );
  `);
  db.close();
}
function migrateKanban() {
  if (!Database) return;
  const db = new Database(dbPath);
  try {
    const cols = db.prepare(`PRAGMA table_info('kanban')`).all();
    const names = new Set(cols.map(c => c.name));
    const addCol = (name) => db.exec(`ALTER TABLE kanban ADD COLUMN ${name} TEXT`);
    if (!names.has('checklist')) addCol('checklist');
    if (!names.has('comments')) addCol('comments');
    if (!names.has('assignees')) addCol('assignees');
  } catch (e) {
  } finally { db.close(); }
}
function initCalendar() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,         -- ISO or JSON [start,end]
      type TEXT,
      refKanbanId TEXT,
      performedBy TEXT,
      performedAtUtc TEXT,
      description TEXT
    );
  `);
  db.close();
}
function initCalendarEvents() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,         -- ISO
      performedBy TEXT,
      performedAtUtc TEXT,
      description TEXT
    );
  `);
  db.close();
}
function initCompanies() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      productId TEXT,
      name TEXT,
      product TEXT,
      productName TEXT,
      title TEXT,
      company TEXT,
      label TEXT,
      licenseExpiry TEXT,
      licenseExpiryMode TEXT,
      activationType TEXT,
      activationSerial TEXT,
      versionCheckPath TEXT,
      log TEXT,
      wdManuallyOff INTEGER,
      pctManuallyOff INTEGER,
      logo TEXT,
      emails TEXT,
      installSteps TEXT,
      customScan TEXT,
      interfaceType TEXT,
      timeZone TEXT,
      installProcedure TEXT,
      updateProcedure TEXT,
      hasRT INTEGER,
      hasOD INTEGER,
      scanType TEXT,
      hasGui INTEGER,
      gui TEXT
    );
  `);
  db.close();
}
function migrateCompanies() {
  if (!Database) return;
  const db = new Database(dbPath);
  try {
    const cols = db.prepare(`PRAGMA table_info('companies')`).all();
    const names = new Set(cols.map(c => c.name));
    const addText = (name) => db.exec(`ALTER TABLE companies ADD COLUMN ${name} TEXT`);
    const addInt = (name) => db.exec(`ALTER TABLE companies ADD COLUMN ${name} INTEGER`);
    if (!names.has('licenseExpiryMode')) addText('licenseExpiryMode');
    if (!names.has('activationType')) addText('activationType');
    if (!names.has('activationSerial')) addText('activationSerial');
    if (!names.has('logo')) addText('logo');
    if (!names.has('emails')) addText('emails');
    if (!names.has('installSteps')) addText('installSteps');
    if (!names.has('customScan')) addText('customScan');
    if (!names.has('interfaceType')) addText('interfaceType');
    if (!names.has('timeZone')) addText('timeZone');
    if (!names.has('installProcedure')) addText('installProcedure');
    if (!names.has('updateProcedure')) addText('updateProcedure');
    if (!names.has('hasRT')) addInt('hasRT');
    if (!names.has('hasOD')) addInt('hasOD');
    if (!names.has('scanType')) addText('scanType');
    if (!names.has('hasGui')) addInt('hasGui');
    if (!names.has('gui')) addText('gui');
  } finally {
    db.close();
  }
}
function initCategories() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL
    );
  `);
  db.close();
}
function initIncidentLogs() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS incident_logs (
      id TEXT PRIMARY KEY,
      productId TEXT,
      companyId TEXT,
      categoryId TEXT,
      detail TEXT,
      solution TEXT,
      status TEXT,         -- 'draft'|'open'|'closed'
      createdAt TEXT,
      updatedAt TEXT
    );
  `);
  db.close();
}
function initResultsMeta() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS results_meta (
      id TEXT PRIMARY KEY,       -- 'YYYY-M'
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      testSetName TEXT,
      cleanSampleSize INTEGER,
      certificationSet INTEGER,
      preview INTEGER,
      locked INTEGER,            -- 0/1
      lastSnapshotAt TEXT,
      lastUnlockAt TEXT,
      eventLog TEXT              -- JSON array
    );
  `);
  db.close();
}
function initResultsRows() {
  if (!Database) return;
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS results_rows (
      id TEXT PRIMARY KEY,       -- 'YYYY-M-PRODUCTID'
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      productId TEXT NOT NULL,   -- UPPER()
      productName TEXT,
      vmName TEXT,
      stage TEXT,
      certMiss TEXT,
      fps TEXT,
      cfnPreview TEXT,
      cfnFinal TEXT,
      privateFlag INTEGER,       -- 0/1
      invResFlag INTEGER         -- 0/1
    );
  `);
  db.close();
}

// Health & Root
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sqlite: getDbStatus() });
});
app.get('/', (_req, res) => {
  res.json({ name: 'VB100 API', status: 'running' });
});

// STAGES
app.get('/stages', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    let total = 0;
    try { total = Number(db.prepare('SELECT COUNT(1) as c FROM stages').get()?.c || 0); } catch { total = 0; }
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ['id', 'key', 'title', 'order']);
    let rows = [];
    if (total > 0 && limit > 0) {
      const base = `SELECT id, key, title, "order" as "order" FROM stages`;
      const orderBy = expr ? ` ORDER BY ${expr} ${order}` : ' ORDER BY "order" ASC';
      rows = db.prepare(`${base}${orderBy} LIMIT ? OFFSET ?`).all(limit, start);
    }
    res.set('X-Total-Count', String(total));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/stages', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const titleRaw = req.body?.title;
  const title = sanitize(titleRaw).slice(0, 40);
  if (!title) return res.status(400).json({ error: 'title is required' });
  let db;
  try {
    db = new Database(dbPath);
    const m = db.prepare('SELECT MAX("order") as m FROM stages').get();
    const nextOrder = Number.isFinite(Number(m?.m)) ? Number(m.m) + 1 : 0;
    const taken = new Set(db.prepare('SELECT key FROM stages').all().map(r => r.key));
    const base = slugify(title) || `stage-${Date.now()}`;
    let key = base; let i = 1; while (taken.has(key)) key = `${base}-${i++}`;
    const id = key;
    db.prepare('INSERT INTO stages (id, key, title, "order") VALUES (?, ?, ?, ?)').run(id, key, title, nextOrder);
    res.status(201).json({ id, key, title, order: nextOrder });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.patch('/stages/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  const titleRaw = req.body?.title;
  const title = titleRaw != null ? sanitize(titleRaw).slice(0, 40) : undefined;
  let db;
  try {
    db = new Database(dbPath);
    const cur = db.prepare('SELECT id, key, title, "order" as "order" FROM stages WHERE id = ?').get(id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const nextTitle = title != null ? title : cur.title;
    db.prepare('UPDATE stages SET title = ? WHERE id = ?').run(nextTitle, id);
    res.json({ ...cur, title: nextTitle });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.delete('/stages/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  let db;
  try {
    db = new Database(dbPath);
    const info = db.prepare('DELETE FROM stages WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// KANBAN
app.get('/kanban', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    let total = 0;
    try { total = Number(db.prepare('SELECT COUNT(1) as c FROM kanban').get()?.c || 0); } catch { total = 0; }
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ['id', 'title', 'stage', 'dueDate']);
    let rows = [];
    if (total > 0 && limit > 0) {
      const base = `
        SELECT id, title, stage, description, dueDate, calendarId, checklist, comments, assignees
        FROM kanban
      `;
      const orderBy = expr ? ` ORDER BY ${expr} ${order}` : ' ORDER BY id ASC';
      rows = db.prepare(`${base}${orderBy} LIMIT ? OFFSET ?`).all(limit, start).map(r => ({
        ...r,
        checklist: parseJSON(r.checklist, []),
        comments: parseJSON(r.comments, []),
        assignees: parseJSON(r.assignees, []),
      }));
    }
    res.set('X-Total-Count', String(total));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.get('/kanban/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    const r = db.prepare(`
      SELECT id, title, stage, description, dueDate, calendarId, checklist, comments, assignees
      FROM kanban WHERE id = ?
    `).get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({
      ...r,
      checklist: parseJSON(r.checklist, []),
      comments: parseJSON(r.comments, []),
      assignees: parseJSON(r.assignees, []),
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/kanban', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const b = req.body || {};
  const id = b.id || newId();
  const title = String(b.title || '').trim();
  const stage = String(b.stage || '').trim() || 'todo';
  const description = b.description ?? null;
  const dueDate = b.dueDate ?? null;
  const calendarId = b.calendarId ?? null;
  const checklist = JSON.stringify(Array.isArray(b.checklist) ? b.checklist : []);
  const comments = JSON.stringify(Array.isArray(b.comments) ? b.comments : []);
  const assignees = JSON.stringify(Array.isArray(b.assignees) ? b.assignees : []);
  if (!title) return res.status(400).json({ error: 'title is required' });
  let db;
  try {
    db = new Database(dbPath);
    db.prepare(`
      INSERT INTO kanban (id, title, stage, description, dueDate, calendarId, checklist, comments, assignees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, stage, description, dueDate, calendarId, checklist, comments, assignees);
    res.status(201).json({
      id, title, stage, description, dueDate, calendarId,
      checklist: JSON.parse(checklist), comments: JSON.parse(comments), assignees: JSON.parse(assignees),
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.patch('/kanban/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = req.params.id;
  const b = req.body || {};
  let db;
  try {
    db = new Database(dbPath);
    const cur = db.prepare(`
      SELECT id, title, stage, description, dueDate, calendarId, checklist, comments, assignees
      FROM kanban WHERE id = ?
    `).get(id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const next = {
      title: b.title != null ? String(b.title) : cur.title,
      stage: b.stage != null ? String(b.stage) : cur.stage,
      description: b.description != null ? b.description : cur.description,
      dueDate: b.dueDate != null ? b.dueDate : cur.dueDate,
      calendarId: b.calendarId != null ? b.calendarId : cur.calendarId,
      checklist: b.checklist != null ? JSON.stringify(b.checklist) : cur.checklist,
      comments: b.comments != null ? JSON.stringify(b.comments) : cur.comments,
      assignees: b.assignees != null ? JSON.stringify(b.assignees) : cur.assignees,
    };
    db.prepare(`
      UPDATE kanban
      SET title = ?, stage = ?, description = ?, dueDate = ?, calendarId = ?, checklist = ?, comments = ?, assignees = ?
      WHERE id = ?
    `).run(next.title, next.stage, next.description, next.dueDate, next.calendarId, next.checklist, next.comments, next.assignees, id);
    res.json({
      id, title: next.title, stage: next.stage, description: next.description, dueDate: next.dueDate, calendarId: next.calendarId,
      checklist: parseJSON(next.checklist, []), comments: parseJSON(next.comments, []), assignees: parseJSON(next.assignees, []),
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.delete('/kanban/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath);
    const info = db.prepare('DELETE FROM kanban WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// CALENDAR
app.get('/calendar', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    let total = 0;
    try { total = Number(db.prepare('SELECT COUNT(1) as c FROM calendar').get()?.c || 0); } catch { total = 0; }
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ['id', 'title', 'date', 'type', 'performedAtUtc']);
    let rows = [];
    if (total > 0 && limit > 0) {
      const base = `
        SELECT id, title, date, type, refKanbanId, performedBy, performedAtUtc, description
        FROM calendar
      `;
      const orderBy = expr ? ` ORDER BY ${expr} ${order}` : ' ORDER BY date DESC';
      rows = db.prepare(`${base}${orderBy} LIMIT ? OFFSET ?`).all(limit, start).map(r => ({
        ...r,
        date: (() => { try { const p = JSON.parse(r.date); return p ?? r.date; } catch { return r.date; } })(),
      }));
    }
    res.set('X-Total-Count', String(total));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.get('/calendar/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    const r = db.prepare(`
      SELECT id, title, date, type, refKanbanId, performedBy, performedAtUtc, description
      FROM calendar WHERE id = ?
    `).get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    let date = r.date;
    try { const p = JSON.parse(date); date = p ?? date; } catch {}
    res.json({ ...r, date });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/calendar', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const b = req.body || {};
  const id = b.id || newId();
  const title = sanitize(b.title).slice(0, 120);
  let dateVal = b.date;
  if (Array.isArray(dateVal)) dateVal = JSON.stringify(dateVal);
  else if (dateVal == null) dateVal = new Date().toISOString();
  const type = b.type ?? null;
  const refKanbanId = b.refKanbanId ?? null;
  const performedBy = b.performedBy ?? null;
  const performedAtUtc = b.performedAtUtc ?? new Date().toISOString();
  const description = b.description ?? null;
  if (!title) return res.status(400).json({ error: 'title is required' });
  let db;
  try {
    db = new Database(dbPath);
    db.prepare(`
      INSERT INTO calendar (id, title, date, type, refKanbanId, performedBy, performedAtUtc, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, String(dateVal), type, refKanbanId, performedBy, performedAtUtc, description);
    let dateOut = dateVal;
    if (typeof dateOut === 'string') { try { dateOut = JSON.parse(dateOut); } catch {} }
    res.status(201).json({ id, title, date: dateOut, type, refKanbanId, performedBy, performedAtUtc, description });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.delete('/calendar/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath);
    const info = db.prepare('DELETE FROM calendar WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// CALENDAR EVENTS
app.get('/calendar_events', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    let total = 0;
    try { total = Number(db.prepare('SELECT COUNT(1) as c FROM calendar_events').get()?.c || 0); } catch { total = 0; }
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ['id', 'title', 'date', 'performedAtUtc']);
    let rows = [];
    if (total > 0 && limit > 0) {
      const base = `
        SELECT id, title, date, performedBy, performedAtUtc, description
        FROM calendar_events
      `;
      const orderBy = expr ? ` ORDER BY ${expr} ${order}` : ' ORDER BY date DESC';
      rows = db.prepare(`${base}${orderBy} LIMIT ? OFFSET ?`).all(limit, start);
    }
    res.set('X-Total-Count', String(total));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.get('/calendar_events/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    const r = db.prepare(`
      SELECT id, title, date, performedBy, performedAtUtc, description
      FROM calendar_events WHERE id = ?
    `).get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/calendar_events', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const b = req.body || {};
  const id = b.id || newId();
  const title = sanitize(b.title).slice(0, 120);
  const date = b.date ?? new Date().toISOString();
  const performedBy = b.performedBy ?? null;
  const performedAtUtc = b.performedAtUtc ?? new Date().toISOString();
  const description = b.description ?? null;
  if (!title) return res.status(400).json({ error: 'title is required' });
  let db;
  try {
    db = new Database(dbPath);
    db.prepare(`
      INSERT INTO calendar_events (id, title, date, performedBy, performedAtUtc, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, String(date), performedBy, performedAtUtc, description);
    res.status(201).json({ id, title, date: String(date), performedBy, performedAtUtc, description });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.delete('/calendar_events/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath);
    const info = db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// COMPANIES
app.get('/companies', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const qPid = req.query?.productId ? String(req.query.productId).trim() : null;
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    let total = 0;
    if (qPid) total = Number(db.prepare('SELECT COUNT(1) as c FROM companies WHERE UPPER(productId) = UPPER(?)').get(qPid)?.c || 0);
    else total = Number(db.prepare('SELECT COUNT(1) as c FROM companies').get()?.c || 0);
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ['productId', 'name', 'product', 'productName', 'title', 'company', 'label']);
    let rows = [];
    if (total > 0 && limit > 0) {
      const base = `
        SELECT
          id, productId, name, product, productName, title, company, label,
          licenseExpiry, licenseExpiryMode, activationType, activationSerial,
          versionCheckPath, log, wdManuallyOff, pctManuallyOff,
          logo, emails, installSteps, customScan,
          interfaceType, timeZone, installProcedure, updateProcedure,
          hasRT, hasOD, scanType, hasGui, gui
        FROM companies
      `;
      const where = qPid ? ' WHERE UPPER(productId) = UPPER(?)' : '';
      const orderBy = expr ? ` ORDER BY ${expr} ${order}` : ' ORDER BY productId ASC';
      const sql = `${base}${where}${orderBy} LIMIT ? OFFSET ?`;
      rows = qPid ? db.prepare(sql).all(qPid, limit, start) : db.prepare(sql).all(limit, start);
      rows = rows.map(r => ({
        ...r,
        emails: parseJSON(r.emails, []),
        installSteps: parseJSON(r.installSteps, []),
        customScan: parseJSON(r.customScan, null),
        wdManuallyOff: !!r.wdManuallyOff,
        pctManuallyOff: !!r.pctManuallyOff,
        hasRT: !!r.hasRT,
        hasOD: !!r.hasOD,
        hasGui: !!r.hasGui,
      }));
    }
    res.set('X-Total-Count', String(total));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.get('/companies/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    const r = db.prepare(`
      SELECT
        id, productId, name, product, productName, title, company, label,
        licenseExpiry, licenseExpiryMode, activationType, activationSerial,
        versionCheckPath, log, wdManuallyOff, pctManuallyOff,
        logo, emails, installSteps, customScan,
        interfaceType, timeZone, installProcedure, updateProcedure,
        hasRT, hasOD, scanType, hasGui, gui
      FROM companies WHERE id = ?
    `).get(id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({
      ...r,
      emails: parseJSON(r.emails, []),
      installSteps: parseJSON(r.installSteps, []),
      customScan: parseJSON(r.customScan, null),
      wdManuallyOff: !!r.wdManuallyOff,
      pctManuallyOff: !!r.pctManuallyOff,
      hasRT: !!r.hasRT,
      hasOD: !!r.hasOD,
      hasGui: !!r.hasGui,
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/companies', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const b = req.body || {};
  const id = b.id || newId();
  const emails = JSON.stringify(Array.isArray(b.emails) ? b.emails : []);
  const installSteps = JSON.stringify(Array.isArray(b.installSteps) ? b.installSteps : []);
  const customScan = JSON.stringify(b.customScan ?? null);
  let db;
  try {
    db = new Database(dbPath);
    db.prepare(`
      INSERT INTO companies (
        id, productId, name, product, productName, title, company, label,
        licenseExpiry, licenseExpiryMode, activationType, activationSerial,
        versionCheckPath, log, wdManuallyOff, pctManuallyOff,
        logo, emails, installSteps, customScan,
        interfaceType, timeZone, installProcedure, updateProcedure,
        hasRT, hasOD, scanType, hasGui, gui
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      b.productId ?? null, b.name ?? null, b.product ?? null, b.productName ?? null, b.title ?? null, b.company ?? null, b.label ?? null,
      b.licenseExpiry ?? null, b.licenseExpiryMode ?? null, b.activationType ?? null, b.activationSerial ?? null,
      b.versionCheckPath ?? null, b.log ?? null, toBoolInt(!!b.wdManuallyOff), toBoolInt(!!b.pctManuallyOff),
      b.logo ?? null, emails, installSteps, customScan,
      b.interfaceType ?? null, b.timeZone ?? null, b.installProcedure ?? null, b.updateProcedure ?? null,
      toBoolInt(!!b.hasRT), toBoolInt(!!b.hasOD), b.scanType ?? null, toBoolInt(!!b.hasGui), b.gui ?? null
    );
    res.status(201).json({
      id,
      ...b,
      emails: parseJSON(emails, []),
      installSteps: parseJSON(installSteps, []),
      customScan: parseJSON(customScan, null),
      wdManuallyOff: !!b.wdManuallyOff,
      pctManuallyOff: !!b.pctManuallyOff,
      hasRT: !!b.hasRT,
      hasOD: !!b.hasOD,
      hasGui: !!b.hasGui,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  } finally {
    if (db) try { db.close(); } catch {}
  }
});
// Licenses quick update
app.patch('/companies/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  const b = req.body || {};
  let db;
  try {
    db = new Database(dbPath);
    const cur = db.prepare(`
      SELECT id, productId, name, product, productName, title, company, label,
             licenseExpiry, licenseExpiryMode, activationType, activationSerial,
             versionCheckPath, log, wdManuallyOff, pctManuallyOff,
             logo, emails, installSteps, customScan,
             interfaceType, timeZone, installProcedure, updateProcedure,
             hasRT, hasOD, scanType, hasGui, gui
      FROM companies WHERE id = ?
    `).get(id);
    if (!cur) return res.status(404).json({ error: 'Not found' });

    // Conservative: focus on license-related fields (as used by Licenses page)
    const next = {
      licenseExpiry: b.licenseExpiry !== undefined ? b.licenseExpiry : cur.licenseExpiry,
      licenseExpiryMode: b.licenseExpiryMode !== undefined ? b.licenseExpiryMode : cur.licenseExpiryMode,
      activationType: b.activationType !== undefined ? b.activationType : cur.activationType,
      activationSerial: b.activationType === 'serial'
        ? (b.activationSerial ?? cur.activationSerial)
        : (b.activationType ? null : cur.activationSerial),
    };
    db.prepare(`
      UPDATE companies
      SET licenseExpiry = ?, licenseExpiryMode = ?, activationType = ?, activationSerial = ?
      WHERE id = ?
    `).run(next.licenseExpiry, next.licenseExpiryMode, next.activationType, next.activationSerial, id);

    res.json({ ...cur, ...next });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.delete('/companies/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  let db;
  try {
    db = new Database(dbPath);
    const info = db.prepare('DELETE FROM companies WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// CATEGORIES
app.get('/categories', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });

  // Support ids[]= for useMany
  const idsRaw = req.query.ids ?? req.query['ids[]'];
  const ids = Array.isArray(idsRaw) ? idsRaw : idsRaw ? [idsRaw] : null;

  let db;
  try {
    db = new Database(dbPath, { readonly: true });

    if (ids && ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const rows = db.prepare(`SELECT id, title FROM categories WHERE id IN (${placeholders})`).all(...ids);
      res.set('X-Total-Count', String(rows.length));
      res.set('Access-Control-Expose-Headers', 'X-Total-Count');
      return res.json(rows);
    }

    let total = 0;
    try { total = Number(db.prepare('SELECT COUNT(1) as c FROM categories').get()?.c || 0); } catch { total = 0; }
    const { start, limit } = parseRange(req.query);
    let rows = [];
    if (total > 0 && limit > 0) {
      rows = db.prepare('SELECT id, title FROM categories ORDER BY title ASC LIMIT ? OFFSET ?').all(limit, start);
    }
    res.set('X-Total-Count', String(total));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/categories', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const b = req.body || {};
  const id = b.id || newId();
  const title = sanitize(b.title).slice(0, 80);
  if (!title) return res.status(400).json({ error: 'title is required' });
  let db;
  try {
    db = new Database(dbPath);
    db.prepare('INSERT INTO categories (id, title) VALUES (?, ?)').run(id, title);
    res.status(201).json({ id, title });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.patch('/categories/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  const titleRaw = req.body?.title;
  const title = titleRaw != null ? sanitize(titleRaw).slice(0, 80) : undefined;
  let db;
  try {
    db = new Database(dbPath);
    const cur = db.prepare('SELECT id, title FROM categories WHERE id = ?').get(id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const nextTitle = title != null ? title : cur.title;
    db.prepare('UPDATE categories SET title = ? WHERE id = ?').run(nextTitle, id);
    res.json({ ...cur, title: nextTitle });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.delete('/categories/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  let db;
  try {
    db = new Database(dbPath);
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// INCIDENT LOGS
app.get('/incident_logs', (req, res) => {
if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });

// Támogatott szűrők
const status = req.query?.status ? String(req.query.status).trim() : null;
const companyId =
req.query?.companyId
? String(req.query.companyId).trim()
: req.query?.['company.id']
? String(req.query['company.id']).trim()
: null;
const productId = req.query?.productId ? String(req.query.productId).trim() : null;
const categoryId =
req.query?.categoryId
? String(req.query.categoryId).trim()
: req.query?.['category.id']
? String(req.query['category.id']).trim()
: null;

let db;
try {
db = new Database(dbPath, { readonly: true });

// WHERE feltétel dinamikusan
const where = [];
const vals = [];

if (status) { where.push('status = ?'); vals.push(status); }
if (companyId) { where.push('companyId = ?'); vals.push(companyId); }
if (productId) { where.push('productId = ?'); vals.push(productId); }
if (categoryId) { where.push('categoryId = ?'); vals.push(categoryId); }

const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

// Total count ugyanazzal a WHERE-rel
const tRow = db.prepare(`SELECT COUNT(1) as c FROM incident_logs${whereSql}`).get(...vals);
const total = Number(tRow?.c || 0);

const { start, limit } = parseRange(req.query);
const { expr, order } = parseSort(req.query, ['productId', 'status', 'createdAt']);

let rows = [];
if (total > 0 && limit > 0) {
  const base = `
    SELECT id, productId, companyId, categoryId, detail, solution, status, createdAt, updatedAt
    FROM incident_logs
  `;
  const orderBy = expr ? ` ORDER BY ${expr} ${order}` : ' ORDER BY createdAt DESC';
  const sql = `${base}${whereSql}${orderBy} LIMIT ? OFFSET ?`;
  rows = db.prepare(sql).all(...vals, limit, start).map(r => ({
    ...r,
    company: r.companyId ? { id: String(r.companyId) } : null,
    category: r.categoryId ? { id: String(r.categoryId) } : null,
  }));
}

res.set('X-Total-Count', String(total));
res.set('Access-Control-Expose-Headers', 'X-Total-Count');
res.json(rows);
} catch (e) {
res.status(500).json({ error: e?.message || String(e) });
} finally {
if (db) try { db.close(); } catch {}
}
});

// RESULTS META
app.get('/resultsMeta', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const y = Number(req.query.year);
  const m = Number(req.query.month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return res.json([]);
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    const row = db.prepare(`
      SELECT id, year, month, testSetName, cleanSampleSize, certificationSet, preview,
             locked, lastSnapshotAt, lastUnlockAt, eventLog
      FROM results_meta WHERE year = ? AND month = ?
    `).get(y, m);
    if (!row) return res.json([]);
    res.json([{
      ...row,
      locked: !!row.locked,
      eventLog: (() => { try { return JSON.parse(row.eventLog || '[]'); } catch { return []; } })(),
    }]);
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/resultsMeta', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const b = req.body || {};
  const y = Number(b.year), m = Number(b.month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return res.status(400).json({ error: 'year/month required' });
  const id = b.id || `${y}-${m}`;
  const eventLog = JSON.stringify(Array.isArray(b.eventLog) ? b.eventLog : []);
  let db;
  try {
    db = new Database(dbPath);
    db.prepare(`
      INSERT INTO results_meta
        (id, year, month, testSetName, cleanSampleSize, certificationSet, preview,
         locked, lastSnapshotAt, lastUnlockAt, eventLog)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, y, m, b.testSetName ?? null, b.cleanSampleSize ?? null, b.certificationSet ?? null, b.preview ?? null,
      toBoolInt(!!b.locked), b.lastSnapshotAt ?? null, b.lastUnlockAt ?? null, eventLog
    );
    res.status(201).json({
      id, year: y, month: m,
      testSetName: b.testSetName ?? null,
      cleanSampleSize: b.cleanSampleSize ?? null,
      certificationSet: b.certificationSet ?? null,
      preview: b.preview ?? null,
      locked: !!b.locked,
      lastSnapshotAt: b.lastSnapshotAt ?? null,
      lastUnlockAt: b.lastUnlockAt ?? null,
      eventLog: JSON.parse(eventLog),
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.patch('/resultsMeta/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  let db;
  try {
    db = new Database(dbPath);
    const cur = db.prepare(`
      SELECT id, year, month, testSetName, cleanSampleSize, certificationSet, preview,
             locked, lastSnapshotAt, lastUnlockAt, eventLog
      FROM results_meta WHERE id = ?
    `).get(id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const b = req.body || {};
    const next = {
      testSetName: b.testSetName ?? cur.testSetName,
      cleanSampleSize: b.cleanSampleSize ?? cur.cleanSampleSize,
      certificationSet: b.certificationSet ?? cur.certificationSet,
      preview: b.preview ?? cur.preview,
      locked: b.locked != null ? toBoolInt(!!b.locked) : cur.locked,
      lastSnapshotAt: b.lastSnapshotAt ?? cur.lastSnapshotAt,
      lastUnlockAt: b.lastUnlockAt ?? cur.lastUnlockAt,
      eventLog: b.eventLog != null ? JSON.stringify(b.eventLog) : cur.eventLog,
    };
    db.prepare(`
      UPDATE results_meta
      SET testSetName = ?, cleanSampleSize = ?, certificationSet = ?, preview = ?,
          locked = ?, lastSnapshotAt = ?, lastUnlockAt = ?, eventLog = ?
      WHERE id = ?
    `).run(
      next.testSetName, next.cleanSampleSize, next.certificationSet, next.preview,
      next.locked, next.lastSnapshotAt, next.lastUnlockAt, next.eventLog, id
    );
    res.json({
      ...cur,
      ...next,
      locked: !!next.locked,
      eventLog: (() => { try { return JSON.parse(next.eventLog || '[]'); } catch { return []; } })(),
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// RESULTS ROWS
app.get('/resultsRows', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const y = Number(req.query.year);
  const m = Number(req.query.month);
  const pid = req.query.productId ? String(req.query.productId).trim().toUpperCase() : null;
  if (!Number.isFinite(y) || !Number.isFinite(m)) return res.json([]);
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    const base = `
      SELECT id, year, month, productId, productName, vmName, stage,
             certMiss, fps, cfnPreview, cfnFinal, privateFlag, invResFlag
      FROM results_rows
      WHERE year = ? AND month = ?
    `;
    let rows = [];
    if (pid) rows = db.prepare(`${base} AND UPPER(productId) = ?`).all(y, m, pid);
    else rows = db.prepare(`${base}`).all(y, m);
    res.json(rows.map(r => ({
      ...r,
      privateFlag: !!r.privateFlag,
      invResFlag: !!r.invResFlag,
    })));
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.post('/resultsRows', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const b = req.body || {};
  const y = Number(b.year), m = Number(b.month);
  const pid = String(b.productId || '').trim().toUpperCase();
  if (!Number.isFinite(y) || !Number.isFinite(m) || !pid) return res.status(400).json({ error: 'year/month/productId required' });
  const id = b.id || `${y}-${m}-${pid}`;
  let db;
  try {
    db = new Database(dbPath);
    db.prepare(`
      INSERT INTO results_rows
        (id, year, month, productId, productName, vmName, stage,
         certMiss, fps, cfnPreview, cfnFinal, privateFlag, invResFlag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, y, m, pid, b.productName ?? null, b.vmName ?? null, b.stage ?? null,
      strOrEmpty(b.certMiss), strOrEmpty(b.fps), strOrEmpty(b.cfnPreview), strOrEmpty(b.cfnFinal),
      toBoolInt(!!b.privateFlag), toBoolInt(!!b.invResFlag)
    );
    res.status(201).json({
      id, year: y, month: m, productId: pid, productName: b.productName ?? null,
      vmName: b.vmName ?? null, stage: b.stage ?? null,
      certMiss: strOrEmpty(b.certMiss), fps: strOrEmpty(b.fps),
      cfnPreview: strOrEmpty(b.cfnPreview), cfnFinal: strOrEmpty(b.cfnFinal),
      privateFlag: !!b.privateFlag, invResFlag: !!b.invResFlag,
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});
app.patch('/resultsRows/:id', (req, res) => {
  if (!Database) return res.status(500).json({ error: 'better-sqlite3 not installed' });
  const id = String(req.params.id);
  let db;
  try {
    db = new Database(dbPath);
    const cur = db.prepare(`
      SELECT id, year, month, productId, productName, vmName, stage,
             certMiss, fps, cfnPreview, cfnFinal, privateFlag, invResFlag
      FROM results_rows WHERE id = ?
    `).get(id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const b = req.body || {};
    const next = {
      productName: b.productName ?? cur.productName,
      vmName: b.vmName ?? cur.vmName,
      stage: b.stage ?? cur.stage,
      certMiss: b.certMiss != null ? strOrEmpty(b.certMiss) : cur.certMiss,
      fps: b.fps != null ? strOrEmpty(b.fps) : cur.fps,
      cfnPreview: b.cfnPreview != null ? strOrEmpty(b.cfnPreview) : cur.cfnPreview,
      cfnFinal: b.cfnFinal != null ? strOrEmpty(b.cfnFinal) : cur.cfnFinal,
      privateFlag: b.privateFlag != null ? toBoolInt(!!b.privateFlag) : cur.privateFlag,
      invResFlag: b.invResFlag != null ? toBoolInt(!!b.invResFlag) : cur.invResFlag,
    };
    db.prepare(`
      UPDATE results_rows
      SET productName = ?, vmName = ?, stage = ?, certMiss = ?, fps = ?, cfnPreview = ?, cfnFinal = ?,
          privateFlag = ?, invResFlag = ?
      WHERE id = ?
    `).run(
      next.productName, next.vmName, next.stage, next.certMiss, next.fps, next.cfnPreview, next.cfnFinal,
      next.privateFlag, next.invResFlag, id
    );
    res.json({
      ...cur,
      ...next,
      privateFlag: !!next.privateFlag,
      invResFlag: !!next.invResFlag,
    });
  } catch (e) { res.status(500).json({ error: e?.message || String(e) }); }
  finally { if (db) try { db.close(); } catch {} }
});

// Init
initStages();
initKanban();
migrateKanban();
initCalendar();
initCalendarEvents();
initCompanies();
migrateCompanies();
initCategories();
initIncidentLogs();
initResultsMeta();
initResultsRows();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`VB100 API listening on http://localhost:${PORT}`);
});
