import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const DB_URL =
  process.env.DATABASE_URL || "postgres://vb100:vb100@localhost:5432/vb100";
const ALLOWED_DOMAIN = "virusbulletin.com";

function usage() {
  console.log(`Usage:
  node tools/users.mjs list
  node tools/users.mjs export [--format json|csv]
  node tools/users.mjs add --email <email> [--name <name>] --password <password>
  node tools/users.mjs reset --email <email> --password <password>
  node tools/users.mjs deactivate --email <email>
  node tools/users.mjs reactivate --email <email>
  node tools/users.mjs batch --file <users.json>
`);
}

function arg(flag, def = null) {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function has(flag) {
  return process.argv.includes(flag);
}

async function connect() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar TEXT,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

function ensureDomain(email) {
  const v = String(email || "")
    .trim()
    .toLowerCase();
  if (!v.endsWith("@" + ALLOWED_DOMAIN)) {
    throw new Error(`Only @${ALLOWED_DOMAIN} emails are allowed: ${v}`);
  }
  return v;
}

async function listUsers(client) {
  const { rows } = await client.query(`
    SELECT email, name, is_active, must_change_password, created_at, updated_at
    FROM users
    ORDER BY email ASC
  `);
  console.table(rows);
}

function csvEscape(value) {
  const s = String(value ?? "");
  const needsQuote = /[",\n]/.test(s);
  const escaped = s.replaceAll(`"`, `""`);
  return needsQuote ? `"${escaped}"` : escaped;
}

async function exportUsers(client, fmt) {
  const { rows } = await client.query(`
    SELECT email, name, is_active, must_change_password, created_at, updated_at
    FROM users
    ORDER BY email ASC
  `);

  if (fmt === "csv") {
    const header =
      "email,name,is_active,must_change_password,created_at,updated_at";
    const lines = rows.map((r) =>
      [
        r.email,
        r.name || "",
        r.is_active,
        r.must_change_password,
        r.created_at?.toISOString?.() || "",
        r.updated_at?.toISOString?.() || "",
      ]
        .map(csvEscape)
        .join(","),
    );
    console.log([header, ...lines].join("\n"));
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
}

async function addUser(client, email, name, password) {
  const vEmail = ensureDomain(email);
  if (!password) throw new Error("Password is required for add");
  const hash = await bcrypt.hash(String(password), 10);

  await client.query(
    `INSERT INTO users (email, name, avatar, password_hash, must_change_password, is_active)
     VALUES ($1, COALESCE($2, split_part($1,'@',1)), '', $3, true, true)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           must_change_password = true,
           is_active = true,
           -- only update name if a new name was provided (EXCLUDED.name differs from users.name because EXCLUDED.name comes from INSERT side)
           name = COALESCE($2, users.name),
           updated_at = now()`,
    [vEmail, name ?? null, hash],
  );
  console.log(`Upserted: ${vEmail}`);
}

async function resetPassword(client, email, password) {
  const vEmail = ensureDomain(email);
  if (!password) throw new Error("Password is required for reset");
  const hash = await bcrypt.hash(String(password), 10);

  await client.query(
    `
    UPDATE users
    SET password_hash=$1, must_change_password=true, updated_at=now()
    WHERE email=$2
    `,
    [hash, vEmail],
  );

  console.log(`Password reset for: ${vEmail}`);
}

async function setActive(client, email, isActive) {
  const vEmail = ensureDomain(email);
  await client.query(
    `
    UPDATE users
    SET is_active=$1, updated_at=now()
    WHERE email=$2
    `,
    [!!isActive, vEmail],
  );
  console.log(`${isActive ? "Reactivated" : "Deactivated"}: ${vEmail}`);
}

async function batchUsers(client, filePath) {
  const p = path.resolve(process.cwd(), filePath);
  const text = fs.readFileSync(p, "utf8");
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error("Batch file must be an array");
  for (const u of arr) {
    const email = ensureDomain(u.email);
    const name = u.name ?? null;
    const password = u.password;
    if (!password) {
      console.warn(`Skipping ${email} (no password provided in batch)`);
      continue;
    }
    await addUser(client, email, name, password);
  }
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd) return usage();

  const client = await connect();
  try {
    await ensureTable(client);

    if (cmd === "list") {
      await listUsers(client);
    } else if (cmd === "export") {
      const fmt = arg("--format", "json");
      await exportUsers(client, fmt);
    } else if (cmd === "add") {
      const email = arg("--email");
      const name = arg("--name", null);
      const password = arg("--password");
      if (!email || !password)
        throw new Error("add requires --email and --password");
      await addUser(client, email, name, password);
    } else if (cmd === "reset") {
      const email = arg("--email");
      const password = arg("--password");
      if (!email || !password)
        throw new Error("reset requires --email and --password");
      await resetPassword(client, email, password);
    } else if (cmd === "deactivate") {
      const email = arg("--email");
      if (!email) throw new Error("deactivate requires --email");
      await setActive(client, email, false);
    } else if (cmd === "reactivate") {
      const email = arg("--email");
      if (!email) throw new Error("reactivate requires --email");
      await setActive(client, email, true);
    } else if (cmd === "batch") {
      const file = arg("--file");
      if (!file) throw new Error("batch requires --file <path.json>");
      await batchUsers(client, file);
    } else {
      usage();
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
