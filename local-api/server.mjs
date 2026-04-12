
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const HOST = process.env.LOCAL_API_HOST || "127.0.0.1";
const PORT = Number(process.env.LOCAL_API_PORT || 8787);
const DB_PATH = process.env.LOCAL_DB_PATH || path.join(process.cwd(), "local-api", "data", "security-baseline.sqlite");
const ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin1234";
const AUTH_BOOTSTRAP_KEY = "auth_bootstrap_v2";
const DEFAULT_PROVIDER_ID = "openai";
const DEFAULT_PROVIDER_MODEL = "gpt-4.1-mini";
const ENCRYPTED_SECRET_PREFIX = "enc:v1:";
const LOCAL_SECRETS_KEY_PATH =
  process.env.LOCAL_SECRETS_KEY_PATH ||
  path.join(path.dirname(DB_PATH), "aureum-secrets.key");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function loadOrCreateSecretMaterial() {
  const envSecret = String(process.env.AUREUM_MASTER_KEY || "").trim();
  if (envSecret) {
    return envSecret;
  }

  try {
    const fromFile = fs.readFileSync(LOCAL_SECRETS_KEY_PATH, "utf8").trim();
    if (fromFile) {
      return fromFile;
    }
  } catch {
    // noop
  }

  const generated = randomBytes(32).toString("base64");
  fs.writeFileSync(LOCAL_SECRETS_KEY_PATH, `${generated}\n`, { mode: 0o600 });
  return generated;
}

const SECRETS_MASTER_KEY = createHash("sha256")
  .update(loadOrCreateSecretMaterial())
  .digest();

function isEncryptedSecret(value) {
  return typeof value === "string" && value.startsWith(ENCRYPTED_SECRET_PREFIX);
}

function encryptSecret(plainText) {
  const plain = String(plainText || "").trim();
  if (!plain) return "";
  if (isEncryptedSecret(plain)) return plain;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", SECRETS_MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_SECRET_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSecret(encryptedValue) {
  const raw = String(encryptedValue || "").trim();
  if (!raw) return "";
  if (!isEncryptedSecret(raw)) return raw;

  const payload = raw.slice(ENCRYPTED_SECRET_PREFIX.length);
  const [ivBase64, authTagBase64, cipherBase64] = payload.split(":");
  if (!ivBase64 || !authTagBase64 || !cipherBase64) {
    throw new Error("Invalid encrypted secret payload");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const cipherText = Buffer.from(cipherBase64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", SECRETS_MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return plain.toString("utf8");
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  password_changed_at TEXT
);

CREATE TABLE IF NOT EXISTS local_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  avg_confidence REAL,
  category TEXT,
  control_count INTEGER,
  created_at TEXT NOT NULL,
  current_version INTEGER NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  output_language TEXT,
  source_count INTEGER,
  status TEXT NOT NULL,
  tags TEXT,
  team_id TEXT,
  technology TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vendor TEXT,
  version TEXT
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  added_at TEXT NOT NULL,
  confidence REAL,
  extracted_content TEXT,
  extraction_method TEXT,
  extraction_model TEXT,
  extraction_tokens INTEGER,
  file_name TEXT,
  file_type TEXT,
  name TEXT NOT NULL,
  origin TEXT,
  preview TEXT,
  previous_extracted_content TEXT,
  previous_extraction_model TEXT,
  previous_extraction_tokens INTEGER,
  processed_at TEXT,
  project_id TEXT NOT NULL,
  raw_content TEXT,
  status TEXT NOT NULL,
  tags TEXT,
  type TEXT NOT NULL,
  url TEXT,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS controls (
  id TEXT PRIMARY KEY,
  applicability TEXT,
  automation TEXT,
  category TEXT,
  confidence_score REAL,
  control_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  criticality TEXT NOT NULL,
  default_behavior_limitations TEXT,
  description TEXT,
  framework_mappings TEXT,
  project_id TEXT NOT NULL,
  "references" TEXT,
  review_status TEXT NOT NULL,
  reviewer_notes TEXT,
  security_risk TEXT,
  source_traceability TEXT,
  threat_scenarios TEXT,
  title TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER
);

CREATE TABLE IF NOT EXISTS baseline_versions (
  id TEXT PRIMARY KEY,
  changes_summary TEXT,
  control_count INTEGER,
  controls_snapshot TEXT,
  created_at TEXT NOT NULL,
  project_id TEXT NOT NULL,
  project_snapshot TEXT,
  published_at TEXT,
  sources_snapshot TEXT,
  status TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS version_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  details TEXT,
  from_version INTEGER,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version_number INTEGER
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  control_id TEXT,
  created_at TEXT NOT NULL,
  is_read INTEGER NOT NULL,
  message TEXT NOT NULL,
  project_id TEXT,
  team_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  joined_at TEXT NOT NULL,
  role TEXT NOT NULL,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id TEXT PRIMARY KEY,
  api_key_encrypted TEXT,
  connection_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  extra_config TEXT,
  is_default INTEGER NOT NULL,
  provider_id TEXT NOT NULL,
  selected_model TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  notify_control_status INTEGER NOT NULL,
  notify_source_processed INTEGER NOT NULL,
  notify_team_member_joined INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_rule_values (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rule_template_versions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  label TEXT NOT NULL,
  snapshot TEXT,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_activity_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata TEXT,
  new_status TEXT NOT NULL,
  previous_status TEXT,
  source_id TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_provider_configs_user_provider ON ai_provider_configs(user_id, provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_rule_values_user_rule ON user_rule_values(user_id, rule_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_project_id ON sources(project_id);
CREATE INDEX IF NOT EXISTS idx_controls_project_id ON controls(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_project_id ON baseline_versions(project_id);
`;

db.exec(SCHEMA_SQL);

const QUERYABLE_TABLES = new Set([
  "projects",
  "sources",
  "controls",
  "baseline_versions",
  "version_audit_logs",
  "notifications",
  "teams",
  "team_members",
  "ai_provider_configs",
  "user_preferences",
  "user_rule_values",
  "rule_template_versions",
  "source_activity_logs",
]);

const JSON_COLUMNS = {
  projects: new Set(["tags"]),
  sources: new Set(["tags"]),
  controls: new Set(["references", "framework_mappings", "source_traceability", "threat_scenarios"]),
  baseline_versions: new Set(["controls_snapshot", "sources_snapshot", "project_snapshot"]),
  version_audit_logs: new Set(["details"]),
  ai_provider_configs: new Set(["extra_config"]),
  rule_template_versions: new Set(["snapshot"]),
  source_activity_logs: new Set(["metadata"]),
};

const BOOLEAN_COLUMNS = {
  ai_provider_configs: new Set(["enabled", "is_default"]),
  notifications: new Set(["is_read"]),
  user_preferences: new Set([
    "notify_control_status",
    "notify_source_processed",
    "notify_team_member_joined",
  ]),
};

const TABLE_DEFAULTS = {
  projects: {
    status: "draft",
    current_version: 0,
    control_count: 0,
    source_count: 0,
    avg_confidence: 0,
    tags: [],
  },
  sources: {
    status: "pending",
    type: "document",
    confidence: 0,
    tags: [],
  },
  controls: {
    criticality: "medium",
    review_status: "pending",
    references: [],
    framework_mappings: [],
    source_traceability: [],
    threat_scenarios: [],
    version: 1,
  },
  baseline_versions: {
    status: "draft",
    control_count: 0,
    controls_snapshot: [],
    sources_snapshot: [],
    project_snapshot: {},
    changes_summary: "",
  },
  notifications: {
    type: "general",
    message: "",
    is_read: false,
  },
  teams: {},
  team_members: {
    role: "member",
  },
  ai_provider_configs: {
    enabled: false,
    is_default: false,
    connection_status: "idle",
    extra_config: {},
  },
  user_preferences: {
    notify_control_status: true,
    notify_source_processed: true,
    notify_team_member_joined: true,
  },
  user_rule_values: {},
  rule_template_versions: {
    label: "Snapshot",
    snapshot: {},
  },
  source_activity_logs: {
    event_type: "status_change",
    metadata: {},
  },
  version_audit_logs: {
    details: {},
  },
};

const USER_SCOPED_TABLES = [
  "projects",
  "sources",
  "controls",
  "baseline_versions",
  "version_audit_logs",
  "notifications",
  "team_members",
  "ai_provider_configs",
  "user_preferences",
  "user_rule_values",
  "rule_template_versions",
  "source_activity_logs",
];

const tableColumnsCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function getTableColumns(table) {
  if (!tableColumnsCache.has(table)) {
    const rows = db.prepare(`PRAGMA table_info(${quoteIdent(table)});`).all();
    const columns = new Set(rows.map((row) => row.name));
    tableColumnsCache.set(table, columns);
  }
  return tableColumnsCache.get(table);
}

function normalizeUsername(rawValue) {
  return String(rawValue || "").trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9._-]{3,64}$/.test(username);
}

function validateNewPassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    return "Password must have at least 8 characters";
  }
  if (newPassword === currentPassword) {
    return "New password must be different from the current password";
  }
  return null;
}

function getSystemSetting(key) {
  const row = db
    .prepare("SELECT value FROM system_settings WHERE key = ? LIMIT 1;")
    .get(key);
  return row?.value || null;
}

function setSystemSetting(key, value) {
  const now = nowIso();
  db.prepare(
    `
      INSERT INTO system_settings(key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at;
    `
  ).run(key, String(value), now);
}

function ensureUserTableColumns() {
  const columns = getTableColumns("users");
  const migrations = [];

  if (!columns.has("role")) {
    migrations.push("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';");
  }
  if (!columns.has("must_change_password")) {
    migrations.push("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;");
  }
  if (!columns.has("updated_at")) {
    migrations.push("ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';");
  }
  if (!columns.has("password_changed_at")) {
    migrations.push("ALTER TABLE users ADD COLUMN password_changed_at TEXT;");
  }

  if (migrations.length > 0) {
    for (const sql of migrations) {
      db.exec(sql);
    }
    tableColumnsCache.delete("users");
  }

  db.prepare(
    `
      UPDATE users
      SET role = COALESCE(NULLIF(role, ''), 'user');
    `
  ).run();
  db.prepare(
    `
      UPDATE users
      SET must_change_password = COALESCE(must_change_password, 0);
    `
  ).run();
  db.prepare(
    `
      UPDATE users
      SET updated_at = CASE
        WHEN updated_at IS NULL OR updated_at = '' THEN created_at
        ELSE updated_at
      END;
    `
  ).run();
}

function getUserByUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  return db
    .prepare(
      `
        SELECT id, email, password_hash, role, must_change_password, created_at, updated_at, password_changed_at
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1;
      `
    )
    .get(normalized);
}

function isAdminUser(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function seedUserSupportRows(userId) {
  const pref = db
    .prepare("SELECT id FROM user_preferences WHERE user_id = ? LIMIT 1;")
    .get(userId);

  if (!pref) {
    executeDbQuery(
      {
        table: "user_preferences",
        action: "insert",
        values: {
          user_id: userId,
          notify_control_status: true,
          notify_source_processed: true,
          notify_team_member_joined: true,
        },
      },
      { id: userId }
    );
  }

  const cfg = db
    .prepare("SELECT id FROM ai_provider_configs WHERE user_id = ? AND provider_id = ? LIMIT 1;")
    .get(userId, DEFAULT_PROVIDER_ID);

  if (!cfg) {
    executeDbQuery(
      {
        table: "ai_provider_configs",
        action: "insert",
        values: {
          user_id: userId,
          provider_id: DEFAULT_PROVIDER_ID,
          enabled: true,
          selected_model: DEFAULT_PROVIDER_MODEL,
          is_default: true,
          connection_status: "idle",
          extra_config: {
            max_tokens: 65000,
          },
        },
      },
      { id: userId }
    );
  }
}

function purgeNonAdminData(adminUserId) {
  runInTransaction(() => {
    for (const table of USER_SCOPED_TABLES) {
      db.prepare(`DELETE FROM ${quoteIdent(table)} WHERE user_id <> ?;`).run(adminUserId);
    }

    db.prepare("DELETE FROM teams WHERE owner_id <> ?;").run(adminUserId);
    db.prepare("DELETE FROM local_sessions WHERE user_id <> ?;").run(adminUserId);
    db.prepare("DELETE FROM users WHERE id <> ?;").run(adminUserId);
    db.prepare("DELETE FROM team_members WHERE team_id NOT IN (SELECT id FROM teams);").run();
  });
}

function isJsonColumn(table, column) {
  return Boolean(JSON_COLUMNS[table]?.has(column));
}

function isBooleanColumn(table, column) {
  return Boolean(BOOLEAN_COLUMNS[table]?.has(column));
}

function encodeValue(table, column, value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (isBooleanColumn(table, column)) {
    return value ? 1 : 0;
  }

  if (isJsonColumn(table, column)) {
    if (typeof value === "string") {
      return value;
    }
    return JSON.stringify(value);
  }

  return value;
}

function decodeValue(table, column, value) {
  if (value === null || value === undefined) return value;

  if (isBooleanColumn(table, column)) {
    return Boolean(value);
  }

  if (isJsonColumn(table, column) && typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

function decodeRow(table, row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = decodeValue(table, key, value);
  }
  return out;
}

function getAiProviderConfigByRowIdentity(row) {
  if (!row || typeof row !== "object") return null;

  if (row.id) {
    return db
      .prepare("SELECT * FROM ai_provider_configs WHERE id = ? LIMIT 1;")
      .get(String(row.id));
  }

  if (row.user_id && row.provider_id) {
    return db
      .prepare("SELECT * FROM ai_provider_configs WHERE user_id = ? AND provider_id = ? LIMIT 1;")
      .get(String(row.user_id), String(row.provider_id));
  }

  return null;
}

function shouldKeepExistingApiKey(value) {
  if (value === undefined) return true;
  if (value === null) return false;
  const normalized = String(value).trim();
  return normalized === "" || normalized === "__stored__";
}

function prepareAiProviderConfigRowForWrite(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };

  if (!Object.prototype.hasOwnProperty.call(out, "api_key_encrypted")) {
    return out;
  }

  if (out.api_key_encrypted === null) {
    return out;
  }

  if (shouldKeepExistingApiKey(out.api_key_encrypted)) {
    const existing = getAiProviderConfigByRowIdentity(out);
    if (existing?.api_key_encrypted) {
      delete out.api_key_encrypted;
      return out;
    }
    out.api_key_encrypted = "";
    return out;
  }

  out.api_key_encrypted = encryptSecret(out.api_key_encrypted);
  return out;
}

function sanitizeAiProviderConfigRowForClient(row) {
  const hasApiKey = Boolean(row?.api_key_encrypted);
  return {
    ...row,
    api_key_encrypted: hasApiKey ? "__stored__" : "",
    has_api_key: hasApiKey,
  };
}

function sanitizeResultForClient(table, data) {
  if (table !== "ai_provider_configs") return data;
  if (Array.isArray(data)) {
    return data.map((row) => sanitizeAiProviderConfigRowForClient(row));
  }
  if (data && typeof data === "object") {
    return sanitizeAiProviderConfigRowForClient(data);
  }
  return data;
}

function applyInsertDefaults(table, rawRow, user) {
  const row = { ...(rawRow || {}) };
  const columns = getTableColumns(table);
  const defaults = TABLE_DEFAULTS[table] || {};

  for (const [key, value] of Object.entries(defaults)) {
    if (row[key] === undefined) {
      row[key] = value;
    }
  }

  if (columns.has("id") && (row.id === undefined || row.id === null || row.id === "")) {
    row.id = randomUUID();
  }

  if (columns.has("user_id") && (row.user_id === undefined || row.user_id === null) && user?.id) {
    row.user_id = user.id;
  }

  if (columns.has("created_at") && (row.created_at === undefined || row.created_at === null)) {
    row.created_at = nowIso();
  }

  if (columns.has("updated_at") && (row.updated_at === undefined || row.updated_at === null)) {
    row.updated_at = nowIso();
  }

  if (columns.has("added_at") && (row.added_at === undefined || row.added_at === null)) {
    row.added_at = nowIso();
  }

  if (columns.has("joined_at") && (row.joined_at === undefined || row.joined_at === null)) {
    row.joined_at = nowIso();
  }

  if (columns.has("published_at") && row.published_at === undefined && row.status === "published") {
    row.published_at = nowIso();
  }

  return row;
}

function encodeRow(table, row) {
  const columns = getTableColumns(table);
  const out = {};

  for (const [key, value] of Object.entries(row || {})) {
    if (!columns.has(key)) continue;
    const encoded = encodeValue(table, key, value);
    if (encoded !== undefined) {
      out[key] = encoded;
    }
  }

  return out;
}

function parseSelectColumns(select) {
  if (!select || typeof select !== "string") return "*";
  const trimmed = select.trim();
  if (!trimmed || trimmed === "*") return "*";

  const tokens = trimmed
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  const mapped = [];
  for (const token of tokens) {
    if (token === "*") {
      mapped.push("*");
      continue;
    }
    // Ignore relation syntax like teams(name) in local mode.
    if (token.includes("(") || token.includes(")")) {
      continue;
    }
    mapped.push(quoteIdent(token));
  }

  return mapped.length > 0 ? mapped.join(", ") : "*";
}

function buildWhereClause(table, filters) {
  const clauses = [];
  const params = [];

  for (const filter of filters || []) {
    if (!filter || typeof filter !== "object") continue;
    const column = filter.column;
    const operator = filter.operator;
    if (!column || !operator) continue;

    const colSql = quoteIdent(column);

    if (operator === "eq") {
      if (filter.value === null) {
        clauses.push(`${colSql} IS NULL`);
      } else {
        clauses.push(`${colSql} = ?`);
        params.push(encodeValue(table, column, filter.value));
      }
      continue;
    }

    if (operator === "in") {
      const values = Array.isArray(filter.value) ? filter.value : [];
      if (values.length === 0) {
        clauses.push("1 = 0");
      } else {
        const placeholders = values.map(() => "?").join(", ");
        clauses.push(`${colSql} IN (${placeholders})`);
        for (const value of values) {
          params.push(encodeValue(table, column, value));
        }
      }
      continue;
    }

    if (operator === "gt") {
      clauses.push(`${colSql} > ?`);
      params.push(encodeValue(table, column, filter.value));
      continue;
    }

    if (operator === "gte") {
      clauses.push(`${colSql} >= ?`);
      params.push(encodeValue(table, column, filter.value));
      continue;
    }

    if (operator === "lt") {
      clauses.push(`${colSql} < ?`);
      params.push(encodeValue(table, column, filter.value));
      continue;
    }

    if (operator === "lte") {
      clauses.push(`${colSql} <= ?`);
      params.push(encodeValue(table, column, filter.value));
    }
  }

  return {
    sql: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function buildOrderClause(order) {
  if (!Array.isArray(order) || order.length === 0) return "";

  const mapped = order
    .filter((entry) => entry?.column)
    .map((entry) => `${quoteIdent(entry.column)} ${entry.ascending === false ? "DESC" : "ASC"}`);

  if (mapped.length === 0) return "";
  return ` ORDER BY ${mapped.join(", ")}`;
}

function runInTransaction(fn) {
  db.exec("BEGIN;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function normalizeRows(values) {
  if (Array.isArray(values)) {
    return values;
  }
  if (values && typeof values === "object") {
    return [values];
  }
  return [];
}

function computeCount(table, filters) {
  const where = buildWhereClause(table, filters);
  const sql = `SELECT COUNT(*) AS count FROM ${quoteIdent(table)}${where.sql};`;
  const row = db.prepare(sql).get(...where.params);
  return Number(row?.count || 0);
}

function selectRows({ table, select, filters, order, limit }) {
  const where = buildWhereClause(table, filters);
  const orderSql = buildOrderClause(order);
  const columnsSql = parseSelectColumns(select);

  let limitSql = "";
  const parsedLimit = Number(limit);
  if (Number.isFinite(parsedLimit) && parsedLimit >= 0) {
    limitSql = ` LIMIT ${Math.floor(parsedLimit)}`;
  }

  const sql = `SELECT ${columnsSql} FROM ${quoteIdent(table)}${where.sql}${orderSql}${limitSql};`;
  return db.prepare(sql).all(...where.params).map((row) => decodeRow(table, row));
}

function fetchRowsByLookups(table, lookups, select) {
  if (!Array.isArray(lookups) || lookups.length === 0) {
    return [];
  }

  const uniqueById = new Map();

  for (const lookup of lookups) {
    if (!lookup || typeof lookup !== "object") continue;
    const entries = Object.entries(lookup);
    if (entries.length === 0) continue;

    const clauses = [];
    const params = [];
    for (const [column, value] of entries) {
      clauses.push(`${quoteIdent(column)} = ?`);
      params.push(encodeValue(table, column, value));
    }

    const sql = `SELECT * FROM ${quoteIdent(table)} WHERE ${clauses.join(" AND ")} LIMIT 1;`;
    const row = db.prepare(sql).get(...params);
    if (!row) continue;

    const decoded = decodeRow(table, row);
    if (decoded.id) {
      uniqueById.set(decoded.id, decoded);
    } else {
      uniqueById.set(JSON.stringify(lookup), decoded);
    }
  }

  const rows = Array.from(uniqueById.values());

  if (!select || select === "*" || select.trim() === "*") {
    return rows;
  }

  const selectedColumns = select
    .split(",")
    .map((column) => column.trim())
    .filter((column) => column && !column.includes("(") && !column.includes(")"));

  if (selectedColumns.length === 0) {
    return rows;
  }

  return rows.map((row) => {
    const out = {};
    for (const column of selectedColumns) {
      out[column] = row[column];
    }
    return out;
  });
}

function updateProjectStats(projectId) {
  if (!projectId) return;

  const sourceRow = db
    .prepare("SELECT COUNT(*) AS count FROM sources WHERE project_id = ?;")
    .get(projectId);

  const controlRow = db
    .prepare("SELECT COUNT(*) AS count, AVG(confidence_score) AS avg_confidence FROM controls WHERE project_id = ?;")
    .get(projectId);

  const sourceCount = Number(sourceRow?.count || 0);
  const controlCount = Number(controlRow?.count || 0);
  const avgConfidence = controlCount > 0 ? Number(controlRow?.avg_confidence || 0) : 0;

  db.prepare(
    "UPDATE projects SET source_count = ?, control_count = ?, avg_confidence = ?, updated_at = ? WHERE id = ?;"
  ).run(sourceCount, controlCount, avgConfidence, nowIso(), projectId);
}

function executeDbQuery(payload, user) {
  const table = payload?.table;
  const action = payload?.action || "select";
  const filters = Array.isArray(payload?.filters) ? payload.filters : [];
  const order = Array.isArray(payload?.order) ? payload.order : [];
  const limit = payload?.limit;
  const single = Boolean(payload?.single);
  const maybeSingle = Boolean(payload?.maybeSingle);
  const select = typeof payload?.select === "string" ? payload.select : "*";
  const returning = Boolean(payload?.returning);
  const head = Boolean(payload?.head);
  const count = payload?.count === "exact" ? "exact" : null;

  if (!QUERYABLE_TABLES.has(table)) {
    throw new Error(`Unsupported table: ${table}`);
  }

  let data = null;
  let totalCount = null;
  const touchedProjectIds = new Set();

  if (action === "select") {
    const rows = selectRows({ table, select, filters, order, limit });
    data = rows;

    if (count === "exact") {
      totalCount = computeCount(table, filters);
    }

    if (head) {
      data = null;
    }
  } else if (action === "insert" || action === "upsert") {
    const inputRows = normalizeRows(payload?.values);
    const onConflict = typeof payload?.onConflict === "string" ? payload.onConflict : "";
    const conflictColumns = onConflict
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);

    const lookups = [];

    runInTransaction(() => {
      for (const rawRow of inputRows) {
        let withDefaults = applyInsertDefaults(table, rawRow, user);
        if (table === "ai_provider_configs") {
          withDefaults = prepareAiProviderConfigRowForWrite(withDefaults);
        }
        const row = encodeRow(table, withDefaults);
        const columns = Object.keys(row);
        if (columns.length === 0) continue;

        const colsSql = columns.map((column) => quoteIdent(column)).join(", ");
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map((column) => row[column]);

        if (action === "insert") {
          const sql = `INSERT INTO ${quoteIdent(table)} (${colsSql}) VALUES (${placeholders});`;
          db.prepare(sql).run(...values);
        } else {
          const effectiveConflict = conflictColumns.length > 0
            ? conflictColumns
            : (row.id ? ["id"] : []);

          if (effectiveConflict.length === 0) {
            throw new Error("Upsert requires onConflict columns or id field");
          }

          const updateColumns = columns.filter((column) => !effectiveConflict.includes(column));
          const conflictSql = effectiveConflict.map((column) => quoteIdent(column)).join(", ");

          let sql = `INSERT INTO ${quoteIdent(table)} (${colsSql}) VALUES (${placeholders}) ON CONFLICT (${conflictSql}) `;
          if (updateColumns.length > 0) {
            const updatesSql = updateColumns
              .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`)
              .join(", ");
            sql += `DO UPDATE SET ${updatesSql};`;
          } else {
            sql += "DO NOTHING;";
          }

          db.prepare(sql).run(...values);
        }

        if (row.project_id && (table === "sources" || table === "controls")) {
          touchedProjectIds.add(String(row.project_id));
        }

        if (row.id) {
          lookups.push({ id: row.id });
        } else if (conflictColumns.length > 0) {
          const lookup = {};
          for (const column of conflictColumns) {
            if (row[column] !== undefined) {
              lookup[column] = row[column];
            }
          }
          if (Object.keys(lookup).length > 0) {
            lookups.push(lookup);
          }
        }
      }
    });

    for (const projectId of touchedProjectIds) {
      updateProjectStats(projectId);
    }

    if (returning) {
      data = fetchRowsByLookups(table, lookups, select);
    }
  } else if (action === "update") {
    const valuesRaw = payload?.values || {};
    const columns = getTableColumns(table);

    const beforeRows = (table === "sources" || table === "controls")
      ? selectRows({ table, select: "project_id", filters, order: [], limit: null })
      : [];

    let updatePayload = { ...valuesRaw };
    if (table === "ai_provider_configs") {
      updatePayload = prepareAiProviderConfigRowForWrite(updatePayload);
    }
    if (columns.has("updated_at") && updatePayload.updated_at === undefined) {
      updatePayload.updated_at = nowIso();
    }

    const encoded = encodeRow(table, updatePayload);
    const updateCols = Object.keys(encoded);

    if (updateCols.length > 0) {
      const setSql = updateCols.map((column) => `${quoteIdent(column)} = ?`).join(", ");
      const where = buildWhereClause(table, filters);
      const sql = `UPDATE ${quoteIdent(table)} SET ${setSql}${where.sql};`;
      const values = updateCols.map((column) => encoded[column]);
      db.prepare(sql).run(...values, ...where.params);
    }

    for (const row of beforeRows) {
      if (row.project_id) {
        touchedProjectIds.add(String(row.project_id));
      }
    }

    if (table === "sources" || table === "controls") {
      for (const projectId of touchedProjectIds) {
        updateProjectStats(projectId);
      }
    }

    if (returning) {
      data = selectRows({ table, select, filters, order, limit: null });
    }
  } else if (action === "delete") {
    const beforeRows = (table === "sources" || table === "controls")
      ? selectRows({ table, select: "project_id", filters, order: [], limit: null })
      : [];

    const where = buildWhereClause(table, filters);
    const sql = `DELETE FROM ${quoteIdent(table)}${where.sql};`;
    db.prepare(sql).run(...where.params);

    for (const row of beforeRows) {
      if (row.project_id) {
        touchedProjectIds.add(String(row.project_id));
      }
    }

    if (table === "sources" || table === "controls") {
      for (const projectId of touchedProjectIds) {
        updateProjectStats(projectId);
      }
    }

    data = null;
  } else {
    throw new Error(`Unsupported action: ${action}`);
  }

  data = sanitizeResultForClient(table, data);

  if ((single || maybeSingle) && !head) {
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      if (single) {
        return {
          data: null,
          error: { message: "No rows returned" },
          count: totalCount,
        };
      }
      return {
        data: null,
        error: null,
        count: totalCount,
      };
    }

    if (rows.length > 1) {
      return {
        data: null,
        error: { message: "Multiple rows returned" },
        count: totalCount,
      };
    }

    return {
      data: rows[0],
      error: null,
      count: totalCount,
    };
  }

  return {
    data,
    error: null,
    count: totalCount,
  };
}

function hashPassword(password) {
  return createHash("sha256").update(String(password)).digest("hex");
}

function getUserByToken(token) {
  if (!token) return null;

  const session = db
    .prepare("SELECT user_id FROM local_sessions WHERE token = ? LIMIT 1;")
    .get(token);

  if (!session) return null;

  const user = db
    .prepare("SELECT id, email, role, must_change_password, created_at, updated_at, password_changed_at FROM users WHERE id = ? LIMIT 1;")
    .get(session.user_id);

  return user || null;
}

function getDefaultUser() {
  return db
    .prepare("SELECT id, email, role, must_change_password, created_at, updated_at, password_changed_at FROM users ORDER BY created_at ASC LIMIT 1;")
    .get() || null;
}

function getAuthToken(headers) {
  const authHeader = headers?.authorization || headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string") return null;
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
}

function getCurrentUser(req) {
  const token = getAuthToken(req.headers);
  const fromToken = getUserByToken(token);
  if (fromToken) return fromToken;
  return null;
}

function createSessionForUser(user) {
  const token = randomUUID();
  db.prepare("INSERT INTO local_sessions(token, user_id, created_at) VALUES (?, ?, ?);").run(
    token,
    user.id,
    nowIso()
  );

  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 31536000,
    refresh_token: token,
    user: {
      id: user.id,
      email: user.email,
      username: user.email,
      app_metadata: {
        role: user.role || "user",
      },
      user_metadata: {
        full_name: user.email,
        must_change_password: Boolean(user.must_change_password),
      },
      aud: "authenticated",
      created_at: user.created_at,
    },
  };
}

function ensureSeedData() {
  ensureUserTableColumns();

  const now = nowIso();
  const adminUsername = normalizeUsername(ADMIN_USERNAME);
  const bootstrapCompleted = getSystemSetting(AUTH_BOOTSTRAP_KEY) === "done";

  let admin = getUserByUsername(adminUsername);

  if (!admin) {
    runInTransaction(() => {
      db.prepare("DELETE FROM local_sessions;").run();
      db.prepare("DELETE FROM users;").run();
      db.prepare(
        `
          INSERT INTO users(
            id,
            email,
            password_hash,
            role,
            must_change_password,
            created_at,
            updated_at,
            password_changed_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `
      ).run(
        randomUUID(),
        adminUsername,
        hashPassword(DEFAULT_ADMIN_PASSWORD),
        "admin",
        1,
        now,
        now,
        null
      );
    });
    admin = getUserByUsername(adminUsername);
  }

  if (!admin) {
    throw new Error("Failed to bootstrap local admin user");
  }

  db.prepare(
    `
      UPDATE users
      SET role = 'admin',
          email = ?,
          updated_at = CASE
            WHEN updated_at IS NULL OR updated_at = '' THEN ?
            ELSE updated_at
          END
      WHERE id = ?;
    `
  ).run(adminUsername, now, admin.id);

  admin = getUserByUsername(adminUsername);

  if (!bootstrapCompleted) {
    purgeNonAdminData(admin.id);
    setSystemSetting(AUTH_BOOTSTRAP_KEY, "done");
  }

  seedUserSupportRows(admin.id);
}

function migrateStoredAiProviderSecrets() {
  const rows = db
    .prepare(
      `
        SELECT id, api_key_encrypted
        FROM ai_provider_configs
        WHERE api_key_encrypted IS NOT NULL
          AND TRIM(api_key_encrypted) <> '';
      `
    )
    .all();

  for (const row of rows) {
    const current = String(row.api_key_encrypted || "");
    if (isEncryptedSecret(current)) continue;
    const encrypted = encryptSecret(current);
    db.prepare(
      "UPDATE ai_provider_configs SET api_key_encrypted = ?, updated_at = ? WHERE id = ?;"
    ).run(encrypted, nowIso(), row.id);
  }
}

function removeDeprecatedBuiltinProviderConfigs() {
  db.prepare("DELETE FROM ai_provider_configs WHERE provider_id = 'lovable_ai';").run();

  const users = db.prepare("SELECT id FROM users;").all();
  for (const row of users) {
    const userId = String(row.id);
    const currentDefault = db
      .prepare(
        `
          SELECT id
          FROM ai_provider_configs
          WHERE user_id = ? AND is_default = 1
          LIMIT 1;
        `
      )
      .get(userId);

    if (currentDefault) continue;

    const candidate = db
      .prepare(
        `
          SELECT id
          FROM ai_provider_configs
          WHERE user_id = ?
          ORDER BY enabled DESC, updated_at DESC
          LIMIT 1;
        `
      )
      .get(userId);

    if (candidate?.id) {
      db.prepare("UPDATE ai_provider_configs SET is_default = 1 WHERE id = ?;").run(candidate.id);
    }
  }
}

ensureSeedData();
migrateStoredAiProviderSecrets();
removeDeprecatedBuiltinProviderConfigs();

function writeCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function sendJson(res, statusCode, payload) {
  writeCors(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseJsonOrThrow(rawBody) {
  if (!rawBody || rawBody.length === 0) return {};
  try {
    return JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON payload");
  }
}

function insertSourceActivityLog({ sourceId, userId, previousStatus, newStatus, eventType, metadata }) {
  executeDbQuery(
    {
      table: "source_activity_logs",
      action: "insert",
      values: {
        source_id: sourceId,
        user_id: userId,
        previous_status: previousStatus || null,
        new_status: newStatus,
        event_type: eventType || "status_change",
        metadata: metadata || {},
      },
    },
    { id: userId }
  );
}

function buildPreview(text) {
  if (!text) return "";
  return String(text).slice(0, 220);
}

function sanitizeControlId(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function generateControlsFromSources({ userId, projectId, sourceTexts, technology }) {
  const templates = [
    {
      category: "identity",
      criticality: "high",
      title: `Enforce least privilege for ${technology}`,
      risk: "Excessive privileges can enable lateral movement and privilege escalation.",
    },
    {
      category: "encryption",
      criticality: "high",
      title: `Encrypt data in transit and at rest for ${technology}`,
      risk: "Unencrypted data may be disclosed during transit, backup, or storage compromise.",
    },
    {
      category: "logging",
      criticality: "medium",
      title: `Enable centralized audit logging for ${technology}`,
      risk: "Insufficient logs delay incident detection and investigation.",
    },
    {
      category: "network",
      criticality: "high",
      title: `Restrict network exposure for ${technology}`,
      risk: "Public or overly broad access increases attack surface and exploit likelihood.",
    },
  ];

  const existing = db
    .prepare("SELECT COUNT(*) AS count FROM controls WHERE project_id = ?;")
    .get(projectId);

  let counter = Number(existing?.count || 0);
  const rows = [];

  const limitedSources = (sourceTexts || []).slice(0, 25);
  for (const source of limitedSources) {
    for (let i = 0; i < 2; i += 1) {
      const template = templates[(counter + i) % templates.length];
      counter += 1;
      const controlCode = sanitizeControlId(`${technology}-C-${String(counter).padStart(3, "0")}`);
      const confidence = 65 + ((counter * 7) % 30);

      const excerpt = String(source.content || "").slice(0, 260);
      rows.push({
        user_id: userId,
        project_id: projectId,
        control_id: controlCode,
        title: `${template.title} (${counter})`,
        description: `Define and enforce a security baseline control to harden ${technology}.`,
        applicability: `Applicable to all workloads in ${technology}.`,
        security_risk: template.risk,
        criticality: template.criticality,
        category: template.category,
        default_behavior_limitations: "Default settings may prioritize usability over security.",
        automation: "Automate validation in CI/CD and continuous compliance checks.",
        references: [source.name],
        framework_mappings: ["NIST 800-53", "ISO 27001", "CIS Controls"],
        threat_scenarios: [
          {
            id: randomUUID(),
            threatName: `Abuse scenario for ${template.category}`,
            strideCategory: "tampering",
            attackVector: "Misconfiguration or exposed administration interface",
            threatAgent: "External attacker",
            preconditions: "Weak policy or broad permissions",
            impact: "Unauthorized change or data exposure",
            likelihood: "medium",
            mitigations: ["Restrict permissions", "Enforce approvals", "Enable logging"],
            residualRisk: "medium",
          },
        ],
        source_traceability: [
          {
            sourceId: source.id || source.name,
            sourceName: source.name,
            excerpt,
            sourceType: source.type === "url" ? "url" : "document",
            confidence,
          },
        ],
        confidence_score: confidence,
        review_status: "pending",
        reviewer_notes: "",
      });
    }
  }

  const inserted = executeDbQuery(
    {
      table: "controls",
      action: "insert",
      values: rows,
      returning: true,
      select: "*",
    },
    { id: userId }
  );

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  db.prepare("UPDATE projects SET status = ?, updated_at = ? WHERE id = ?;").run(
    "review",
    nowIso(),
    projectId
  );

  updateProjectStats(projectId);

  return inserted.data || [];
}

function restoreBaselineVersion({ userId, projectId, versionId }) {
  const version = db
    .prepare("SELECT * FROM baseline_versions WHERE id = ? AND project_id = ? LIMIT 1;")
    .get(versionId, projectId);

  if (!version) {
    throw new Error("Version not found");
  }

  const project = db
    .prepare("SELECT * FROM projects WHERE id = ? LIMIT 1;")
    .get(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  const currentControls = db
    .prepare("SELECT * FROM controls WHERE project_id = ?;")
    .all(projectId)
    .map((row) => decodeRow("controls", row));

  const snapshotControlsRaw = decodeValue("baseline_versions", "controls_snapshot", version.controls_snapshot);
  const snapshotControls = Array.isArray(snapshotControlsRaw) ? snapshotControlsRaw : [];

  const oldMap = new Map(currentControls.map((control) => [control.control_id, control]));
  const newMap = new Map(snapshotControls.map((control) => [control.control_id, control]));

  let added = 0;
  let removed = 0;
  let modified = 0;

  for (const key of newMap.keys()) {
    if (!oldMap.has(key)) {
      added += 1;
    }
  }

  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) {
      removed += 1;
      continue;
    }

    const oldControl = oldMap.get(key);
    const newControl = newMap.get(key);
    const fields = ["title", "description", "criticality", "review_status", "reviewer_notes"];
    if (fields.some((field) => String(oldControl[field] || "") !== String(newControl[field] || ""))) {
      modified += 1;
    }
  }

  runInTransaction(() => {
    db.prepare("DELETE FROM controls WHERE project_id = ?;").run(projectId);

    const restoredRows = snapshotControls.map((control) => {
      const row = {
        ...control,
        id: randomUUID(),
        project_id: projectId,
        user_id: userId,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      return encodeRow("controls", applyInsertDefaults("controls", row, { id: userId }));
    });

    for (const row of restoredRows) {
      const columns = Object.keys(row);
      const sql = `INSERT INTO controls (${columns.map((column) => quoteIdent(column)).join(", ")}) VALUES (${columns.map(() => "?").join(", ")});`;
      db.prepare(sql).run(...columns.map((column) => row[column]));
    }

    const newVersion = Number(project.current_version || 0) + 1;
    const sourcesSnapshot = decodeValue("baseline_versions", "sources_snapshot", version.sources_snapshot) || [];

    executeDbQuery(
      {
        table: "baseline_versions",
        action: "insert",
        values: {
          user_id: userId,
          project_id: projectId,
          version: newVersion,
          control_count: snapshotControls.length,
          controls_snapshot: snapshotControls,
          sources_snapshot: sourcesSnapshot,
          project_snapshot: decodeRow("projects", project),
          status: "published",
          published_at: nowIso(),
          changes_summary: `v${newVersion}: Restored from v${version.version}`,
        },
      },
      { id: userId }
    );

    executeDbQuery(
      {
        table: "version_audit_logs",
        action: "insert",
        values: {
          user_id: userId,
          project_id: projectId,
          action: "restore",
          version_number: newVersion,
          from_version: version.version,
          details: {
            from_version: version.version,
            added,
            removed,
            modified,
          },
        },
      },
      { id: userId }
    );

    db.prepare("UPDATE projects SET current_version = ?, status = ?, updated_at = ? WHERE id = ?;").run(
      newVersion,
      "approved",
      nowIso(),
      projectId
    );
  });

  updateProjectStats(projectId);

  const updatedProject = db
    .prepare("SELECT current_version FROM projects WHERE id = ? LIMIT 1;")
    .get(projectId);

  return {
    restoredVersion: version.version,
    controlCount: snapshotControls.length,
    newVersion: updatedProject?.current_version || null,
  };
}

async function parseDocumentUpload(req, rawBody, user) {
  const request = new Request("http://localhost/upload", {
    method: "POST",
    headers: req.headers,
    body: rawBody,
  });

  const form = await request.formData();
  const file = form.get("file");
  const projectId = String(form.get("projectId") || "");
  const model = String(form.get("model") || "local/sqlite-extractor");

  if (!projectId) {
    throw new Error("projectId is required");
  }

  if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
    throw new Error("file is required");
  }

  const fileName = file.name || "upload.bin";
  const fileExt = path.extname(fileName).replace(".", "").toLowerCase();
  const mimeType = file.type || "application/octet-stream";

  const textFriendlyExt = new Set(["txt", "md", "json", "csv", "html", "htm", "xml"]);

  let rawContent = "";
  let extractedContent = "";

  if (textFriendlyExt.has(fileExt) || mimeType.startsWith("text/")) {
    const text = await file.text();
    rawContent = text;
    extractedContent = text;
  } else {
    const byteLength = Number((await file.arrayBuffer()).byteLength || 0);
    rawContent = `[binary:${fileName}] size=${byteLength} bytes`;
    extractedContent = `Extracted summary for ${fileName}. The file was indexed in local mode.`;
  }

  const sourceInsert = executeDbQuery(
    {
      table: "sources",
      action: "insert",
      values: {
        project_id: projectId,
        user_id: user.id,
        name: fileName,
        type: "document",
        file_name: fileName,
        file_type: fileExt || mimeType,
        origin: "local_upload",
        status: "processed",
        preview: buildPreview(extractedContent),
        raw_content: rawContent,
        extracted_content: extractedContent,
        extraction_model: model,
        extraction_method: "local_document_extraction",
        extraction_tokens: Math.max(1, Math.floor(extractedContent.length / 4)),
        confidence: 0.7,
        processed_at: nowIso(),
      },
      returning: true,
      select: "*",
      single: true,
    },
    user
  );

  if (sourceInsert.error) {
    throw new Error(sourceInsert.error.message);
  }

  const source = sourceInsert.data;
  insertSourceActivityLog({
    sourceId: source.id,
    userId: user.id,
    previousStatus: null,
    newStatus: "created",
    eventType: "created",
    metadata: {
      file_name: fileName,
      model,
    },
  });

  insertSourceActivityLog({
    sourceId: source.id,
    userId: user.id,
    previousStatus: "pending",
    newStatus: "processed",
    eventType: "processed",
    metadata: {
      model,
      tokens: source.extraction_tokens,
    },
  });

  updateProjectStats(projectId);

  return { source };
}

function parseUrlSource({ user, body }) {
  const url = String(body?.url || "").trim();
  const projectId = String(body?.projectId || "").trim();
  const model = String(body?.model || "local/sqlite-url-extractor");

  if (!url) {
    throw new Error("url is required");
  }

  if (!projectId) {
    throw new Error("projectId is required");
  }

  let parsed;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    throw new Error("Invalid URL");
  }

  const sourceName = parsed.hostname + parsed.pathname;
  const extractedContent = `Local extraction for ${parsed.toString()}\n\nThis is a placeholder content generated in SQLite local mode.`;

  const inserted = executeDbQuery(
    {
      table: "sources",
      action: "insert",
      values: {
        user_id: user.id,
        project_id: projectId,
        name: sourceName,
        type: "url",
        url: parsed.toString(),
        origin: "url_import",
        status: "processed",
        preview: buildPreview(extractedContent),
        extracted_content: extractedContent,
        raw_content: extractedContent,
        extraction_model: model,
        extraction_method: "local_url_extraction",
        extraction_tokens: Math.max(1, Math.floor(extractedContent.length / 4)),
        confidence: 0.75,
        processed_at: nowIso(),
      },
      returning: true,
      select: "*",
      single: true,
    },
    user
  );

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  const source = inserted.data;

  insertSourceActivityLog({
    sourceId: source.id,
    userId: user.id,
    previousStatus: null,
    newStatus: "created",
    eventType: "created",
    metadata: {
      url: parsed.toString(),
      model,
    },
  });

  insertSourceActivityLog({
    sourceId: source.id,
    userId: user.id,
    previousStatus: "pending",
    newStatus: "processed",
    eventType: "processed",
    metadata: {
      model,
      tokens: source.extraction_tokens,
    },
  });

  updateProjectStats(projectId);

  return { source };
}

function handleGenerateControls({ user, body }) {
  const projectId = String(body?.projectId || "");
  const technology = String(body?.technology || "Technology");

  if (!projectId) {
    throw new Error("projectId is required");
  }

  let sourceTexts = Array.isArray(body?.sourceTexts) ? body.sourceTexts : null;

  if (!sourceTexts || sourceTexts.length === 0) {
    const rows = db
      .prepare("SELECT id, name, type, extracted_content FROM sources WHERE project_id = ? AND status = 'processed';")
      .all(projectId)
      .map((row) => decodeRow("sources", row));

    sourceTexts = rows
      .filter((row) => row.extracted_content)
      .map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        content: row.extracted_content,
      }));
  }

  if (!sourceTexts || sourceTexts.length === 0) {
    return {
      error: "No processed sources found",
      count: 0,
      controls: [],
    };
  }

  const generated = generateControlsFromSources({
    userId: user.id,
    projectId,
    sourceTexts,
    technology,
  });

  return {
    count: generated.length,
    controls: generated,
  };
}

function handleReprocessSource({ user, body }) {
  const sourceId = String(body?.sourceId || "");
  const model = String(body?.model || "local/sqlite-reprocess");

  if (!sourceId) {
    throw new Error("sourceId is required");
  }

  const source = db
    .prepare("SELECT * FROM sources WHERE id = ? LIMIT 1;")
    .get(sourceId);

  if (!source) {
    throw new Error("Source not found");
  }

  const decoded = decodeRow("sources", source);
  const newExtracted = decoded.raw_content
    ? `${String(decoded.raw_content).slice(0, 800)}\n\n[Reprocessed in local mode using ${model}]`
    : `Reprocessed source content generated in local mode using ${model}.`;

  executeDbQuery(
    {
      table: "sources",
      action: "update",
      values: {
        previous_extracted_content: decoded.extracted_content || null,
        previous_extraction_model: decoded.extraction_model || null,
        previous_extraction_tokens: decoded.extraction_tokens || null,
        extracted_content: newExtracted,
        extraction_model: model,
        extraction_method: "local_reprocess",
        extraction_tokens: Math.max(1, Math.floor(newExtracted.length / 4)),
        status: "processed",
        confidence: 0.78,
        processed_at: nowIso(),
        preview: buildPreview(newExtracted),
      },
      filters: [{ column: "id", operator: "eq", value: sourceId }],
      returning: true,
      select: "*",
      single: true,
    },
    user
  );

  insertSourceActivityLog({
    sourceId,
    userId: user.id,
    previousStatus: decoded.status,
    newStatus: "processed",
    eventType: "reprocessed",
    metadata: {
      model,
    },
  });

  const updated = db
    .prepare("SELECT * FROM sources WHERE id = ? LIMIT 1;")
    .get(sourceId);

  return {
    source: decodeRow("sources", updated),
  };
}

function getAiProviderConfigForUser(userId, providerId) {
  if (!userId || !providerId) return null;
  return db
    .prepare("SELECT * FROM ai_provider_configs WHERE user_id = ? AND provider_id = ? LIMIT 1;")
    .get(String(userId), String(providerId));
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleTestAiProvider({ user, body }) {
  const providerId = String(body?.providerId || "").trim().toLowerCase();
  const selectedModel = String(body?.model || "").trim();
  const apiKeyFromPayload = String(body?.apiKey || "").trim();
  const endpointFromPayload = String(body?.endpointUrl || "").trim();

  if (!providerId) {
    throw new Error("providerId is required");
  }

  const persisted = getAiProviderConfigForUser(user.id, providerId);
  const persistedExtra = decodeValue("ai_provider_configs", "extra_config", persisted?.extra_config || "{}") || {};
  const persistedEndpoint = String(persistedExtra?.endpoint_url || "").trim();
  const endpointUrl = endpointFromPayload || persistedEndpoint;

  let apiKey = apiKeyFromPayload;
  if (!apiKey && persisted?.api_key_encrypted) {
    apiKey = decryptSecret(persisted.api_key_encrypted);
  }

  if (providerId === "ollama") {
    const baseUrl = endpointUrl || "http://127.0.0.1:11434";
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      return { ok: false, message: `Ollama connection failed (${response.status})` };
    }
    return { ok: true, message: "Ollama connection successful" };
  }

  if (!apiKey) {
    return { ok: false, message: "API key is required for this provider" };
  }

  if (providerId === "openai") {
    const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return { ok: response.ok, message: response.ok ? "OpenAI connection successful" : `OpenAI error (${response.status})` };
  }

  if (providerId === "google" || providerId === "gemini") {
    const model = selectedModel || "gemini-2.5-flash";
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
      }
    );
    return { ok: response.ok, message: response.ok ? "Gemini connection successful" : `Gemini error (${response.status})` };
  }

  if (providerId === "anthropic") {
    const model = selectedModel || "claude-3-5-haiku-latest";
    const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    return { ok: response.ok, message: response.ok ? "Anthropic connection successful" : `Anthropic error (${response.status})` };
  }

  if (providerId === "xai" || providerId === "grok") {
    const response = await fetchWithTimeout("https://api.x.ai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return { ok: response.ok, message: response.ok ? "xAI (Grok) connection successful" : `xAI error (${response.status})` };
  }

  if (endpointUrl) {
    const response = await fetchWithTimeout(endpointUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return { ok: response.ok, message: response.ok ? "Connection successful" : `Provider error (${response.status})` };
  }

  return {
    ok: apiKey.length > 12,
    message: apiKey.length > 12 ? "API key format looks valid" : "API key appears invalid",
  };
}

function handleDocAssistant(_req, res, rawBody) {
  const body = parseJsonOrThrow(rawBody);
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const latestUser = [...messages].reverse().find((msg) => msg?.role === "user");
  const prompt = String(latestUser?.content || "").slice(0, 400);

  const answer = [
    "Local assistant mode is active.",
    "This project is running with a local SQLite backend.",
    "AI provider selection is configured in AI Integrations (OpenAI, Gemini, Grok, Anthropic, Ollama).",
    prompt ? `You asked: ${prompt}` : "Ask about workflows, project data, or migration status.",
  ].join(" ");

  writeCors(res);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chunks = answer.match(/.{1,48}/g) || [answer];
  for (const chunk of chunks) {
    const payload = {
      choices: [
        {
          delta: {
            content: `${chunk} `,
          },
        },
      ],
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
}

function handleFunctionRequest(req, res, fnName, rawBody, user) {
  if (fnName === "doc-assistant") {
    handleDocAssistant(req, res, rawBody);
    return;
  }

  let payload = {};
  const contentType = String(req.headers["content-type"] || "");

  if (!contentType.includes("multipart/form-data")) {
    payload = parseJsonOrThrow(rawBody);
  }

  if (fnName === "parse-url") {
    const result = parseUrlSource({ user, body: payload });
    sendJson(res, 200, result);
    return;
  }

  if (fnName === "parse-document") {
    parseDocumentUpload(req, rawBody, user)
      .then((result) => sendJson(res, 200, result))
      .catch((error) => sendJson(res, 400, { error: error.message }));
    return;
  }

  if (fnName === "generate-controls") {
    const result = handleGenerateControls({ user, body: payload });
    sendJson(res, 200, result);
    return;
  }

  if (fnName === "restore-baseline") {
    const projectId = String(payload?.projectId || "");
    const versionId = String(payload?.versionId || "");

    if (!projectId || !versionId) {
      sendJson(res, 400, { error: "projectId and versionId are required" });
      return;
    }

    const result = restoreBaselineVersion({ userId: user.id, projectId, versionId });
    sendJson(res, 200, result);
    return;
  }

  if (fnName === "reprocess-source") {
    const result = handleReprocessSource({ user, body: payload });
    sendJson(res, 200, result);
    return;
  }

  if (fnName === "test-ai-provider") {
    handleTestAiProvider({ user, body: payload })
      .then((result) => sendJson(res, 200, result))
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
    return;
  }

  sendJson(res, 404, { error: `Function ${fnName} is not available in local mode` });
}

const server = http.createServer(async (req, res) => {
  writeCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        mode: "sqlite-local",
        dbPath: DB_PATH,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/sign-up") {
      sendJson(res, 405, { error: "Sign-up is disabled. Use the admin user to create local accounts." });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/sign-in-password") {
      const body = parseJsonOrThrow(await readRawBody(req));
      const username = normalizeUsername(body?.username || body?.email);
      const password = String(body?.password || "");

      if (!username || !password) {
        sendJson(res, 400, { error: "username and password are required" });
        return;
      }

      const user = getUserByUsername(username);

      if (!user || user.password_hash !== hashPassword(password)) {
        sendJson(res, 401, { error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
        return;
      }

      if (Boolean(user.must_change_password)) {
        sendJson(res, 403, {
          error: "Password change required",
          code: "PASSWORD_CHANGE_REQUIRED",
        });
        return;
      }

      const session = createSessionForUser(user);
      sendJson(res, 200, {
        session,
        user: session.user,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/first-login/change-password") {
      const body = parseJsonOrThrow(await readRawBody(req));
      const username = normalizeUsername(body?.username || body?.email);
      const currentPassword = String(body?.currentPassword || body?.password || "");
      const newPassword = String(body?.newPassword || "");

      if (!username || !currentPassword || !newPassword) {
        sendJson(res, 400, { error: "username, currentPassword and newPassword are required" });
        return;
      }

      const passwordError = validateNewPassword(currentPassword, newPassword);
      if (passwordError) {
        sendJson(res, 400, { error: passwordError });
        return;
      }

      const user = getUserByUsername(username);
      if (!user || user.password_hash !== hashPassword(currentPassword)) {
        sendJson(res, 401, { error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
        return;
      }

      const now = nowIso();
      db.prepare(
        `
          UPDATE users
          SET password_hash = ?,
              must_change_password = 0,
              password_changed_at = ?,
              updated_at = ?
          WHERE id = ?;
        `
      ).run(hashPassword(newPassword), now, now, user.id);

      const updated = db
        .prepare("SELECT id, email, password_hash, role, must_change_password, created_at, updated_at, password_changed_at FROM users WHERE id = ? LIMIT 1;")
        .get(user.id);

      const session = createSessionForUser(updated);
      sendJson(res, 200, {
        session,
        user: session.user,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/change-password") {
      const actingUser = getCurrentUser(req);
      if (!actingUser) {
        sendJson(res, 401, { error: "No active user session" });
        return;
      }

      const body = parseJsonOrThrow(await readRawBody(req));
      const currentPassword = String(body?.currentPassword || "");
      const newPassword = String(body?.newPassword || "");

      if (!currentPassword || !newPassword) {
        sendJson(res, 400, { error: "currentPassword and newPassword are required" });
        return;
      }

      const passwordError = validateNewPassword(currentPassword, newPassword);
      if (passwordError) {
        sendJson(res, 400, { error: passwordError });
        return;
      }

      const user = db
        .prepare("SELECT id, password_hash FROM users WHERE id = ? LIMIT 1;")
        .get(actingUser.id);

      if (!user || user.password_hash !== hashPassword(currentPassword)) {
        sendJson(res, 401, { error: "Invalid current password", code: "INVALID_CREDENTIALS" });
        return;
      }

      const now = nowIso();
      db.prepare(
        `
          UPDATE users
          SET password_hash = ?,
              must_change_password = 0,
              password_changed_at = ?,
              updated_at = ?
          WHERE id = ?;
        `
      ).run(hashPassword(newPassword), now, now, actingUser.id);

      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/admin/users") {
      const actingUser = getCurrentUser(req);
      if (!actingUser) {
        sendJson(res, 401, { error: "No active user session" });
        return;
      }
      if (!isAdminUser(actingUser)) {
        sendJson(res, 403, { error: "Admin access required" });
        return;
      }

      const users = db
        .prepare(
          `
            SELECT id, email, role, must_change_password, created_at, updated_at, password_changed_at
            FROM users
            ORDER BY created_at ASC;
          `
        )
        .all()
        .map((row) => ({
          id: row.id,
          username: row.email,
          role: row.role || "user",
          must_change_password: Boolean(row.must_change_password),
          created_at: row.created_at,
          updated_at: row.updated_at,
          password_changed_at: row.password_changed_at,
        }));

      sendJson(res, 200, { users });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/admin/create-user") {
      const actingUser = getCurrentUser(req);
      if (!actingUser) {
        sendJson(res, 401, { error: "No active user session" });
        return;
      }
      if (!isAdminUser(actingUser)) {
        sendJson(res, 403, { error: "Admin access required" });
        return;
      }

      const body = parseJsonOrThrow(await readRawBody(req));
      const username = normalizeUsername(body?.username);
      const password = String(body?.password || "");

      if (!isValidUsername(username)) {
        sendJson(res, 400, {
          error: "Username must contain 3-64 chars and only: a-z, 0-9, ., _, -",
        });
        return;
      }

      if (!password || password.length < 8) {
        sendJson(res, 400, { error: "Password must have at least 8 characters" });
        return;
      }

      const exists = getUserByUsername(username);
      if (exists) {
        sendJson(res, 400, { error: "User already exists", code: "USER_EXISTS" });
        return;
      }

      const now = nowIso();
      const newUser = {
        id: randomUUID(),
        email: username,
        password_hash: hashPassword(password),
        role: "user",
        must_change_password: 1,
        created_at: now,
        updated_at: now,
        password_changed_at: null,
      };

      db.prepare(
        `
          INSERT INTO users(
            id,
            email,
            password_hash,
            role,
            must_change_password,
            created_at,
            updated_at,
            password_changed_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `
      ).run(
        newUser.id,
        newUser.email,
        newUser.password_hash,
        newUser.role,
        newUser.must_change_password,
        newUser.created_at,
        newUser.updated_at,
        newUser.password_changed_at
      );

      seedUserSupportRows(newUser.id);

      sendJson(res, 201, {
        user: {
          id: newUser.id,
          username: newUser.email,
          role: newUser.role,
          must_change_password: true,
          created_at: newUser.created_at,
        },
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/sign-in-oauth") {
      sendJson(res, 405, { error: "OAuth sign-in is disabled in local mode." });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/sign-out") {
      const token = getAuthToken(req.headers);
      if (token) {
        db.prepare("DELETE FROM local_sessions WHERE token = ?;").run(token);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/session") {
      const token = getAuthToken(req.headers);
      if (!token) {
        sendJson(res, 200, { session: null, user: null });
        return;
      }

      const user = getUserByToken(token);
      if (!user) {
        sendJson(res, 200, { session: null, user: null });
        return;
      }

      const session = {
        access_token: token,
        token_type: "bearer",
        expires_in: 31536000,
        refresh_token: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.email,
          app_metadata: {
            role: user.role || "user",
          },
          user_metadata: {
            full_name: user.email,
            must_change_password: Boolean(user.must_change_password),
          },
          aud: "authenticated",
          created_at: user.created_at,
        },
      };

      sendJson(res, 200, {
        session,
        user: session.user,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/db/query") {
      const raw = await readRawBody(req);
      const payload = parseJsonOrThrow(raw);
      const user = getCurrentUser(req);
      if (!user) {
        sendJson(res, 401, { error: "No active user session" });
        return;
      }
      const result = executeDbQuery(payload, user);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname.startsWith("/functions/v1/")) {
      const raw = await readRawBody(req);
      const fnName = pathname.replace("/functions/v1/", "");
      const user = getCurrentUser(req);

      if (!user) {
        sendJson(res, 401, { error: "No active user session" });
        return;
      }

      handleFunctionRequest(req, res, fnName, raw, user);
      return;
    }

    sendJson(res, 404, { error: "Not Found" });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[local-api] SQLite API running on http://${HOST}:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[local-api] Database file: ${DB_PATH}`);
});
