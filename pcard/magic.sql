-- =========================
-- companies (main)
-- =========================
CREATE TABLE companies (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  company_emails   TEXT[],
  product          TEXT,
  product_id       TEXT,
  interface_type   TEXT,
  interface_other  TEXT,        -- for interfaceType: "other" text
  time_zone        TEXT,
  wd_manually_off  BOOLEAN,
  pct_manually_off BOOLEAN,
  install_procedure TEXT,
  version_check_path TEXT,
  license_expiry   TIMESTAMPTZ,
  license_expiry_mode TEXT,
  expiry_perpetual BOOLEAN,
  expiry_none      BOOLEAN,
  update_procedure TEXT,
  activation_type  TEXT,
  activation_email TEXT,
  activation_password TEXT,
  activation_serial TEXT,
  has_rt           BOOLEAN,
  has_od           BOOLEAN,
  scan_type        TEXT,
  log_path         TEXT,
  has_gui          BOOLEAN,
  gui              TEXT,
  logo             TEXT,
  custom_scan_json jsonb,      -- store original customScan object
  install_steps    jsonb,
--additional_json  jsonb,      -- catch-all for any other nested/unexpected fields
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ
);

-- =========================
-- categories
-- =========================
CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  title TEXT NOT NULL
);

-- =========================
-- incident_logs (from incident_logs array)
-- =========================
CREATE TABLE incident_logs (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  product_id  TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title       TEXT,
  status      TEXT,
  detail      TEXT,
  solution    TEXT,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ,
  raw_json    jsonb
);

-- =========================
-- calendar_events
-- =========================
CREATE TABLE calendar_events (
  id           SERIAL PRIMARY KEY,
  title        TEXT,
  date         TIMESTAMPTZ,
  performed_by TEXT,
  performed_at_utc TIMESTAMPTZ,
  description  TEXT
--raw_json     jsonb
);

-- =========================
-- stages
-- =========================
CREATE TABLE stages (
  id    SERIAL PRIMARY KEY,
  key   TEXT UNIQUE,
  title TEXT,
  "order" INTEGER
);

-- =========================
-- kanban + checklist + comments
-- =========================
CREATE TABLE kanban (
  id          SERIAL PRIMARY KEY,
  title       TEXT,
  description TEXT,
  stage_id   INTEGER REFERENCES stages(id) ON DELETE SET NULL,                 -- maps to stages.key
  due_date    TIMESTAMPTZ,
  calendar_event_id INTEGER REFERENCES calendar_events(id) ON DELETE SET NULL
--raw_json    jsonb
);

CREATE TABLE kanban_checklist (
  id SERIAL PRIMARY KEY,              -- the checklist element id from JSON
  kanban_id INTEGER REFERENCES kanban(id) ON DELETE CASCADE,
  item_order INTEGER,
  text TEXT,
  done BOOLEAN
);

CREATE TABLE kanban_comments (
  id SERIAL PRIMARY KEY,
  kanban_id INTEGER REFERENCES kanban(id) ON DELETE CASCADE,
  author TEXT,
  comment_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
--raw_json jsonb
);

-- =========================
-- results_meta (resultsMeta array) + event log entries
-- =========================
CREATE TABLE results_meta (
  id SERIAL PRIMARY KEY,
  year INTEGER,
  month INTEGER,
  test_set_name TEXT,
  clean_sample_size INTEGER,
  locked BOOLEAN,
  snapshot_at TIMESTAMPTZ,
  last_unlock_at TIMESTAMPTZ,
  private_flag BOOLEAN,
  inv_res_flag BOOLEAN
--extra_json jsonb
);

CREATE TABLE results_meta_eventlog (
  id SERIAL PRIMARY KEY,
  results_meta_id INTEGER REFERENCES results_meta(id) ON DELETE CASCADE,
  action TEXT,
  at_ts TIMESTAMPTZ
);

-- =========================
-- results_rows (resultsRows / resultsRows-ish data)
-- =========================
CREATE TABLE results_rows (
  id SERIAL PRIMARY KEY,
  year INTEGER,
  month INTEGER,
  product_id TEXT,
  product_name TEXT,
  vm_name TEXT,
  stage TEXT,
  cert_miss INTEGER,
  fps NUMERIC,      -- sometimes large or non-integer; keep numeric or integer depending on real data
  cfn_preview NUMERIC,
  cfn_final NUMERIC,
  private_flag BOOLEAN,
  inv_res_flag BOOLEAN
--extra_json jsonb
);

-- =========================
-- Helpful indexes
-- =========================
CREATE INDEX ON incident_logs(company_id);
CREATE INDEX ON incident_logs(category_id);
CREATE INDEX ON kanban(stage_id);
CREATE INDEX ON results_rows(product_id);
CREATE INDEX ON companies(product_id);
CREATE INDEX ON companies(product);
CREATE INDEX ON companies(name);
CREATE INDEX ON categories(title);
CREATE INDEX ON kanban(due_date);
CREATE INDEX ON results_meta(snapshot_at);


-- =========================
-- Notes:
-- 1) I kept original nested objects in jsonb columns (custom_scan_json, extra_json, raw_json)
--    so you can query them with JSON operators if migration needs to preserve unknown fields.
-- 2) image/data URLs can be stored as-is (image_data_url) or decoded to BYTEA for blob storage.
--    During import, strip the leading "data:<mime>;base64," and decode base64 to put into image_bytes.
-- 3) sample fields like fps/cfnPreview/cfnFinal sometimes contain empty strings in your file;
--    importing scripts should handle '' -> NULL, strings -> numeric parsing or store as TEXT if mixed.
