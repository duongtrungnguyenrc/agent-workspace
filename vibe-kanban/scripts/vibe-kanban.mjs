#!/usr/bin/env node
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { Server as SocketServer } from "socket.io";

const STATUSES = ["open", "in_progress", "in_review", "closed", "hold", "cancelled"];
const TICKET_TYPES = ["group", "feature", "task"];
const KINDS = ["feature", "bugfix", "refactor", "chore", "docs", "test"];
const STEP_STATUSES = ["pending", "in_progress", "completed", "blocked"];
const KIND_SIGNALS = {
  bugfix: [["fix", 2], ["fixes", 2], ["fixed", 2], ["bug", 2], ["hotfix", 2], ["broken", 2], ["crash", 2], ["crashes", 2], ["regression", 2], ["defect", 2], ["not working", 2], ["does not work", 2], ["doesn't work", 2], ["error", 1], ["fail", 1], ["fails", 1], ["failing", 1], ["incorrect", 1], ["wrong", 1], ["lỗi", 2], ["sửa", 2], ["sai", 1]],
  feature: [["feature", 2], ["implement", 2], ["introduce", 2], ["add", 1], ["new", 1], ["create", 1], ["support", 1], ["enable", 1], ["allow", 1], ["build", 1], ["tính năng", 2], ["thêm", 1], ["mới", 1]],
  refactor: [["refactor", 2], ["refactoring", 2], ["cleanup", 2], ["clean up", 2], ["restructure", 2], ["simplify", 2], ["extract", 2], ["rename", 2], ["tech debt", 2], ["reorganize", 2], ["tái cấu trúc", 2]],
  chore: [["chore", 2], ["upgrade", 2], ["bump", 2], ["dependency", 2], ["dependencies", 2], ["tooling", 2], ["maintenance", 2], ["config", 1], ["configuration", 1], ["ci", 1], ["pipeline", 1], ["migrate", 1], ["setup", 1], ["cấu hình", 2]],
  docs: [["docs", 2], ["documentation", 2], ["readme", 2], ["document", 1], ["guide", 1], ["tài liệu", 2]],
  test: [["test", 2], ["tests", 2], ["testing", 2], ["spec", 1], ["coverage", 2], ["e2e", 2], ["unit test", 2], ["integration test", 2], ["kiểm thử", 2]],
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(__dirname, "..");
const defaultDbPath = resolve(process.cwd(), ".vibe-kanban", "vibe-kanban.sqlite");

class VibeKanbanError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.name = "VibeKanbanError";
    this.code = code;
  }
}

function usage(exitCode = 0) {
  const text = `
vibe-kanban <command> [options]

Commands:
  list [--json]
  smart-search <query> [--json] [--type <type>] [--kind <kind>] [--status <status>] [--parent-for <type>] [--limit <n>]
  detect-kind <text> [--json]
  get <ticket-id> [--json]
  create --title <title> [--kind <kind>] [--raw-requirement <text|@file>] [--specification <text|@file>] [--execution-plan <text|@file>]
  update <ticket-id> [--title <title>] [--type <group|feature|task>] [--kind <kind>] [--parent-id <id>] [--specification <text|@file>] [--execution-plan <text|@file>]
  delete <ticket-id> [--cascade] [--description <text|@file>] [--json] [--quiet]
  approve <ticket-id> [--actor <name>] [--description <text|@file>] [--quiet]
  comment <ticket-id> --comment <text|@file> [--actor <name>] [--quiet]
  questions <ticket-id> --questions <text|@file> [--description <text|@file>] [--quiet]
  start <ticket-id> [--description <text|@file>] [--quiet]
  progress <ticket-id> --percent <0-100> [--note <text|@file>] [--description <text|@file>] [--quiet]
  progress-log <ticket-id> --description <text|@file> [--step <name|number>] [--step-status <pending|in_progress|completed|blocked>] [--percent <0-100>] [--quiet]
  hold <ticket-id> [--description <text|@file>] [--quiet]
  review <ticket-id> [--description <text|@file>] [--quiet]
  close <ticket-id> [--description <text|@file>] [--quiet]
  cancel <ticket-id> [--description <text|@file>] [--quiet]
  move <ticket-id> --status <open|in_progress|hold|cancelled|in_review|closed> [--description <text|@file>] [--quiet]
  add-commit <ticket-id> --commit-hash <hash> [--url <url>] [--parent-hash <hash>] [--branch <branch>] [--message <message>] [--author <author>]
  pr <ticket-id> [--pr-url <url>] [--pr-number <number>] [--pr-status <status>] [--description <text|@file>] [--quiet]
  pipeline <ticket-id> [--pipeline-status <status>] [--pipeline-url <url>] [--description <text|@file>] [--quiet]
  action-log <ticket-id> --description <text|@file> [--action-type <type>] [--status <status>] [--url <url>] [--quiet]
  events <ticket-id> [--json]
  activity [--json] [--limit <n>] [--before <event-id>]
  seed [--json]
  serve [--host 127.0.0.1] [--port 8765]

Options:
  --type <group|feature|task>
  --kind <feature|bugfix|refactor|chore|docs|test>  (task kind; auto-detected on create when omitted)
  --status <open|in_progress|hold|cancelled|in_review|closed>
  --parent-id <id>
  --source-type <type>
  --source-id <id>
  --source-url <url>
  --source-snapshot <text|@file>
  --source-evidence <json|@file>
  --branch <branch>
  --base-commit <hash>
  --head-commit <hash>
  --pr-url <url>
  --pr-number <number>
  --pr-status <status>
  --pipeline-status <status>
  --pipeline-url <url>
  --action-items <text|@file>
  --user-comments <text|@file>
  --open-questions <text|@file>
  --comment <text|@file>
  --questions <text|@file>
  --progress-percent <0-100>
  --query <text>
  --limit <n>
  --before <event-id>
  --cascade
  --parent-for <group|feature|task>

Database:
  Defaults to .vibe-kanban/vibe-kanban.sqlite. Override with VIBE_KANBAN_DB.
`.trim();
  console.log(text);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2).replaceAll("-", "_");
    if (key === "json" || key === "help" || key === "quiet" || key === "cascade") {
      args[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`missing value for ${token}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function fail(message, code = 2) {
  throw new VibeKanbanError(message, code);
}

function now() {
  return new Date().toISOString();
}

function readValue(value) {
  if (!value) return "";
  if (value.startsWith("@")) {
    return readFileSync(resolve(process.cwd(), value.slice(1)), "utf8");
  }
  return value;
}

function dbPath() {
  return resolve(process.env.VIBE_KANBAN_DB || defaultDbPath);
}

function openDb() {
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // The local server keeps a long-lived connection while agents run CLI commands against the same file.
  // WAL lets readers and one writer overlap, and busy_timeout makes both sides wait instead of failing with "database is locked".
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'group',
      status TEXT NOT NULL DEFAULT 'open',
      user_reviewed INTEGER NOT NULL DEFAULT 0,
      progress_percent INTEGER,
      approved_revision_id INTEGER,
      raw_requirement TEXT NOT NULL DEFAULT '',
      specification TEXT NOT NULL DEFAULT '',
      execution_plan TEXT NOT NULL DEFAULT '',
      source_type TEXT,
      source_id TEXT,
      source_url TEXT,
      source_snapshot TEXT NOT NULL DEFAULT '',
      source_evidence TEXT NOT NULL DEFAULT '[]',
      user_comments TEXT NOT NULL DEFAULT '',
      open_questions TEXT NOT NULL DEFAULT '',
      branch TEXT,
      base_commit TEXT,
      head_commit TEXT,
      pr_url TEXT,
      pr_number TEXT,
      pr_status TEXT,
      pipeline_status TEXT,
      pipeline_url TEXT,
      action_items TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_commits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      commit_hash TEXT NOT NULL,
      parent_hash TEXT,
      branch TEXT,
      message TEXT,
      author TEXT,
      url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_plan_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      detail TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(ticket_id, position)
    );

    CREATE TABLE IF NOT EXISTS ticket_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);
  ensureColumn(db, "tickets", "type", "TEXT NOT NULL DEFAULT 'group'");
  ensureColumn(db, "tickets", "parent_id", "INTEGER REFERENCES tickets(id) ON DELETE SET NULL");
  ensureColumn(db, "tickets", "progress_percent", "INTEGER");
  ensureColumn(db, "tickets", "pr_url", "TEXT");
  ensureColumn(db, "tickets", "pr_number", "TEXT");
  ensureColumn(db, "tickets", "pr_status", "TEXT");
  ensureColumn(db, "tickets", "pipeline_status", "TEXT");
  ensureColumn(db, "tickets", "pipeline_url", "TEXT");
  ensureColumn(db, "tickets", "action_items", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "user_comments", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "open_questions", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tickets", "source_evidence", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "tickets", "kind", "TEXT");
  ensureColumn(db, "ticket_commits", "url", "TEXT");
  migrateLegacyTypes(db);
  backfillPlanSteps(db);
  return db;
}

// Older databases used US / use_case / uat_feedback / qc_feedback ticket types.
function migrateLegacyTypes(db) {
  db.exec(`
    UPDATE tickets SET type = 'group' WHERE type = 'US';
    UPDATE tickets SET type = 'feature' WHERE type = 'use_case';
    UPDATE tickets SET type = CASE WHEN parent_id IS NULL THEN 'group' ELSE 'feature' END
      WHERE type IN ('uat_feedback', 'qc_feedback');
  `);
}

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function normalizeType(type) {
  const value = type || "group";
  if (!TICKET_TYPES.includes(value)) {
    fail(`invalid ticket type: ${value}. Expected one of: ${TICKET_TYPES.join(", ")}`);
  }
  return value;
}

function normalizeKind(value) {
  if (value === undefined || value === null || value === "") return null;
  if (!KINDS.includes(value)) {
    fail(`invalid ticket kind: ${value}. Expected one of: ${KINDS.join(", ")}`);
  }
  return value;
}

function signalHits(text, signal) {
  if (!text) return 0;
  if (/[^a-z0-9 ]/u.test(signal) || signal.includes(" ")) {
    return text.split(signal).length - 1;
  }
  return (text.match(new RegExp(`\\b${signal}\\b`, "g")) || []).length;
}

function detectKind({ title = "", body = "" } = {}) {
  const titleText = String(title).toLowerCase();
  const bodyText = String(body).toLowerCase();
  const scores = [];
  for (const kind of KINDS) {
    let score = 0;
    const evidence = [];
    for (const [signal, weight] of KIND_SIGNALS[kind]) {
      const inTitle = signalHits(titleText, signal);
      const inBody = signalHits(bodyText, signal);
      if (inTitle) {
        score += weight * 2 * inTitle;
        evidence.push(`title:${signal}`);
      }
      if (inBody) {
        score += weight * Math.min(inBody, 3);
        evidence.push(`body:${signal}`);
      }
    }
    scores.push({ kind, score, evidence });
  }
  scores.sort((a, b) => b.score - a.score || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
  const [top, second] = scores;
  if (!top || top.score === 0) {
    return { kind: null, confidence: "none", evidence: [], scores: {} };
  }
  const ratio = second && second.score > 0 ? top.score / second.score : Infinity;
  const confidence = ratio >= 2 && top.score >= 4 ? "high" : ratio > 1 ? "medium" : "low";
  return {
    kind: top.kind,
    confidence,
    evidence: top.evidence,
    scores: Object.fromEntries(scores.filter((entry) => entry.score > 0).map((entry) => [entry.kind, entry.score])),
  };
}

function normalizeParentId(value) {
  if (value === undefined || value === null || value === "") return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) fail(`invalid parent id: ${value}`);
  return id;
}

function normalizeProgress(value) {
  if (value === undefined || value === null || value === "") return null;
  const progress = Number(value);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) fail(`invalid progress percent: ${value}`);
  return progress;
}

function validateParent(db, parentId, type, ownId = null) {
  if (!parentId) {
    if (type === "feature") fail("feature tickets must have a group parent");
    return null;
  }
  if (ownId && Number(parentId) === Number(ownId)) fail("ticket cannot be its own parent");
  const parent = db.prepare("SELECT id, type FROM tickets WHERE id = ?").get(parentId);
  if (!parent) fail(`parent ticket not found: ${parentId}`);
  if (type === "group") fail("group tickets must not have a parent");
  if (type === "feature" && parent.type !== "group") fail("feature tickets must be linked under a group ticket");
  if (type === "task" && !["group", "feature"].includes(parent.type)) {
    fail("task tickets may be top-level or linked under group or feature tickets");
  }
  return parentId;
}

function gitValue(args) {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

function currentGit() {
  return {
    branch: gitValue(["branch", "--show-current"]),
    head_commit: gitValue(["rev-parse", "HEAD"]),
    remote_url: gitValue(["remote", "get-url", "origin"]),
  };
}

function commitWebUrl(remoteUrl, hash) {
  if (!remoteUrl || !hash) return null;
  const normalized = remoteUrl
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/^ssh:\/\/git@([^/]+)\//, "https://$1/")
    .replace(/\.git$/, "");
  return /^https?:\/\//.test(normalized) ? `${normalized}/commit/${hash}` : null;
}

function boolRow(row) {
  if (!row) return row;
  let sourceEvidence = [];
  try {
    sourceEvidence = JSON.parse(row.source_evidence || "[]");
  } catch {
    sourceEvidence = [];
  }
  return {
    ...row,
    user_reviewed: Boolean(row.user_reviewed),
    kind: row.kind || null,
    raw_requirement: row.raw_requirement || "",
    specification: row.specification || "",
    execution_plan: row.execution_plan || "",
    source_snapshot: row.source_snapshot || "",
    source_evidence: Array.isArray(sourceEvidence) ? sourceEvidence : [],
    user_comments: row.user_comments || "",
    open_questions: row.open_questions || "",
    action_items: row.action_items || "",
  };
}

function recordEvent(db, ticketId, type, payload = {}, actor = "agent") {
  db.prepare("INSERT INTO ticket_events(ticket_id, type, actor, payload, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(ticketId, type, actor, JSON.stringify(payload), now());
}

function revision(db, ticketId, kind, content) {
  const result = db.prepare("INSERT INTO ticket_revisions(ticket_id, kind, content, created_at) VALUES (?, ?, ?, ?)")
    .run(ticketId, kind, content, now());
  return Number(result.lastInsertRowid);
}

function normalizeSourceEvidence(value) {
  if (value === undefined) return undefined;
  const raw = readValue(value).trim();
  if (!raw) return [];
  let items;
  try {
    items = JSON.parse(raw);
  } catch {
    fail("source evidence must be a JSON array or @file containing JSON");
  }
  if (!Array.isArray(items)) fail("source evidence must be a JSON array");
  return items.map((item, index) => {
    if (!item || typeof item !== "object") fail(`source evidence item ${index + 1} must be an object`);
    const url = String(item.url || "").trim();
    if (!/^https?:\/\//i.test(url)) fail(`source evidence item ${index + 1} requires an http(s) url`);
    const type = item.type === "image" ? "image" : "link";
    return {
      type,
      url,
      label: String(item.label || "").trim(),
      description: String(item.description || "").trim(),
    };
  });
}

function parsePlanSteps(plan) {
  return String(plan || "")
    .split("\n")
    .map((line) => line.match(/^-\s*\[([ xX])\]\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((match, index) => ({
      position: index + 1,
      title: match[2],
      status: match[1].toLowerCase() === "x" ? "completed" : "pending",
    }));
}

function syncPlanSteps(db, ticketId, plan) {
  const parsed = parsePlanSteps(plan);
  const existing = db.prepare("SELECT position, title, status, detail FROM ticket_plan_steps WHERE ticket_id = ? ORDER BY position").all(ticketId);
  db.prepare("DELETE FROM ticket_plan_steps WHERE ticket_id = ?").run(ticketId);
  const insert = db.prepare("INSERT INTO ticket_plan_steps(ticket_id, position, title, status, detail, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
  for (const step of parsed) {
    const previous = existing.find((item) => item.title === step.title);
    insert.run(ticketId, step.position, step.title, previous?.status || step.status, previous?.detail || "", now());
  }
}

function backfillPlanSteps(db) {
  const tickets = db.prepare("SELECT id, execution_plan FROM tickets WHERE execution_plan <> ''").all();
  for (const ticket of tickets) {
    const count = Number(db.prepare("SELECT COUNT(*) AS count FROM ticket_plan_steps WHERE ticket_id = ?").get(ticket.id).count);
    if (!count && parsePlanSteps(ticket.execution_plan).length) syncPlanSteps(db, ticket.id, ticket.execution_plan);
  }
}

function requireTicket(db, id) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(Number(id));
  if (!ticket) fail(`ticket not found: ${id}`);
  const full = boolRow(ticket);
  full.parent = full.parent_id
    ? boolRow(db.prepare("SELECT id, parent_id, title, type, kind, status, user_reviewed FROM tickets WHERE id = ?").get(full.parent_id))
    : null;
  full.children = db.prepare("SELECT id, parent_id, title, type, kind, status, user_reviewed FROM tickets WHERE parent_id = ? ORDER BY type, id").all(full.id).map(boolRow);
  full.revisions = db.prepare("SELECT * FROM ticket_revisions WHERE ticket_id = ? ORDER BY id").all(full.id);
  full.commits = db.prepare("SELECT * FROM ticket_commits WHERE ticket_id = ? ORDER BY id").all(full.id);
  full.plan_steps = db.prepare("SELECT id, position, title, status, detail, updated_at FROM ticket_plan_steps WHERE ticket_id = ? ORDER BY position").all(full.id);
  full.events = db.prepare("SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY id").all(full.id)
    .map((event) => ({ ...event, payload: JSON.parse(event.payload || "{}") }));
  return full;
}

function listTickets(db) {
  return db.prepare("SELECT * FROM tickets ORDER BY updated_at DESC, id DESC").all().map(boolRow);
}

function normalizeLimit(value, fallback = 10, max = 50) {
  if (value === undefined || value === null || value === "") return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) fail(`invalid limit: ${value}`);
  return Math.min(limit, max);
}

function parentTypesFor(type) {
  const ticketType = normalizeType(type);
  if (ticketType === "group") return [];
  if (ticketType === "feature") return ["group"];
  if (ticketType === "task") return ["group", "feature"];
  return [];
}

function textTokens(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9_]+/u)
    .filter((token) => token.length >= 2);
}

function uniqueTokens(value) {
  return [...new Set(textTokens(value))];
}

const SEARCH_FIELDS = [
  ["title", 8],
  ["source_id", 7],
  ["source_url", 4],
  ["source_type", 3],
  ["specification", 3],
  ["raw_requirement", 3],
  ["source_snapshot", 3],
  ["source_evidence", 3],
  ["open_questions", 3],
  ["user_comments", 2],
  ["execution_plan", 2],
  ["action_items", 1],
  ["branch", 1],
];

function fieldScore(value, tokens, exactQuery, weight, tokenWeights) {
  const text = String(value || "").toLowerCase();
  if (!text) return { score: 0, matched: false };
  let score = exactQuery && text.includes(exactQuery) ? weight * 4 : 0;
  let matched = score > 0;
  for (const token of tokens) {
    if (text.includes(token)) {
      score += weight * (tokenWeights[token] || 1);
      matched = true;
    }
  }
  return { score, matched };
}

function searchableText(ticket) {
  return SEARCH_FIELDS.map(([name]) => String(ticket[name] || "")).join("\n").toLowerCase();
}

// Rare query tokens count more than words shared by most tickets (e.g. "email", "review").
function tokenWeights(rows, tokens) {
  const texts = rows.map(searchableText);
  const total = texts.length || 1;
  return Object.fromEntries(tokens.map((token) => {
    const df = texts.filter((text) => text.includes(token)).length;
    return [token, Math.log((total + 1) / (df + 1)) + 1];
  }));
}

function summarizeTicket(row) {
  if (!row) return null;
  return boolRow({
    id: row.id,
    parent_id: row.parent_id,
    title: row.title,
    type: row.type,
    kind: row.kind,
    status: row.status,
    user_reviewed: row.user_reviewed,
    source_type: row.source_type,
    source_id: row.source_id,
    source_url: row.source_url,
    updated_at: row.updated_at,
  });
}

function suggestParent(results, parentFor) {
  if (!parentFor || !results.length) return null;
  const [top, second] = results;
  const ratio = second ? top.score / second.score : Infinity;
  const strongMatch = ["title", "source_id", "id", "children"].some((field) => top.matched_fields.includes(field));
  const confidence = ratio >= 1.6 && strongMatch ? "high" : ratio > 1 ? "medium" : "low";
  const reasons = [`matched ${top.matched_fields.join(", ")}`];
  if (top.related_children.length) {
    reasons.push(`existing child tickets match: ${top.related_children.map((child) => `#${child.ticket_id}`).join(", ")}`);
  }
  if (second) reasons.push(`score ${top.score} vs next ${second.score}`);
  if (top.ticket.type === "feature") reasons.push("feature parents are preferred for tasks");
  return {
    ticket_id: top.ticket.id,
    type: top.ticket.type,
    title: top.ticket.title,
    confidence,
    reason: reasons.join("; "),
    candidates: results.slice(0, 3).map((result) => ({ ticket_id: result.ticket.id, type: result.ticket.type, title: result.ticket.title, score: result.score })),
    next_step: confidence === "high"
      ? "State the suggested parent to the user and link it unless the user objects."
      : "Ask the user to confirm the parent from the candidates before linking.",
  };
}

function smartSearch(db, args) {
  const query = readValue(args.query || args._[1] || "").trim();
  if (!query) fail("smart-search requires <query> or --query <text|@file>");
  const limit = normalizeLimit(args.limit);
  const exactQuery = query.toLowerCase();
  const tokens = uniqueTokens(query);
  const parentFor = args.parent_for ? normalizeType(args.parent_for) : null;
  const allowedParentTypes = parentFor ? parentTypesFor(parentFor) : null;
  if (parentFor && allowedParentTypes.length === 0) fail(`${parentFor} tickets cannot have a parent`);
  if (args.status && !STATUSES.includes(args.status)) {
    fail(`invalid status: ${args.status}. Expected one of: ${STATUSES.join(", ")}`);
  }
  const kindFilter = normalizeKind(args.kind);

  const rows = listTickets(db);
  const weights = tokenWeights(rows, tokens);
  const scoreTicket = (ticket) => {
    let score = 0;
    const matched_fields = [];
    for (const [name, weight] of SEARCH_FIELDS) {
      const result = fieldScore(ticket[name], tokens, exactQuery, weight, weights);
      score += result.score;
      if (result.matched) matched_fields.push(name);
    }
    if (String(ticket.id) === query || `vk-${ticket.id}` === exactQuery) {
      score += 100;
      matched_fields.push("id");
    }
    const titleText = String(ticket.title || "").toLowerCase();
    const titleCoverage = tokens.length ? tokens.filter((token) => titleText.includes(token)).length / tokens.length : 0;
    if (titleCoverage === 1 && tokens.length > 1) score += 8;
    return { score, matched_fields };
  };
  const allScores = new Map(rows.map((ticket) => [ticket.id, scoreTicket(ticket)]));

  const entries = rows
    .filter((ticket) => {
      if (args.type && ticket.type !== normalizeType(args.type)) return false;
      if (kindFilter && ticket.kind !== kindFilter) return false;
      if (args.status && ticket.status !== args.status) return false;
      if (allowedParentTypes && !allowedParentTypes.includes(ticket.type)) return false;
      return true;
    })
    .map((ticket) => ({ ticket, ...allScores.get(ticket.id), related_children: [] }));

  if (allowedParentTypes) {
    // A strongly matching existing child (e.g. a task with the same source id) is evidence for its parent.
    const byId = new Map(entries.map((entry) => [entry.ticket.id, entry]));
    for (const ticket of rows) {
      if (byId.has(ticket.id) || !ticket.parent_id) continue;
      const own = allScores.get(ticket.id);
      const parentEntry = byId.get(ticket.parent_id);
      if (!parentEntry || !own || own.score <= 0) continue;
      parentEntry.score += own.score * 0.6;
      parentEntry.related_children.push({ ticket_id: ticket.id, type: ticket.type, title: ticket.title, score: Math.round(own.score) });
      if (!parentEntry.matched_fields.includes("children")) parentEntry.matched_fields.push("children");
    }
  }

  const scored = entries
    .map((entry) => {
      let { score } = entry;
      if (parentFor === "task" && entry.ticket.type === "feature") score *= 1.15;
      if (entry.ticket.status === "cancelled") score *= 0.5;
      return { ...entry, score: Math.round(score) };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.ticket.updated_at) - new Date(a.ticket.updated_at) || b.ticket.id - a.ticket.id)
    .slice(0, limit);

  const results = scored.map(({ ticket, score, matched_fields, related_children }) => {
    const parent = ticket.parent_id
      ? db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket.parent_id)
      : null;
    const children = db.prepare("SELECT id, parent_id, title, type, kind, status, user_reviewed, source_type, source_id, source_url, updated_at FROM tickets WHERE parent_id = ? ORDER BY type, id")
      .all(ticket.id);
    return {
      score,
      matched_fields,
      related_children: related_children.sort((a, b) => b.score - a.score).slice(0, 3),
      ticket: summarizeTicket(ticket),
      parent: summarizeTicket(parent),
      children: children.map(summarizeTicket),
    };
  });

  return {
    query,
    kind_detection: detectKind({ title: query }),
    parent_for: parentFor,
    parent_suggestion: suggestParent(results, parentFor),
    results,
  };
}

function createTicket(db, args) {
  if (!args.title) fail("create requires --title");
  const stamp = now();
  const git = currentGit();
  const type = normalizeType(args.type);
  const parentId = validateParent(db, normalizeParentId(args.parent_id), type);
  const rawRequirement = readValue(args.raw_requirement);
  const specification = readValue(args.specification);
  const executionPlan = readValue(args.execution_plan);
  const sourceSnapshot = readValue(args.source_snapshot);
  const sourceEvidence = normalizeSourceEvidence(args.source_evidence) || [];
  let kind = normalizeKind(args.kind);
  let kindSource = kind ? "explicit" : null;
  let kindDetection = null;
  if (!kind && type === "task") {
    kindDetection = detectKind({ title: args.title, body: [rawRequirement, specification, sourceSnapshot].join("\n") });
    if (kindDetection.kind) {
      kind = kindDetection.kind;
      kindSource = "detected";
    }
  }
  const result = db.prepare(`
    INSERT INTO tickets (
      parent_id, title, raw_requirement, specification, execution_plan, source_type,
      source_id, source_url, source_snapshot, source_evidence, branch, base_commit, type, kind,
      head_commit, pr_url, pr_number, pr_status, pipeline_status, pipeline_url,
      action_items, user_comments, open_questions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    parentId,
    args.title,
    rawRequirement,
    specification,
    executionPlan,
    args.source_type || null,
    args.source_id || null,
    args.source_url || null,
    sourceSnapshot,
    JSON.stringify(sourceEvidence),
    args.branch || git.branch,
    args.base_commit || git.head_commit,
    type,
    kind,
    args.head_commit || git.head_commit,
    args.pr_url || null,
    args.pr_number || null,
    args.pr_status || null,
    args.pipeline_status || null,
    args.pipeline_url || null,
    readValue(args.action_items),
    readValue(args.user_comments),
    readValue(args.open_questions),
    stamp,
    stamp,
  );
  const ticketId = Number(result.lastInsertRowid);
  if (specification) revision(db, ticketId, "specification", specification);
  if (executionPlan) revision(db, ticketId, "execution_plan", executionPlan);
  if (executionPlan) syncPlanSteps(db, ticketId, executionPlan);
  recordEvent(db, ticketId, "ticket.created", {
    title: args.title,
    type,
    parent_id: parentId,
    kind,
    kind_source: kindSource,
    kind_confidence: kindDetection?.confidence || null,
    description: eventDescription(args),
  }, args.actor || "agent");
  return requireTicket(db, ticketId);
}

function deleteTicket(db, id, args = {}) {
  const ticket = requireTicket(db, id);
  if (ticket.children.length && !args.cascade) {
    fail(`ticket ${ticket.id} has ${ticket.children.length} child ticket(s); re-link them first or pass --cascade to delete the whole subtree`);
  }
  const deleted = [];
  const remove = (current) => {
    for (const child of current.children) remove(requireTicket(db, child.id));
    recordEvent(db, current.id, "ticket.deleted", {
      title: current.title,
      type: current.type,
      kind: current.kind,
      status: current.status,
      parent_id: current.parent_id,
      children_deleted: current.children.length,
      description: eventDescription(args),
    }, args.actor || "agent");
    db.prepare("DELETE FROM ticket_revisions WHERE ticket_id = ?").run(current.id);
    db.prepare("DELETE FROM ticket_commits WHERE ticket_id = ?").run(current.id);
    db.prepare("DELETE FROM ticket_plan_steps WHERE ticket_id = ?").run(current.id);
    db.prepare("DELETE FROM tickets WHERE id = ?").run(current.id);
    deleted.push(summarizeTicket(current));
  };
  // Events stay as the audit trail for deleted tickets, so bypass the cascade FK only for this removal.
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    remove(ticket);
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
  return { deleted: true, ticket_id: ticket.id, deleted_tickets: deleted };
}

function updateTicket(db, id, args) {
  const ticket = requireTicket(db, id);
  const fields = {};
  for (const key of ["title", "raw_requirement", "source_type", "source_id", "source_url", "source_snapshot", "branch", "base_commit", "head_commit", "pr_url", "pr_number", "pr_status", "pipeline_status", "pipeline_url", "action_items", "user_comments", "open_questions"]) {
    if (args[key] !== undefined) fields[key] = key.endsWith("snapshot") || ["raw_requirement", "action_items", "user_comments", "open_questions"].includes(key) ? readValue(args[key]) : args[key];
  }
  if (args.source_evidence !== undefined) fields.source_evidence = JSON.stringify(normalizeSourceEvidence(args.source_evidence));
  if (args.progress_percent !== undefined) fields.progress_percent = normalizeProgress(args.progress_percent);
  if (args.kind !== undefined) fields.kind = normalizeKind(args.kind);
  const nextType = args.type !== undefined ? normalizeType(args.type) : ticket.type;
  if (args.type !== undefined) fields.type = nextType;
  if (args.parent_id !== undefined) fields.parent_id = validateParent(db, normalizeParentId(args.parent_id), nextType, id);
  if (args.specification !== undefined) fields.specification = readValue(args.specification);
  if (args.execution_plan !== undefined) fields.execution_plan = readValue(args.execution_plan);

  const specChanged = fields.specification !== undefined && fields.specification !== ticket.specification;
  const planChanged = fields.execution_plan !== undefined && fields.execution_plan !== ticket.execution_plan;
  if (specChanged || planChanged) {
    fields.user_reviewed = 0;
    fields.approved_revision_id = null;
  }
  if (Object.keys(fields).length === 0) return ticket;

  fields.updated_at = now();
  const names = Object.keys(fields);
  db.prepare(`UPDATE tickets SET ${names.map((name) => `${name} = ?`).join(", ")} WHERE id = ?`)
    .run(...names.map((name) => fields[name]), Number(id));
  if ((specChanged || planChanged) && ticket.user_reviewed) {
    recordEvent(db, Number(id), "ticket.approval_invalidated", { reason: "spec_or_plan_changed" });
  }
  if (specChanged) {
    revision(db, Number(id), "specification", fields.specification);
    recordEvent(db, Number(id), "ticket.spec_updated");
  }
  if (planChanged) {
    revision(db, Number(id), "execution_plan", fields.execution_plan);
    syncPlanSteps(db, Number(id), fields.execution_plan);
    recordEvent(db, Number(id), "ticket.plan_updated");
  }
  const metadataChanged = names.filter((name) => !["updated_at", "user_reviewed", "approved_revision_id", "specification", "execution_plan"].includes(name));
  if (metadataChanged.length) {
    recordEvent(db, Number(id), "ticket.updated", { fields: metadataChanged });
  }
  return requireTicket(db, id);
}

function appendEntry(existing, actor, content) {
  const entry = [`### ${actor} - ${now()}`, "", content.trim()].join("\n");
  return [String(existing || "").trim(), entry].filter(Boolean).join("\n\n");
}

function commentTicket(db, id, args) {
  const ticket = requireTicket(db, id);
  const comment = readValue(args.comment || args.description || "").trim();
  if (!comment) fail("comment requires --comment <text|@file>");
  const actor = args.actor || "user";
  const userComments = appendEntry(ticket.user_comments, actor, comment);
  db.prepare("UPDATE tickets SET user_comments = ?, updated_at = ? WHERE id = ?").run(userComments, now(), Number(id));
  recordEvent(db, Number(id), "ticket.user_commented", { comment }, actor);
  return requireTicket(db, id);
}

function setOpenQuestions(db, id, args) {
  const questions = readValue(args.questions || args.open_questions || "").trim();
  if (!questions) fail("questions requires --questions <text|@file>");
  const ticket = requireTicket(db, id);
  db.prepare("UPDATE tickets SET status = 'hold', open_questions = ?, updated_at = ? WHERE id = ?").run(questions, now(), Number(id));
  recordEvent(db, Number(id), "ticket.questions_opened", {
    from: ticket.status,
    to: "hold",
    questions,
    description: eventDescription(args),
  });
  return requireTicket(db, id);
}

function eventDescription(args = {}) {
  return readValue(args.description || args.note || "");
}

function transition(db, id, to, eventType = "ticket.status_changed", args = {}) {
  const ticket = requireTicket(db, id);
  if (!STATUSES.includes(to)) fail(`invalid status: ${to}. Expected one of: ${STATUSES.join(", ")}`);
  db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?").run(to, now(), Number(id));
  recordEvent(db, Number(id), eventType, { from: ticket.status, to, description: eventDescription(args) });
  return requireTicket(db, id);
}

function moveTicket(db, id, to, args = {}) {
  return transition(db, id, to, "ticket.status_changed", args);
}

function approve(db, id, actor = "user", args = {}) {
  const ticket = requireTicket(db, id);
  if (ticket.type !== "task") fail("only task tickets can be approved for implementation");
  if (!ticket.execution_plan.trim()) fail("cannot approve ticket without an execution plan");
  if (!ticket.plan_steps.length) fail("execution plan must contain at least one Markdown checklist step (- [ ])");
  const latestPlan = db.prepare("SELECT id FROM ticket_revisions WHERE ticket_id = ? AND kind = 'execution_plan' ORDER BY id DESC LIMIT 1").get(Number(id));
  db.prepare("UPDATE tickets SET user_reviewed = 1, approved_revision_id = ?, updated_at = ? WHERE id = ?")
    .run(latestPlan?.id || null, now(), Number(id));
  recordEvent(db, Number(id), "ticket.approved", { approved_revision_id: latestPlan?.id || null, description: eventDescription(args) }, actor);
  return requireTicket(db, id);
}

function start(db, id, args = {}) {
  const ticket = requireTicket(db, id);
  if (ticket.type !== "task") fail("only task tickets can be started for implementation");
  if (!ticket.user_reviewed) {
    fail("current execution plan is not approved; ask the user to review and approve it before implementation");
  }
  return transition(db, id, "in_progress", "ticket.implementation_started", args);
}

function updateProgress(db, id, args) {
  const percent = normalizeProgress(args.percent ?? args.progress_percent);
  if (percent === null) fail("progress requires --percent <0-100>");
  db.prepare("UPDATE tickets SET progress_percent = ?, updated_at = ? WHERE id = ?").run(percent, now(), Number(id));
  recordEvent(db, Number(id), "ticket.progress_updated", { percent, note: readValue(args.note || ""), description: eventDescription(args) });
  return requireTicket(db, id);
}

function progressLog(db, id, args) {
  requireTicket(db, id);
  const description = eventDescription(args);
  if (!description.trim()) fail("progress-log requires --description <text|@file>");
  let percent = normalizeProgress(args.percent ?? args.progress_percent);
  const fields = { updated_at: now() };
  if (percent !== null) fields.progress_percent = percent;
  const names = Object.keys(fields);
  db.prepare(`UPDATE tickets SET ${names.map((name) => `${name} = ?`).join(", ")} WHERE id = ?`)
    .run(...names.map((name) => fields[name]), Number(id));
  let stepStatus = null;
  let planStep = null;
  if (args.step_status !== undefined) {
    stepStatus = String(args.step_status);
    if (!STEP_STATUSES.includes(stepStatus)) fail(`invalid step status: ${stepStatus}. Expected one of: ${STEP_STATUSES.join(", ")}`);
    const selector = String(args.step || "").trim();
    if (!selector) fail("--step-status requires --step <name|number>");
    const numeric = Number(selector);
    planStep = Number.isInteger(numeric)
      ? db.prepare("SELECT * FROM ticket_plan_steps WHERE ticket_id = ? AND position = ?").get(Number(id), numeric)
      : db.prepare("SELECT * FROM ticket_plan_steps WHERE ticket_id = ? AND title = ?").get(Number(id), selector);
    if (!planStep) fail(`execution plan step not found: ${selector}`);
    db.prepare("UPDATE ticket_plan_steps SET status = ?, detail = ?, updated_at = ? WHERE id = ?")
      .run(stepStatus, description, now(), planStep.id);
    if (percent === null) {
      const counts = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed FROM ticket_plan_steps WHERE ticket_id = ?").get(Number(id));
      percent = counts.total ? Math.round((Number(counts.completed || 0) / Number(counts.total)) * 100) : null;
      if (percent !== null) db.prepare("UPDATE tickets SET progress_percent = ? WHERE id = ?").run(percent, Number(id));
    }
  }
  recordEvent(db, Number(id), "ticket.progress_logged", {
    description,
    step: planStep?.title || args.step || "",
    step_position: planStep?.position || null,
    step_status: stepStatus,
    percent,
  });
  return requireTicket(db, id);
}

function addCommit(db, id, args) {
  if (!args.commit_hash) fail("add-commit requires --commit-hash");
  const git = currentGit();
  const url = args.url || commitWebUrl(git.remote_url, args.commit_hash);
  db.prepare(`
    INSERT INTO ticket_commits(ticket_id, commit_hash, parent_hash, branch, message, author, url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(Number(id), args.commit_hash, args.parent_hash || null, args.branch || git.branch, args.message || null, args.author || null, url, now());
  db.prepare("UPDATE tickets SET head_commit = ?, updated_at = ? WHERE id = ?").run(args.commit_hash, now(), Number(id));
  recordEvent(db, Number(id), "ticket.commit_added", { commit_hash: args.commit_hash, url: url || "" });
  return requireTicket(db, id);
}

function updatePr(db, id, args) {
  requireTicket(db, id);
  const fields = {};
  for (const key of ["pr_url", "pr_number", "pr_status"]) {
    if (args[key] !== undefined) fields[key] = args[key] || null;
  }
  if (Object.keys(fields).length === 0) fail("pr requires at least one of --pr-url, --pr-number, or --pr-status");
  fields.updated_at = now();
  const names = Object.keys(fields);
  db.prepare(`UPDATE tickets SET ${names.map((name) => `${name} = ?`).join(", ")} WHERE id = ?`)
    .run(...names.map((name) => fields[name]), Number(id));
  recordEvent(db, Number(id), "ticket.pr_updated", {
    pr_url: fields.pr_url,
    pr_number: fields.pr_number,
    pr_status: fields.pr_status,
    description: eventDescription(args),
  });
  return requireTicket(db, id);
}

function updatePipeline(db, id, args) {
  requireTicket(db, id);
  const fields = {};
  for (const key of ["pipeline_status", "pipeline_url"]) {
    if (args[key] !== undefined) fields[key] = args[key] || null;
  }
  if (Object.keys(fields).length === 0) fail("pipeline requires --pipeline-status or --pipeline-url");
  fields.updated_at = now();
  const names = Object.keys(fields);
  db.prepare(`UPDATE tickets SET ${names.map((name) => `${name} = ?`).join(", ")} WHERE id = ?`)
    .run(...names.map((name) => fields[name]), Number(id));
  recordEvent(db, Number(id), "ticket.pipeline_updated", {
    pipeline_status: fields.pipeline_status,
    pipeline_url: fields.pipeline_url,
    description: eventDescription(args),
  });
  return requireTicket(db, id);
}

function actionLog(db, id, args) {
  requireTicket(db, id);
  const description = eventDescription(args);
  if (!description.trim()) fail("action-log requires --description <text|@file>");
  db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(now(), Number(id));
  recordEvent(db, Number(id), "ticket.action_logged", {
    action_type: args.action_type || "",
    status: args.status || "",
    url: args.url || "",
    description,
  });
  return requireTicket(db, id);
}

function ticketEvents(db, id) {
  requireTicket(db, id);
  return db.prepare("SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY id").all(Number(id))
    .map((event) => ({ ...event, payload: JSON.parse(event.payload || "{}") }));
}

const ACTIVITY_SELECT = `
  SELECT
    ticket_events.id,
    ticket_events.ticket_id,
    ticket_events.type,
    ticket_events.actor,
    ticket_events.payload,
    ticket_events.created_at,
    tickets.id AS existing_ticket_id,
    tickets.title AS ticket_title,
    tickets.type AS ticket_type,
    tickets.kind AS ticket_kind,
    tickets.status AS ticket_status
  FROM ticket_events
  LEFT JOIN tickets ON tickets.id = ticket_events.ticket_id
`;

function activityEvent(row) {
  const payload = JSON.parse(row.payload || "{}");
  const exists = row.existing_ticket_id !== null && row.existing_ticket_id !== undefined;
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    type: row.type,
    actor: row.actor,
    payload,
    created_at: row.created_at,
    ticket_exists: exists,
    ticket_title: exists ? row.ticket_title : (typeof payload.title === "string" ? payload.title : null),
    ticket_type: exists ? row.ticket_type : (typeof payload.type === "string" ? payload.type : null),
    ticket_kind: exists ? row.ticket_kind : (typeof payload.kind === "string" ? payload.kind : null),
    ticket_status: exists ? row.ticket_status : (typeof payload.status === "string" ? payload.status : null),
  };
}

function normalizeCursor(value) {
  if (value === undefined || value === null || value === "") return null;
  const cursor = Number(value);
  if (!Number.isInteger(cursor) || cursor <= 0) fail(`invalid cursor: ${value}`);
  return cursor;
}

function listActivity(db, args = {}) {
  const limit = normalizeLimit(args.limit, 50, 200);
  const before = normalizeCursor(args.before);
  const rows = db.prepare(`${ACTIVITY_SELECT} WHERE (? IS NULL OR ticket_events.id < ?) ORDER BY ticket_events.id DESC LIMIT ?`)
    .all(before, before, limit + 1);
  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit).map(activityEvent);
  return {
    events,
    has_more: hasMore,
    next_cursor: hasMore ? events[events.length - 1].id : null,
  };
}

function activityAfter(db, afterId, limit = 200) {
  return db.prepare(`${ACTIVITY_SELECT} WHERE ticket_events.id > ? ORDER BY ticket_events.id ASC LIMIT ?`)
    .all(Number(afterId), limit)
    .map(activityEvent);
}

function seedTickets(db) {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM tickets WHERE source_type = 'sample'").get();
  if (existing.count > 0) {
    repairSampleHierarchy(db);
    return listTickets(db).filter((ticket) => ticket.source_type === "sample");
  }
  const samples = [
    {
      title: "Rewrite requirement into implementation specification",
      type: "group",
      status: "open",
      raw_requirement: "As a coding agent, I need a raw user request to become a clear implementation spec before planning.",
      specification: `# Objective

Rewrite raw requirements into a predictable Markdown implementation specification.

## Context

Agents need a stable document before they inspect the codebase and prepare an execution plan.

## Requirements

- Store the raw requirement.
- Store the rewritten implementation specification.
- Keep source ticket fields optional.

## Acceptance Criteria

- A ticket can be created without source ticket information.
- The specification is visible on the detail page.

## Constraints

- Use SQLite as the source of truth.

## Out of Scope

- Fetching Jira, Linear, or GitHub issues.`,
      execution_plan: `# Execution Plan

## source/backend

- Add ticket persistence fields for raw requirement and specification.

## source/frontend

- Render the rewritten specification in the ticket detail page.`,
    },
    {
      title: "Approve execution plan before implementation starts",
      type: "feature",
      status: "in_review",
      raw_requirement: "User must review the generated plan before the agent modifies implementation code.",
      specification: `# Objective

Require explicit user approval before implementation starts.

## Context

Agents may prepare tickets freely, but implementation needs a user-reviewed scope.

## Requirements

- Default user_reviewed to false.
- Block start when the plan is not approved.
- Invalidate approval when the plan changes.

## Acceptance Criteria

- Start fails before approval.
- Start succeeds after approval.
- Updating execution_plan resets user_reviewed to false.`,
      execution_plan: `# Execution Plan

## source/backend

- Enforce approval gate in the start command and API action.
- Reset approval on execution plan update.

## source/frontend

- Show approval state on the card and detail page.
- Provide an approve action for the user.`,
    },
    {
      title: "Trace implementation commits on each ticket",
      type: "task",
      status: "hold",
      raw_requirement: "Keep enough Git information to understand what was implemented for a ticket.",
      specification: `# Objective

Record branch and commit metadata for implementation traceability.

## Requirements

- Store branch, base commit, and head commit on the ticket.
- Store associated commits with hash, parent, branch, message, author, and timestamp.

## Acceptance Criteria

- Agent can add a commit from CLI.
- Git trace appears in the detail page.`,
      execution_plan: `# Execution Plan

## source/backend

- Add ticket_commits persistence and add-commit command.

## source/frontend

- Render Git trace in the ticket detail page.`,
    },
  ];
  let parentId = null;
  for (const sample of samples) {
    const ticket = createTicket(db, { ...sample, parent_id: parentId, source_type: "sample", source_id: sample.type });
    if (sample.status !== "open") {
      db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?").run(sample.status, now(), ticket.id);
      recordEvent(db, ticket.id, "ticket.status_changed", { from: "open", to: sample.status });
    }
    parentId = ticket.id;
  }
  return listTickets(db).filter((ticket) => ticket.source_type === "sample");
}

function repairSampleHierarchy(db) {
  const story = db.prepare("SELECT id FROM tickets WHERE source_type = 'sample' AND type = 'group' ORDER BY id LIMIT 1").get();
  const useCase = db.prepare("SELECT id FROM tickets WHERE source_type = 'sample' AND type = 'feature' ORDER BY id LIMIT 1").get();
  const task = db.prepare("SELECT id FROM tickets WHERE source_type = 'sample' AND type = 'task' ORDER BY id LIMIT 1").get();
  if (story && useCase) {
    db.prepare("UPDATE tickets SET parent_id = ? WHERE id = ?").run(story.id, useCase.id);
  }
  if (useCase && task) {
    db.prepare("UPDATE tickets SET parent_id = ? WHERE id = ?").run(useCase.id, task.id);
  }
}

function printTicketLines(items) {
  for (const item of items) {
    const ticket = item.ticket || item;
    const prefix = item.ticket ? `score=${item.score} ` : "";
    const matched = item.matched_fields?.length ? ` matched=${item.matched_fields.join(",")}` : "";
    const parent = item.parent ? ` parent=#${item.parent.id}` : "";
    const via = item.related_children?.length ? ` via=${item.related_children.map((child) => `#${child.ticket_id}`).join(",")}` : "";
    const kind = ticket.kind ? `:${ticket.kind}` : "";
    console.log(`${prefix}#${ticket.id} [${ticket.type || "group"}${kind}:${ticket.status}] ${ticket.title} reviewed=${ticket.user_reviewed}${parent}${matched}${via}`);
  }
}

function print(value, jsonOutput, quiet = false) {
  if (quiet) return;
  if (jsonOutput) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (Array.isArray(value)) {
    printTicketLines(value);
    return;
  }
  if (value && Array.isArray(value.results)) {
    const detection = value.kind_detection;
    console.log(`kind: ${detection?.kind || "unknown"} (${detection?.confidence || "none"})`);
    if (value.parent_suggestion) {
      const suggestion = value.parent_suggestion;
      console.log(`suggested parent: #${suggestion.ticket_id} [${suggestion.type}] ${suggestion.title} (${suggestion.confidence}) - ${suggestion.reason}`);
    } else if (value.parent_for) {
      console.log("suggested parent: none");
    }
    printTicketLines(value.results);
    return;
  }
  if (value && Array.isArray(value.events) && "has_more" in value) {
    for (const event of value.events) {
      console.log(`#${event.id} ${event.created_at} ${event.type} ticket=${event.ticket_id}${event.ticket_exists ? "" : " (deleted)"} actor=${event.actor}`);
    }
    if (value.has_more) console.log(`more: --before ${value.next_cursor}`);
    return;
  }
  if (value && value.deleted) {
    for (const ticket of value.deleted_tickets) {
      console.log(`deleted #${ticket.id} [${ticket.type}:${ticket.status}] ${ticket.title}`);
    }
    return;
  }
  if (value && "kind" in value && "confidence" in value) {
    console.log(`kind: ${value.kind || "unknown"} (${value.confidence})`);
    if (value.evidence?.length) console.log(`evidence: ${value.evidence.join(", ")}`);
    return;
  }
  console.log(`#${value.id} [${value.type || "group"}${value.kind ? `:${value.kind}` : ""}:${value.status}] ${value.title}`);
  console.log(`reviewed: ${value.user_reviewed}`);
  console.log(`branch: ${value.branch || ""}`);
  console.log("");
  console.log(value.execution_plan || value.specification || "");
}

function send(res, status, payload, headers = {}) {
  const body = typeof payload === "string" || payload instanceof Uint8Array ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    "content-length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("request body too large"));
    });
    req.on("end", () => resolveBody(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

async function handleApi(req, res, db, notify = () => {}) {
  const url = new URL(req.url, "http://local");
  try {
    if (req.method === "GET" && url.pathname === "/api/tickets") {
      return send(res, 200, { statuses: STATUSES, types: TICKET_TYPES, kinds: KINDS, tickets: listTickets(db) }, { "content-type": "application/json" });
    }
    if (req.method === "GET" && url.pathname === "/api/activity") {
      return send(res, 200, listActivity(db, { limit: url.searchParams.get("limit"), before: url.searchParams.get("before") }), { "content-type": "application/json" });
    }
    if (req.method === "GET" && url.pathname === "/api/search") {
      const query = url.searchParams.get("q") || "";
      const result = smartSearch(db, { _: ["smart-search", query], type: url.searchParams.get("type") || undefined, kind: url.searchParams.get("kind") || undefined, status: url.searchParams.get("status") || undefined, parent_for: url.searchParams.get("parent_for") || undefined, limit: url.searchParams.get("limit") || undefined });
      return send(res, 200, result, { "content-type": "application/json" });
    }
    if (req.method === "POST" && url.pathname === "/api/tickets") {
      const body = await readBody(req);
      const result = createTicket(db, { ...body, actor: body.actor || "user" });
      notify();
      return send(res, 201, result, { "content-type": "application/json" });
    }
    const match = url.pathname.match(/^\/api\/tickets\/(\d+)(?:\/([a-z-]+))?$/);
    if (!match) return send(res, 404, { error: "not found" }, { "content-type": "application/json" });
    const id = Number(match[1]);
    const action = match[2];
    if (req.method === "GET" && !action) {
      return send(res, 200, requireTicket(db, id), { "content-type": "application/json" });
    }
    if (req.method === "DELETE" && !action) {
      const result = deleteTicket(db, id, { cascade: url.searchParams.get("cascade") === "true", actor: "user" });
      notify();
      return send(res, 200, result, { "content-type": "application/json" });
    }
    if (req.method !== "POST") {
      return send(res, 405, { error: "method not allowed" }, { "content-type": "application/json" });
    }
    const body = await readBody(req);
    let result;
    if (action === "delete") result = deleteTicket(db, id, { ...body, actor: body.actor || "user" });
    else if (action === "approve") result = approve(db, id, body.actor || "user", body);
    else if (action === "start") result = start(db, id, body);
    else if (action === "hold") result = transition(db, id, "hold", "ticket.status_changed", body);
    else if (action === "comment") result = commentTicket(db, id, body);
    else if (action === "questions") result = setOpenQuestions(db, id, body);
    else if (action === "review") result = transition(db, id, "in_review", "ticket.review_requested", body);
    else if (action === "close") result = transition(db, id, "closed", "ticket.closed", body);
    else if (action === "cancel") result = transition(db, id, "cancelled", "ticket.status_changed", body);
    else if (action === "update") result = updateTicket(db, id, body);
    else if (action === "progress") result = updateProgress(db, id, body);
    else if (action === "progress-log") result = progressLog(db, id, body);
    else if (action === "move") result = moveTicket(db, id, body.status, body);
    else if (action === "pr") result = updatePr(db, id, body);
    else if (action === "pipeline") result = updatePipeline(db, id, body);
    else if (action === "action-log") result = actionLog(db, id, body);
    else return send(res, 404, { error: "unknown action" }, { "content-type": "application/json" });
    notify();
    return send(res, 200, result, { "content-type": "application/json" });
  } catch (error) {
    return send(res, 400, { error: error.message }, { "content-type": "application/json" });
  }
}

function contentType(pathname) {
  const extension = extname(pathname);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function serve(args) {
  const host = args.host || "127.0.0.1";
  const port = Number(args.port || 8765);
  const db = openDb();
  const databasePath = dbPath();
  const assets = resolve(skillRoot, "assets");
  const dist = join(assets, "dist");
  const indexPath = join(dist, "index.html");
  let lastEventId = Number(db.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM ticket_events").get().id);
  // Every mutation (API or CLI) records ticket events, so the event tail is the single notification source.
  // A failed poll (for example a CLI write holding the lock longer than busy_timeout) is logged and retried on the next tick.
  const emitNewEvents = (source) => {
    try {
      for (const event of activityAfter(db, lastEventId)) {
        lastEventId = event.id;
        io.emit("tickets:changed", { ...event, source, updated_at: event.created_at });
      }
    } catch (error) {
      console.error(`[vibe-kanban] event poll failed (${source}): ${error.message}`);
    }
  };
  const server = createServer((req, res) => {
    try {
      handleRequest(req, res);
    } catch (error) {
      console.error(`[vibe-kanban] request failed: ${error.message}`);
      if (!res.headersSent) send(res, 500, { error: error.message }, { "content-type": "application/json" });
      else res.end();
    }
  });
  const handleRequest = (req, res) => {
    const url = new URL(req.url, "http://local");
    if (url.pathname.startsWith("/api/")) return handleApi(req, res, db, () => emitNewEvents("api"));
    if (
      url.pathname === "/" ||
      url.pathname === "/index.html" ||
      url.pathname === "/activity" ||
      /^\/tickets\/\d+$/.test(url.pathname)
    ) {
      if (!existsSync(indexPath)) {
        return send(
          res,
          503,
          "React UI is not built. Run `pnpm install && pnpm vk:build` from the workspace root.",
          { "content-type": "text/plain; charset=utf-8" },
        );
      }
      return send(res, 200, readFileSync(indexPath, "utf8"), { "content-type": "text/html; charset=utf-8" });
    }
    const assetPath = join(dist, url.pathname);
    if (assetPath.startsWith(dist) && existsSync(assetPath)) {
      return send(res, 200, readFileSync(assetPath), { "content-type": contentType(assetPath) });
    }
    return send(res, 404, "not found", { "content-type": "text/plain" });
  };
  const io = new SocketServer(server, {
    cors: { origin: "*" },
  });
  io.on("connection", (socket) => {
    socket.emit("tickets:ready", { connected: true });
  });
  // CLI writes land in the WAL file, so the main database file's mtime is not a reliable change signal.
  // Poll the event tail instead; the query is indexed on the primary key and returns nothing when idle.
  const poll = setInterval(() => emitNewEvents("sqlite"), 500);
  server.on("close", () => {
    clearInterval(poll);
  });
  // A local dev server should log unexpected errors rather than die while agents are mid-workflow.
  process.on("uncaughtException", (error) => {
    console.error(`[vibe-kanban] uncaught exception: ${error.stack || error.message}`);
  });
  process.on("unhandledRejection", (reason) => {
    console.error(`[vibe-kanban] unhandled rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
  });
  server.listen(port, host, () => {
    console.log(`Vibe Kanban running at http://${host}:${server.address().port}`);
    console.log(`SQLite database: ${databasePath}`);
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) usage(args.help ? 0 : 2);
  const [command, id] = args._;
  if (command === "serve") return serve(args);
  const db = openDb();
  if (command === "list") return print(listTickets(db), args.json, args.quiet);
  if (command === "smart-search") return print(smartSearch(db, args), args.json, args.quiet);
  if (command === "detect-kind") return print(detectKind({ title: readValue(args.query || id || "") }), args.json, args.quiet);
  if (command === "get") return print(requireTicket(db, id), args.json, args.quiet);
  if (command === "create") return print(createTicket(db, args), args.json, args.quiet);
  if (command === "update") return print(updateTicket(db, id, args), args.json, args.quiet);
  if (command === "delete") return print(deleteTicket(db, id, args), args.json, args.quiet);
  if (command === "activity") return print(listActivity(db, args), args.json, args.quiet);
  if (command === "approve") return print(approve(db, id, args.actor || "user", args), args.json, args.quiet);
  if (command === "comment") return print(commentTicket(db, id, args), args.json, args.quiet);
  if (command === "questions") return print(setOpenQuestions(db, id, args), args.json, args.quiet);
  if (command === "start") return print(start(db, id, args), args.json, args.quiet);
  if (command === "progress") return print(updateProgress(db, id, args), args.json, args.quiet);
  if (command === "progress-log") return print(progressLog(db, id, args), args.json, args.quiet ?? !args.json);
  if (command === "hold") return print(transition(db, id, "hold", "ticket.status_changed", args), args.json, args.quiet);
  if (command === "review") return print(transition(db, id, "in_review", "ticket.review_requested", args), args.json, args.quiet);
  if (command === "close") return print(transition(db, id, "closed", "ticket.closed", args), args.json, args.quiet);
  if (command === "cancel") return print(transition(db, id, "cancelled", "ticket.status_changed", args), args.json, args.quiet);
  if (command === "move") return print(moveTicket(db, id, args.status, args), args.json, args.quiet);
  if (command === "add-commit") return print(addCommit(db, id, args), args.json, args.quiet);
  if (command === "pr") return print(updatePr(db, id, args), args.json, args.quiet);
  if (command === "pipeline") return print(updatePipeline(db, id, args), args.json, args.quiet);
  if (command === "action-log") return print(actionLog(db, id, args), args.json, args.quiet ?? !args.json);
  if (command === "events") return print(ticketEvents(db, id), args.json, args.quiet);
  if (command === "seed") return print(seedTickets(db), args.json, args.quiet);
  usage(2);
}

try {
  main();
} catch (error) {
  if (error instanceof VibeKanbanError) {
    console.error(error.message);
    process.exit(error.code);
  }
  if (error && error.code === "ERR_SQLITE_ERROR" && /locked|busy/i.test(String(error.message))) {
    console.error(`database is busy (${error.message}); another process held the lock for more than 5s. Retry the command.`);
    process.exit(3);
  }
  throw error;
}
