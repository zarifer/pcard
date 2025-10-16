// Postgres-backed REST API for VB100 (magic.sql compatible)
// Contract: json-server style (_start/_end, _sort/_order, X-Total-Count)
// UI mapping highlights:
// - stages: id = key (string) for routes; DB uses numeric id + text key
// - kanban: stage (UI) is stages.key, DB uses stage_id; checklist/comments from child tables
// - calendar: alias to calendar_events (magic.sql has only calendar_events)
// - companies: map UI fields to magic.sql columns (company_emails[], log_path, custom_scan_json, etc.)
// - incident_logs: product_id/company_id/category_id; title optional
// - resultsMeta: maps snapshot_at→lastSnapshotAt, last_unlock_at→lastUnlockAt; event log via results_meta_eventlog
// - resultsRows: numeric/integer/boolean mapped correctly; '' → NULL handling on write

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const DATABASE_URL = process.env.DATABASE_URL || "postgres://vb100:vb100@localhost:5432/vb100";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ------------------ helpers ------------------
async function pgq(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

app.get("/healthz", async (_req, res) => {
  try {
    await pgq("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
(async () => {
  try {
    await pgq("SELECT 1");
    console.log("✅ PostgreSQL connection OK");
  } catch (e) {
    console.error("❌ Cannot connect to PostgreSQL:", e?.message || e);
    process.exit(1);
  }
})();

function sanitize(raw) {
  return String(raw ?? "").replace(/<[^>]*>/g, "").trim();
}
function slugify(s) {
  return sanitize(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function parseRange(q) {
  const start = Math.max(0, Number(q._start ?? 0) | 0);
  const end = Number.isFinite(Number(q._end)) ? Math.max(start, Number(q._end) | 0) : start + 50;
  const limit = Math.max(0, end - start);
  return { start, limit };
}
function parseSort(q, allowed) {
  const s = String(q._sort || "");
  const order = String(q._order || "asc").toUpperCase() === "DESC" ? "DESC" : "ASC";
  return { expr: allowed.includes(s) ? s : null, order };
}
function tryJsonParse(v, fb) {
  if (v == null) return fb;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return fb;
  }
}
const toBool = (v) => v === true || v === 1 || v === "1";
const numOrNull = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

// ------------------ health ------------------
app.get("/health", async (_req, res) => {
  try {
    await pgq("select 1");
    res.json({ status: "ok", postgres: true });
  } catch (e) {
    res.status(500).json({ status: "error", error: e?.message || String(e) });
  }
});

// ================== STAGES ==================
// UI expects id = key (string)
app.get("/stages", async (req, res) => {
  try {
    const total = (await pgq(`SELECT COUNT(1)::int AS c FROM stages`)).rows[0].c;
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ["id", "key", "title", "order"]);
    const orderExpr =
      expr === "id" ? "id" : expr === "key" ? "key" : expr === "title" ? "title" : `"order"`;
    const list = await pgq(
      `SELECT key, title, "order" FROM stages
       ORDER BY ${orderExpr} ${order}
       LIMIT $1 OFFSET $2`,
      [limit, start],
    );
    const rows = list.rows.map((r) => ({ id: r.key, key: r.key, title: r.title, order: r.order }));
    res.set("X-Total-Count", String(total));
    res.set("Access-Control-Expose-Headers", "X-Total-Count");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/stages", async (req, res) => {
  try {
    const title = sanitize(req.body?.title).slice(0, 40);
    if (!title) return res.status(400).json({ error: "title is required" });
    const m = await pgq(`SELECT COALESCE(MAX("order"), -1)::int AS m FROM stages`);
    const nextOrder = Number(m.rows[0].m) + 1;
    // unique key
    const base = slugify(title) || `stage-${Date.now()}`;
    let key = base;
    for (let i = 1; i <= 5; i++) {
      const ex = await pgq("SELECT 1 FROM stages WHERE key = $1", [key]);
      if (ex.rowCount === 0) break;
      key = `${base}-${i}`;
    }
    const r = await pgq(
      `INSERT INTO stages(key, title, "order") VALUES ($1,$2,$3) RETURNING key, title, "order"`,
      [key, title, nextOrder],
    );
    const row = r.rows[0];
    res.status(201).json({ id: row.key, key: row.key, title: row.title, order: row.order });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.patch("/stages/:id", async (req, res) => {
  try {
    const key = String(req.params.id);
    const title = sanitize(req.body?.title ?? "").slice(0, 40);
    if (!title) return res.status(400).json({ error: "title is required" });
    const r = await pgq(
      `UPDATE stages SET title = $1 WHERE key = $2 RETURNING key, title, "order"`,
      [title, key],
    );
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    const row = r.rows[0];
    res.json({ id: row.key, key: row.key, title: row.title, order: row.order });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/stages/:id", async (req, res) => {
  try {
    const key = String(req.params.id);
    const del = await pgq(`DELETE FROM stages WHERE key = $1`, [key]);
    if (!del.rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== KANBAN ==================
function mapChecklistRows(rows) {
  return rows
    .sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0))
    .map((r) => ({ id: String(r.id), text: r.text, done: !!r.done }));
}
function mapCommentRows(rows) {
  return rows
    .sort((a, b) => new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf())
    .map((r) => ({
      id: String(r.id),
      text: r.comment_text,
      at: r.created_at,
      authorName: r.author || "User",
    }));
}
function normalizeKanban(r, checklist, comments) {
  return {
    id: r.id,
    title: r.title,
    stage: r.stage,
    description: r.description,
    dueDate: r.dueDate,
    calendarId: r.calendarId, // maps to calendar_event_id
    checklist: mapChecklistRows(checklist || []),
    comments: mapCommentRows(comments || []),
    assignees: [], // magic.sql has no assignees table; keep empty
  };
}

app.get("/kanban", async (req, res) => {
  try {
    const total = (await pgq(`SELECT COUNT(1)::int AS c FROM kanban`)).rows[0].c;
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ["id", "title", "stage", "dueDate"]);
    const orderExpr =
      expr === "title" ? "k.title" : expr === "stage" ? "s.key" : expr === "dueDate" ? "k.due_date" : "k.id";

    const base = await pgq(
      `SELECT k.id, k.title, s.key AS stage, k.description,
              k.due_date AS "dueDate", k.calendar_event_id AS "calendarId"
       FROM kanban k
       LEFT JOIN stages s ON s.id = k.stage_id
       ORDER BY ${orderExpr} ${order}
       LIMIT $1 OFFSET $2`,
      [limit, start],
    );
    const ids = base.rows.map((r) => r.id);
    let checklistMap = new Map();
    let commentsMap = new Map();
    if (ids.length) {
      const cl = await pgq(
        `SELECT id, kanban_id, item_order, text, done FROM kanban_checklist WHERE kanban_id = ANY($1::int[])`,
        [ids],
      );
      for (const r of cl.rows) {
        const arr = checklistMap.get(r.kanban_id) || [];
        arr.push(r);
        checklistMap.set(r.kanban_id, arr);
      }
      const cm = await pgq(
        `SELECT id, kanban_id, author, comment_text, created_at
         FROM kanban_comments WHERE kanban_id = ANY($1::int[])`,
        [ids],
      );
      for (const r of cm.rows) {
        const arr = commentsMap.get(r.kanban_id) || [];
        arr.push(r);
        commentsMap.set(r.kanban_id, arr);
      }
    }
    const rows = base.rows.map((r) =>
      normalizeKanban(r, checklistMap.get(r.id) || [], commentsMap.get(r.id) || []),
    );
    res.set("X-Total-Count", String(total));
    res.set("Access-Control-Expose-Headers", "X-Total-Count");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/kanban/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pgq(
      `SELECT k.id, k.title, s.key AS stage, k.description,
              k.due_date AS "dueDate", k.calendar_event_id AS "calendarId"
       FROM kanban k
       LEFT JOIN stages s ON s.id = k.stage_id
       WHERE k.id = $1`,
      [id],
    );
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    const chk = await pgq(
      `SELECT id, kanban_id, item_order, text, done
       FROM kanban_checklist WHERE kanban_id = $1`,
      [id],
    );
    const com = await pgq(
      `SELECT id, kanban_id, author, comment_text, created_at
       FROM kanban_comments WHERE kanban_id = $1`,
      [id],
    );
    res.json(normalizeKanban(r.rows[0], chk.rows, com.rows));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/kanban", async (req, res) => {
  try {
    const b = req.body || {};
    const title = sanitize(b.title).slice(0, 160);
    if (!title) return res.status(400).json({ error: "title is required" });
    const stageKey = sanitize(b.stage || "todo");
    const s = await pgq(`SELECT id FROM stages WHERE key = $1`, [stageKey]);
    const stageId = s.rows[0]?.id ?? null;

    const ins = await pgq(
      `INSERT INTO kanban (title, description, stage_id, due_date, calendar_event_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [title, b.description ?? null, stageId, b.dueDate ?? null, b.calendarId ?? null],
    );
    const id = ins.rows[0].id;

    // insert checklist
    const checklist = Array.isArray(b.checklist) ? b.checklist : [];
    for (let i = 0; i < checklist.length; i++) {
      const it = checklist[i] || {};
      await pgq(
        `INSERT INTO kanban_checklist (kanban_id, item_order, text, done) VALUES ($1,$2,$3,$4)`,
        [id, i, sanitize(it.text || ""), !!it.done],
      );
    }
    // insert comments
    const comments = Array.isArray(b.comments) ? b.comments : [];
    for (const c of comments) {
      await pgq(
        `INSERT INTO kanban_comments (kanban_id, author, comment_text, created_at)
         VALUES ($1,$2,$3,$4)`,
        [id, c.authorName ?? "User", sanitize(c.text || ""), c.at ?? new Date().toISOString()],
      );
    }

    // return full row
    const base = await pgq(
      `SELECT k.id, k.title, s.key AS stage, k.description,
              k.due_date AS "dueDate", k.calendar_event_id AS "calendarId"
       FROM kanban k LEFT JOIN stages s ON s.id = k.stage_id WHERE k.id = $1`,
      [id],
    );
    const chk = await pgq(
      `SELECT id, kanban_id, item_order, text, done FROM kanban_checklist WHERE kanban_id = $1`,
      [id],
    );
    const com = await pgq(
      `SELECT id, kanban_id, author, comment_text, created_at FROM kanban_comments WHERE kanban_id = $1`,
      [id],
    );
    res.status(201).json(normalizeKanban(base.rows[0], chk.rows, com.rows));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.patch("/kanban/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cur = await pgq(
      `SELECT id, title, description, stage_id, due_date, calendar_event_id FROM kanban WHERE id = $1`,
      [id],
    );
    if (!cur.rowCount) return res.status(404).json({ error: "Not found" });
    const c = cur.rows[0];

    let stageId = c.stage_id;
    if (req.body?.stage != null) {
      const stageKey = sanitize(req.body.stage);
      const s = await pgq("SELECT id FROM stages WHERE key = $1", [stageKey]);
      stageId = s.rows[0]?.id ?? null;
    }

    const next = {
      title:
        req.body?.title != null ? sanitize(req.body.title).slice(0, 160) : c.title,
      description: req.body?.description != null ? req.body.description : c.description,
      stage_id: stageId,
      due_date: req.body?.dueDate != null ? req.body.dueDate : c.due_date,
      calendar_event_id: req.body?.calendarId != null ? req.body.calendarId : c.calendar_event_id,
    };

    await pgq(
      `UPDATE kanban SET title=$1, description=$2, stage_id=$3, due_date=$4, calendar_event_id=$5 WHERE id=$6`,
      [next.title, next.description, next.stage_id, next.due_date, next.calendar_event_id, id],
    );

    // checklist replace if provided
    if (Array.isArray(req.body?.checklist)) {
      await pgq(`DELETE FROM kanban_checklist WHERE kanban_id = $1`, [id]);
      const list = req.body.checklist;
      for (let i = 0; i < list.length; i++) {
        const it = list[i] || {};
        await pgq(
          `INSERT INTO kanban_checklist (kanban_id, item_order, text, done) VALUES ($1,$2,$3,$4)`,
          [id, i, sanitize(it.text || ""), !!it.done],
        );
      }
    }
    // comments replace if provided
    if (Array.isArray(req.body?.comments)) {
      await pgq(`DELETE FROM kanban_comments WHERE kanban_id = $1`, [id]);
      for (const c of req.body.comments) {
        await pgq(
          `INSERT INTO kanban_comments (kanban_id, author, comment_text, created_at)
           VALUES ($1,$2,$3,$4)`,
          [id, c.authorName ?? "User", sanitize(c.text || ""), c.at ?? new Date().toISOString()],
        );
      }
    }

    const base = await pgq(
      `SELECT k.id, k.title, s.key AS stage, k.description,
              k.due_date AS "dueDate", k.calendar_event_id AS "calendarId"
       FROM kanban k LEFT JOIN stages s ON s.id = k.stage_id WHERE k.id = $1`,
      [id],
    );
    const chk = await pgq(
      `SELECT id, kanban_id, item_order, text, done FROM kanban_checklist WHERE kanban_id = $1`,
      [id],
    );
    const com = await pgq(
      `SELECT id, kanban_id, author, comment_text, created_at FROM kanban_comments WHERE kanban_id = $1`,
      [id],
    );
    res.json(normalizeKanban(base.rows[0], chk.rows, com.rows));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/kanban/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pgq(`DELETE FROM kanban_checklist WHERE kanban_id = $1`, [id]);
    await pgq(`DELETE FROM kanban_comments WHERE kanban_id = $1`, [id]);
    const del = await pgq(`DELETE FROM kanban WHERE id = $1`, [id]);
    if (!del.rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== CALENDAR (alias to calendar_events) ==================
app.get("/calendar", async (req, res) => {
  try {
    const total = (await pgq(`SELECT COUNT(1)::int AS c FROM calendar_events`)).rows[0].c;
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ["id", "title", "date", "performedAtUtc"]);
    const orderExpr =
      expr === "title" ? "title" : expr === "date" ? "date" : expr === "performedAtUtc" ? "performed_at_utc" : "id";
    const list = await pgq(
      `SELECT id, title, date, performed_by AS "performedBy",
              performed_at_utc AS "performedAtUtc", description
       FROM calendar_events
       ORDER BY ${orderExpr} ${order}
       LIMIT $1 OFFSET $2`,
      [limit, start],
    );
    res.set("X-Total-Count", String(total));
    res.set("Access-Control-Expose-Headers", "X-Total-Count");
    // Keep shape: add null fields for UI (type, refKanbanId)
    res.json(list.rows.map((r) => ({ ...r, type: null, refKanbanId: null })));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.get("/calendar/:id", async (req, res) => {
  try {
    const r = await pgq(
      `SELECT id, title, date, performed_by AS "performedBy",
              performed_at_utc AS "performedAtUtc", description
       FROM calendar_events WHERE id = $1`,
      [req.params.id],
    );
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json({ ...r.rows[0], type: null, refKanbanId: null });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.post("/calendar", async (req, res) => {
  try {
    const b = req.body || {};
    const title = sanitize(b.title).slice(0, 120);
    if (!title) return res.status(400).json({ error: "title is required" });
    const date = b.date ?? new Date().toISOString();
    const ins = await pgq(
      `INSERT INTO calendar_events (title, date, performed_by, performed_at_utc, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [title, String(date), b.performedBy ?? null, b.performedAtUtc ?? new Date().toISOString(), b.description ?? null],
    );
    const id = ins.rows[0].id;
    const r = await pgq(
      `SELECT id, title, date, performed_by AS "performedBy",
              performed_at_utc AS "performedAtUtc", description
       FROM calendar_events WHERE id = $1`,
      [id],
    );
    res.status(201).json({ ...r.rows[0], type: null, refKanbanId: null });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.delete("/calendar/:id", async (req, res) => {
  try {
    const del = await pgq(`DELETE FROM calendar_events WHERE id = $1`, [req.params.id]);
    if (!del.rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== CALENDAR_EVENTS ==================
app.get("/calendar_events", async (req, res) => {
  try {
    const total = (await pgq(`SELECT COUNT(1)::int AS c FROM calendar_events`)).rows[0].c;
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ["id", "title", "date", "performedAtUtc"]);
    const orderExpr =
      expr === "title" ? "title" : expr === "date" ? "date" : expr === "performedAtUtc" ? "performed_at_utc" : "id";
    const list = await pgq(
      `SELECT id, title, date, performed_by AS "performedBy",
              performed_at_utc AS "performedAtUtc", description
       FROM calendar_events
       ORDER BY ${orderExpr} ${order}
       LIMIT $1 OFFSET $2`,
      [limit, start],
    );
    res.set("X-Total-Count", String(total));
    res.set("Access-Control-Expose-Headers", "X-Total-Count");
    res.json(list.rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.get("/calendar_events/:id", async (req, res) => {
  try {
    const r = await pgq(
      `SELECT id, title, date, performed_by AS "performedBy",
              performed_at_utc AS "performedAtUtc", description
       FROM calendar_events WHERE id = $1`,
      [req.params.id],
    );
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.post("/calendar_events", async (req, res) => {
  try {
    const b = req.body || {};
    const title = sanitize(b.title).slice(0, 120);
    if (!title) return res.status(400).json({ error: "title is required" });
    const date = b.date ?? new Date().toISOString();
    const ins = await pgq(
      `INSERT INTO calendar_events (title, date, performed_by, performed_at_utc, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [title, String(date), b.performedBy ?? null, b.performedAtUtc ?? new Date().toISOString(), b.description ?? null],
    );
    const id = ins.rows[0].id;
    const r = await pgq(
      `SELECT id, title, date, performed_by AS "performedBy",
              performed_at_utc AS "performedAtUtc", description
       FROM calendar_events WHERE id = $1`,
      [id],
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.delete("/calendar_events/:id", async (req, res) => {
  try {
    const del = await pgq(`DELETE FROM calendar_events WHERE id = $1`, [req.params.id]);
    if (!del.rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== COMPANIES ==================
function normalizeCompanyRow(r) {
  return {
    id: r.id,
name: r.name,
product: r.product,
productId: r.productId,
productName: r.productName ?? null,
title: r.title ?? null,
company: r.company ?? null,
label: r.label ?? null,
interfaceType: r.interfaceType,
interfaceOther: r.interfaceOther ?? null,
timeZone: r.timeZone,
wdManuallyOff: !!r.wdManuallyOff,
pctManuallyOff: !!r.pctManuallyOff,
installProcedure: r.installProcedure,
versionCheckPath: r.versionCheckPath,
licenseExpiry: r.licenseExpiry,
licenseExpiryMode: r.licenseExpiryMode,
expiryPerpetual: !!r.expiryPerpetual,
expiryNone: !!r.expiryNone,
updateProcedure: r.updateProcedure,
activationType: r.activationType,
activationEmail: r.activationEmail ?? null,
activationPassword: r.activationPassword ?? null,
activationSerial: r.activationSerial,
hasRT: !!r.hasRT,
hasOD: !!r.hasOD,
scanType: r.scanType,
log: r.log,
hasGui: !!r.hasGui,
gui: r.gui,
logo: r.logo,
emails: Array.isArray(r.emails) ? r.emails : [],
installSteps: r.installSteps ?? [],
customScan: r.customScan ?? null,
};
}

app.get("/companies", async (req, res) => {
  try {
    const qPid = req.query?.productId ? String(req.query.productId).trim() : null;
    const where = [];
    const vals = [];
    if (qPid) {
      where.push(`UPPER(product_id) = UPPER($${vals.length + 1})`);
      vals.push(qPid);
    }
    const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
    const total = (await pgq(`SELECT COUNT(1)::int AS c FROM companies${whereSql}`, vals)).rows[0].c;
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, [
      "productId",
      "name",
      "product",
      "productName",
      "title",
      "company",
      "label",
    ]);
    const orderExpr =
      expr === "productId"
        ? "product_id"
        : expr === "name"
          ? "name"
          : expr === "product"
            ? "product"
            : expr === "productName"
              ? "product_name"
              : expr === "title"
                ? "title"
                : expr === "company"
                  ? "company"
                  : expr === "label"
                    ? "label"
                    : "product_id";

    const list = await pgq(
      `SELECT
         id, name, product, product_id AS "productId", NULL::text AS "productName", NULL::text AS "title", NULL::text AS "company", NULL::text AS "label", interface_type AS "interfaceType", interface_other AS "interfaceOther", time_zone AS "timeZone", wd_manually_off AS "wdManuallyOff", pct_manually_off AS "pctManuallyOff", install_procedure AS "installProcedure", version_check_path AS "versionCheckPath", license_expiry AS "licenseExpiry", license_expiry_mode AS "licenseExpiryMode", expiry_perpetual AS "expiryPerpetual", expiry_none AS "expiryNone", update_procedure AS "updateProcedure", activation_type AS "activationType", activation_email AS "activationEmail", activation_password AS "activationPassword", activation_serial AS "activationSerial", has_rt AS "hasRT", has_od AS "hasOD", scan_type AS "scanType", log_path AS "log", has_gui AS "hasGui", gui, logo, company_emails AS "emails", install_steps AS "installSteps", custom_scan_json AS "customScan" FROM companies
       ${whereSql}
       ORDER BY ${orderExpr} ${order}
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, limit, start],
    );
    const rows = list.rows.map(normalizeCompanyRow);
    res.set("X-Total-Count", String(total));
    res.set("Access-Control-Expose-Headers", "X-Total-Count");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/companies/:id", async (req, res) => {
  try {
    const r = await pgq(
      `SELECT
          id, name, product, product_id AS "productId", NULL::text AS "productName", NULL::text AS "title", NULL::text AS "company", NULL::text AS "label", interface_type AS "interfaceType", interface_other AS "interfaceOther", time_zone AS "timeZone", wd_manually_off AS "wdManuallyOff", pct_manually_off AS "pctManuallyOff", install_procedure AS "installProcedure", version_check_path AS "versionCheckPath", license_expiry AS "licenseExpiry", license_expiry_mode AS "licenseExpiryMode", expiry_perpetual AS "expiryPerpetual", expiry_none AS "expiryNone", update_procedure AS "updateProcedure", activation_type AS "activationType", activation_email AS "activationEmail", activation_password AS "activationPassword", activation_serial AS "activationSerial", has_rt AS "hasRT", has_od AS "hasOD", scan_type AS "scanType", log_path AS "log", has_gui AS "hasGui", gui, logo, company_emails AS "emails", install_steps AS "installSteps", custom_scan_json AS "customScan" FROM companies WHERE id = $1`,
      [req.params.id],
    );
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json(normalizeCompanyRow(r.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/companies", async (req, res) => {
  try {
    const b = req.body || {};
    const name = sanitize(b.name);
    if (!name) return res.status(400).json({ error: "name is required" });

    const r = await pgq(
  `INSERT INTO companies (
     name, product, product_id,
     interface_type, interface_other, time_zone,
     wd_manually_off, pct_manually_off, install_procedure, version_check_path,
     license_expiry, license_expiry_mode, expiry_perpetual, expiry_none,
     update_procedure, activation_type, activation_email, activation_password, activation_serial,
     has_rt, has_od, scan_type, log_path, has_gui, gui, logo,
     company_emails, install_steps, custom_scan_json
   ) VALUES (
     $1,$2,$3,
     $4,$5,$6,
     $7,$8,$9,$10,
     $11,$12,$13,$14,
     $15,$16,$17,$18,$19,
     $20,$21,$22,$23,$24,$25,$26,
     $27::text[],$28::jsonb,$29::jsonb
   )
   RETURNING
     id, name, product, product_id AS "productId",
     NULL::text AS "productName", NULL::text AS "title", NULL::text AS "company", NULL::text AS "label",
     interface_type AS "interfaceType", interface_other AS "interfaceOther",
     time_zone AS "timeZone", wd_manually_off AS "wdManuallyOff",
     pct_manually_off AS "pctManuallyOff", install_procedure AS "installProcedure",
     version_check_path AS "versionCheckPath", license_expiry AS "licenseExpiry",
     license_expiry_mode AS "licenseExpiryMode", expiry_perpetual AS "expiryPerpetual",
     expiry_none AS "expiryNone", update_procedure AS "updateProcedure",
     activation_type AS "activationType", activation_email AS "activationEmail",
     activation_password AS "activationPassword", activation_serial AS "activationSerial",
     has_rt AS "hasRT", has_od AS "hasOD", scan_type AS "scanType",
     log_path AS "log", has_gui AS "hasGui", gui, logo,
     company_emails AS "emails",
     install_steps AS "installSteps", custom_scan_json AS "customScan"`,
  [
    name,
    b.product ?? null,
    b.productId ?? null,
    b.interfaceType ?? null,
    b.interfaceOther ?? null,
    b.timeZone ?? null,
    toBool(b.wdManuallyOff),
    toBool(b.pctManuallyOff),
    b.installProcedure ?? null,
    b.versionCheckPath ?? null,
    b.licenseExpiry ?? null,
    b.licenseExpiryMode ?? null,
    toBool(b.expiryPerpetual),
    toBool(b.expiryNone),
    b.updateProcedure ?? null,
    b.activationType ?? null,
    b.activationEmail ?? null,
    b.activationPassword ?? null,
    b.activationSerial ?? null,
    toBool(b.hasRT),
    toBool(b.hasOD),
    b.scanType ?? null,
    b.log ?? null,
    toBool(b.hasGui),
    b.gui ?? null,
    b.logo ?? null,
    Array.isArray(b.emails) ? b.emails : [],
    JSON.stringify(Array.isArray(b.installSteps) ? b.installSteps : []),
    JSON.stringify(b.customScan ?? null),
  ],
);

const row = r.rows[0];
res.status(201).json(normalizeCompanyRow(row));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Licenses edit
app.patch("/companies/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cur = await pgq(
      `SELECT id, license_expiry AS "licenseExpiry", license_expiry_mode AS "licenseExpiryMode",
              activation_type AS "activationType", activation_serial AS "activationSerial"
       FROM companies WHERE id = $1`,
      [id],
    );
    if (!cur.rowCount) return res.status(404).json({ error: "Not found" });
    const c = cur.rows[0];
    const next = {
      licenseExpiry: req.body?.licenseExpiry !== undefined ? req.body.licenseExpiry : c.licenseExpiry,
      licenseExpiryMode:
        req.body?.licenseExpiryMode !== undefined ? req.body.licenseExpiryMode : c.licenseExpiryMode,
      activationType: req.body?.activationType !== undefined ? req.body.activationType : c.activationType,
      activationSerial:
        req.body?.activationType === "serial"
          ? req.body?.activationSerial ?? c.activationSerial
          : req.body?.activationType
            ? null
            : c.activationSerial,
    };
    await pgq(
      `UPDATE companies
       SET license_expiry = $1, license_expiry_mode = $2, activation_type = $3, activation_serial = $4
       WHERE id = $5`,
      [next.licenseExpiry, next.licenseExpiryMode, next.activationType, next.activationSerial, id],
    );
    res.json({ id, ...next });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/companies/:id", async (req, res) => {
  try {
    const del = await pgq(`DELETE FROM companies WHERE id = $1`, [req.params.id]);
    if (!del.rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== CATEGORIES ==================
app.get("/categories", async (req, res) => {
  try {
    const idsRaw = req.query.ids ?? req.query["ids[]"];
    const ids = Array.isArray(idsRaw) ? idsRaw : idsRaw ? [idsRaw] : null;
    if (ids && ids.length) {
      const params = ids.map((_, i) => `$${i + 1}`).join(",");
      const r = await pgq(`SELECT id, title FROM categories WHERE id IN (${params})`, ids);
      res.set("X-Total-Count", String(r.rowCount));
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.json(r.rows);
    }
    const total = (await pgq(`SELECT COUNT(1)::int AS c FROM categories`)).rows[0].c;
    const { start, limit } = parseRange(req.query);
    const list = await pgq(
      `SELECT id, title FROM categories ORDER BY title ASC LIMIT $1 OFFSET $2`,
      [limit, start],
    );
    res.set("X-Total-Count", String(total));
    res.set("Access-Control-Expose-Headers", "X-Total-Count");
    res.json(list.rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.post("/categories", async (req, res) => {
  try {
    const title = sanitize(req.body?.title);
    if (!title) return res.status(400).json({ error: "title is required" });
    const r = await pgq(`INSERT INTO categories (title) VALUES ($1) RETURNING id, title`, [title]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.patch("/categories/:id", async (req, res) => {
  try {
    const title = sanitize(req.body?.title);
    if (!title) return res.status(400).json({ error: "title is required" });
    const r = await pgq(`UPDATE categories SET title=$1 WHERE id=$2 RETURNING id, title`, [
      title,
      req.params.id,
    ]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.delete("/categories/:id", async (req, res) => {
  try {
    const del = await pgq(`DELETE FROM categories WHERE id = $1`, [req.params.id]);
    if (!del.rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== INCIDENT LOGS ==================
function normalizeIncRow(r) {
  return {
    id: r.id,
    productId: r.productId,
    company: r.companyId != null ? { id: String(r.companyId) } : null,
    category: r.categoryId != null ? { id: String(r.categoryId) } : null,
    title: r.title ?? null,
    status: r.status,
    detail: r.detail,
    solution: r.solution,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
app.get("/incident_logs", async (req, res) => {
  try {
    const where = [];
    const vals = [];
    const status = req.query?.status ? String(req.query.status).trim() : null;
    if (status) {
      where.push(`status = $${vals.length + 1}`);
      vals.push(status);
    }
    const companyId =
      req.query?.companyId
        ? String(req.query.companyId).trim()
        : req.query?.["company.id"]
          ? String(req.query["company.id"]).trim()
          : null;
    if (companyId) {
      where.push(`company_id = $${vals.length + 1}`);
      vals.push(companyId);
    }
    const productId = req.query?.productId ? String(req.query.productId).trim() : null;
    if (productId) {
      where.push(`product_id = $${vals.length + 1}`);
      vals.push(productId);
    }
    const categoryId =
      req.query?.categoryId
        ? String(req.query.categoryId).trim()
        : req.query?.["category.id"]
          ? String(req.query["category.id"]).trim()
          : null;
    if (categoryId) {
      where.push(`category_id = $${vals.length + 1}`);
      vals.push(categoryId);
    }
    const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

    const total = (await pgq(`SELECT COUNT(1)::int AS c FROM incident_logs${whereSql}`, vals)).rows[0]
      .c;
    const { start, limit } = parseRange(req.query);
    const { expr, order } = parseSort(req.query, ["productId", "status", "createdAt"]);
    const orderExpr =
      expr === "productId"
        ? "product_id"
        : expr === "status"
          ? "status"
          : expr === "createdAt"
            ? "created_at"
            : "created_at";

    const r = await pgq(
      `SELECT id, product_id AS "productId", company_id AS "companyId", category_id AS "categoryId",
              title, status, detail, solution, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM incident_logs
       ${whereSql}
       ORDER BY ${orderExpr} ${order}
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, limit, start],
    );
    res.set("X-Total-Count", String(total));
    res.set("Access-Control-Expose-Headers", "X-Total-Count");
    res.json(r.rows.map(normalizeIncRow));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.get("/incident_logs/:id", async (req, res) => {
  try {
    const r = await pgq(
      `SELECT id, product_id AS "productId", company_id AS "companyId", category_id AS "categoryId",
              title, status, detail, solution, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM incident_logs WHERE id = $1`,
      [req.params.id],
    );
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json(normalizeIncRow(r.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.post("/incident_logs", async (req, res) => {
  try {
    const b = req.body || {};
    const productId = b.productId ? String(b.productId).trim() : null;
    const companyId = b.company?.id ?? b.companyId ?? null;
    const categoryId = b.category?.id ?? b.categoryId ?? null;
    const detail = b.detail ?? null;
    if (!productId || !companyId || !categoryId || !detail) {
      return res
        .status(400)
        .json({ error: "productId, company.id, category.id and detail are required" });
    }
    const now = new Date().toISOString();
    const createdAt = b.createdAt ?? now;
    const updatedAt = b.updatedAt ?? now;
    const r = await pgq(
      `INSERT INTO incident_logs
         (company_id, product_id, category_id, title, status, detail, solution, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [companyId, productId, categoryId, b.title ?? null, b.status ?? "draft", detail, b.solution ?? null, createdAt, updatedAt],
    );
    const id = r.rows[0].id;
    const one = await pgq(
      `SELECT id, product_id AS "productId", company_id AS "companyId", category_id AS "categoryId",
              title, status, detail, solution, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM incident_logs WHERE id = $1`,
      [id],
    );
    res.status(201).json(normalizeIncRow(one.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.patch("/incident_logs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cur = await pgq(
      `SELECT id, product_id AS "productId", company_id AS "companyId", category_id AS "categoryId",
              title, status, detail, solution, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM incident_logs WHERE id = $1`,
      [id],
    );
    if (!cur.rowCount) return res.status(404).json({ error: "Not found" });
    const c = cur.rows[0];
    const next = {
      productId: req.body?.productId != null ? String(req.body.productId) : c.productId,
      companyId:
        req.body?.company?.id != null
          ? String(req.body.company.id)
          : req.body?.companyId != null
            ? String(req.body.companyId)
            : c.companyId,
      categoryId:
        req.body?.category?.id != null
          ? String(req.body.category.id)
          : req.body?.categoryId != null
            ? String(req.body.categoryId)
            : c.categoryId,
      title: req.body?.title != null ? req.body.title : c.title,
      status: req.body?.status != null ? req.body.status : c.status,
      detail: req.body?.detail != null ? req.body.detail : c.detail,
      solution: req.body?.solution != null ? req.body.solution : c.solution,
      updatedAt: req.body?.updatedAt != null ? req.body.updatedAt : new Date().toISOString(),
    };
    await pgq(
      `UPDATE incident_logs
       SET product_id=$1, company_id=$2, category_id=$3, title=$4, status=$5, detail=$6, solution=$7, updated_at=$8
       WHERE id=$9`,
      [
        next.productId,
        next.companyId,
        next.categoryId,
        next.title,
        next.status,
        next.detail,
        next.solution,
        next.updatedAt,
        id,
      ],
    );
    res.json({
      id,
      productId: next.productId,
      company: next.companyId ? { id: String(next.companyId) } : null,
      category: next.categoryId ? { id: String(next.categoryId) } : null,
      title: next.title,
      status: next.status,
      detail: next.detail,
      solution: next.solution,
      createdAt: c.createdAt,
      updatedAt: next.updatedAt,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.delete("/incident_logs/:id", async (req, res) => {
  try {
    const del = await pgq(`DELETE FROM incident_logs WHERE id = $1`, [req.params.id]);
    if (!del.rowCount) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== RESULTS META ==================
app.get("/resultsMeta", async (req, res) => {
  try {
    const y = Number(req.query.year);
    const m = Number(req.query.month);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return res.json([]);
    const r = await pgq(
      `SELECT id, year, month, test_set_name AS "testSetName",
              clean_sample_size AS "cleanSampleSize",
              locked, snapshot_at AS "lastSnapshotAt",
              last_unlock_at AS "lastUnlockAt",
              private_flag AS "privateFlag", inv_res_flag AS "invResFlag"
       FROM results_meta
       WHERE year = $1 AND month = $2
       LIMIT 1`,
      [y, m],
    );
    if (!r.rowCount) return res.json([]);
    const meta = r.rows[0];
    // load event log
    const log = await pgq(
      `SELECT action, at_ts FROM results_meta_eventlog WHERE results_meta_id = $1 ORDER BY at_ts ASC`,
      [meta.id],
    );
    res.json([
      {
        ...meta,
        locked: toBool(meta.locked),
        privateFlag: toBool(meta.privateFlag),
        invResFlag: toBool(meta.invResFlag),
        eventLog: log.rows.map((x) => ({ action: x.action, at: x.at_ts })),
      },
    ]);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.post("/resultsMeta", async (req, res) => {
  try {
    const b = req.body || {};
    const y = Number(b.year);
    const m = Number(b.month);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return res.status(400).json({ error: "year/month required" });
    const ins = await pgq(
      `INSERT INTO results_meta
         (year, month, test_set_name, clean_sample_size, locked, snapshot_at, last_unlock_at, private_flag, inv_res_flag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, year, month, test_set_name AS "testSetName",
                 clean_sample_size AS "cleanSampleSize",
                 locked, snapshot_at AS "lastSnapshotAt",
                 last_unlock_at AS "lastUnlockAt",
                 private_flag AS "privateFlag", inv_res_flag AS "invResFlag"`,
      [
        y,
        m,
        b.testSetName ?? null,
        intOrNull(b.cleanSampleSize),
        toBool(b.locked),
        b.lastSnapshotAt ?? null,
        b.lastUnlockAt ?? null,
        toBool(b.privateFlag),
        toBool(b.invResFlag),
      ],
    );
    const meta = ins.rows[0];
    // If we can infer an event (snapshot/unlock), write it:
    if (b.lastSnapshotAt) {
      await pgq(
        `INSERT INTO results_meta_eventlog (results_meta_id, action, at_ts) VALUES ($1,$2,$3)`,
        [meta.id, "snapshot", b.lastSnapshotAt],
      );
    }
    if (b.lastUnlockAt) {
      await pgq(
        `INSERT INTO results_meta_eventlog (results_meta_id, action, at_ts) VALUES ($1,$2,$3)`,
        [meta.id, "unlock", b.lastUnlockAt],
      );
    }
    res.status(201).json({ ...meta, locked: toBool(meta.locked), privateFlag: toBool(meta.privateFlag), invResFlag: toBool(meta.invResFlag), eventLog: [] });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
app.patch("/resultsMeta/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cur = await pgq(
      `SELECT id, year, month, test_set_name AS "testSetName",
              clean_sample_size AS "cleanSampleSize",
              locked, snapshot_at AS "lastSnapshotAt",
              last_unlock_at AS "lastUnlockAt",
              private_flag AS "privateFlag", inv_res_flag AS "invResFlag"
       FROM results_meta WHERE id = $1`,
      [id],
    );
    if (!cur.rowCount) return res.status(404).json({ error: "Not found" });
    const c = cur.rows[0];
    const next = {
      testSetName: req.body?.testSetName ?? c.testSetName,
      cleanSampleSize: intOrNull(req.body?.cleanSampleSize) ?? c.cleanSampleSize,
      locked: req.body?.locked != null ? toBool(req.body.locked) : c.locked,
      lastSnapshotAt: req.body?.lastSnapshotAt ?? c.lastSnapshotAt,
      lastUnlockAt: req.body?.lastUnlockAt ?? c.lastUnlockAt,
      privateFlag: req.body?.privateFlag != null ? toBool(req.body.privateFlag) : c.privateFlag,
      invResFlag: req.body?.invResFlag != null ? toBool(req.body.invResFlag) : c.invResFlag,
    };
    const upd = await pgq(
      `UPDATE results_meta
       SET test_set_name=$1, clean_sample_size=$2, locked=$3, snapshot_at=$4, last_unlock_at=$5,
           private_flag=$6, inv_res_flag=$7
       WHERE id=$8
       RETURNING id, year, month, test_set_name AS "testSetName",
                 clean_sample_size AS "cleanSampleSize",
                 locked, snapshot_at AS "lastSnapshotAt",
                 last_unlock_at AS "lastUnlockAt",
                 private_flag AS "privateFlag", inv_res_flag AS "invResFlag"`,
      [
        next.testSetName,
        next.cleanSampleSize,
        next.locked,
        next.lastSnapshotAt,
        next.lastUnlockAt,
        next.privateFlag,
        next.invResFlag,
        id,
      ],
    );
    // Write event log entries if inferred:
    if (req.body?.lastSnapshotAt) {
      await pgq(
        `INSERT INTO results_meta_eventlog (results_meta_id, action, at_ts) VALUES ($1,$2,$3)`,
        [id, "snapshot", req.body.lastSnapshotAt],
      );
    }
    if (req.body?.lastUnlockAt) {
      await pgq(
        `INSERT INTO results_meta_eventlog (results_meta_id, action, at_ts) VALUES ($1,$2,$3)`,
        [id, "unlock", req.body.lastUnlockAt],
      );
    }
    const meta = upd.rows[0];
    const log = await pgq(
      `SELECT action, at_ts FROM results_meta_eventlog WHERE results_meta_id = $1 ORDER BY at_ts ASC`,
      [id],
    );
    res.json({
      ...meta,
      locked: toBool(meta.locked),
      privateFlag: toBool(meta.privateFlag),
      invResFlag: toBool(meta.invResFlag),
      eventLog: log.rows.map((x) => ({ action: x.action, at: x.at_ts })),
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ================== RESULTS ROWS ==================
app.get("/resultsRows", async (req, res) => {
  try {
    const y = Number(req.query.year);
    const m = Number(req.query.month);
    const pid = req.query.productId ? String(req.query.productId).trim().toUpperCase() : null;
    if (!Number.isFinite(y) || !Number.isFinite(m)) return res.json([]);
    const where = ["year = $1", "month = $2"];
    const vals = [y, m];
    if (pid) {
      where.push(`UPPER(product_id) = $3`);
      vals.push(pid);
    }
    const r = await pgq(
      `SELECT id, year, month, product_id AS "productId", product_name AS "productName",
              vm_name AS "vmName", stage, cert_miss AS "certMiss", fps,
              cfn_preview AS "cfnPreview", cfn_final AS "cfnFinal",
              private_flag AS "privateFlag", inv_res_flag AS "invResFlag"
       FROM results_rows WHERE ${where.join(" AND ")}`,
      vals,
    );
    const rows = r.rows.map((x) => ({
      ...x,
      privateFlag: toBool(x.privateFlag),
      invResFlag: toBool(x.invResFlag),
    }));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/resultsRows", async (req, res) => {
  try {
    const b = req.body || {};
    const y = Number(b.year);
    const m = Number(b.month);
    const pid = String(b.productId || "").trim().toUpperCase();
    if (!Number.isFinite(y) || !Number.isFinite(m) || !pid)
      return res.status(400).json({ error: "year/month/productId required" });
    const r = await pgq(
      `INSERT INTO results_rows
         (year, month, product_id, product_name, vm_name, stage,
          cert_miss, fps, cfn_preview, cfn_final, private_flag, inv_res_flag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, year, month, product_id AS "productId", product_name AS "productName",
                 vm_name AS "vmName", stage, cert_miss AS "certMiss", fps,
                 cfn_preview AS "cfnPreview", cfn_final AS "cfnFinal",
                 private_flag AS "privateFlag", inv_res_flag AS "invResFlag"`,
      [
        y,
        m,
        pid,
        b.productName ?? null,
        b.vmName ?? null,
        b.stage ?? null,
        intOrNull(b.certMiss),
        numOrNull(b.fps),
        numOrNull(b.cfnPreview),
        numOrNull(b.cfnFinal),
        toBool(b.privateFlag),
        toBool(b.invResFlag),
      ],
    );
    const row = r.rows[0];
    res.status(201).json({
      ...row,
      privateFlag: toBool(row.privateFlag),
      invResFlag: toBool(row.invResFlag),
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.patch("/resultsRows/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cur = await pgq(
      `SELECT id, year, month, product_id AS "productId", product_name AS "productName",
              vm_name AS "vmName", stage, cert_miss AS "certMiss", fps,
              cfn_preview AS "cfnPreview", cfn_final AS "cfnFinal",
              private_flag AS "privateFlag", inv_res_flag AS "invResFlag"
       FROM results_rows WHERE id = $1`,
      [id],
    );
    if (!cur.rowCount) return res.status(404).json({ error: "Not found" });
    const c = cur.rows[0];
    const next = {
      productName: req.body?.productName ?? c.productName,
      vmName: req.body?.vmName ?? c.vmName,
      stage: req.body?.stage ?? c.stage,
      certMiss: req.body?.certMiss != null ? intOrNull(req.body.certMiss) : c.certMiss,
      fps: req.body?.fps != null ? numOrNull(req.body.fps) : c.fps,
      cfnPreview: req.body?.cfnPreview != null ? numOrNull(req.body.cfnPreview) : c.cfnPreview,
      cfnFinal: req.body?.cfnFinal != null ? numOrNull(req.body.cfnFinal) : c.cfnFinal,
      privateFlag: req.body?.privateFlag != null ? toBool(req.body.privateFlag) : c.privateFlag,
      invResFlag: req.body?.invResFlag != null ? toBool(req.body.invResFlag) : c.invResFlag,
    };
    const upd = await pgq(
      `UPDATE results_rows
       SET product_name=$1, vm_name=$2, stage=$3, cert_miss=$4, fps=$5, cfn_preview=$6, cfn_final=$7,
           private_flag=$8, inv_res_flag=$9
       WHERE id=$10
       RETURNING id, year, month, product_id AS "productId", product_name AS "productName",
                 vm_name AS "vmName", stage, cert_miss AS "certMiss", fps,
                 cfn_preview AS "cfnPreview", cfn_final AS "cfnFinal",
                 private_flag AS "privateFlag", inv_res_flag AS "invResFlag"`,
      [
        next.productName,
        next.vmName,
        next.stage,
        next.certMiss,
        next.fps,
        next.cfnPreview,
        next.cfnFinal,
        next.privateFlag,
        next.invResFlag,
        id,
      ],
    );
    const row = upd.rows[0];
    res.json({ ...row, privateFlag: toBool(row.privateFlag), invResFlag: toBool(row.invResFlag) });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ------------------ server bootstrap ------------------
const PORT = process.env.PORT || 4000;

if (require.main === module && !global.__VB100_SERVER_STARTED__) {
  global.__VB100_SERVER_STARTED__ = true;

  const server = app.listen(PORT, () => {
    console.log(`VB100 API (PG) on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} foglalt ebben a processzben (valószínű dupla listen). ` +
        `Adj meg másik PORT-ot (.env), pl. 4001, vagy javítsd a duplázást.`
      );
    } else {
      console.error("HTTP szerver hiba:", err);
    }
    process.exit(1);
  });

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async () => {
      try { await pool.end(); } catch {}
      process.exit(0);
    });
  }
}

module.exports = app;

