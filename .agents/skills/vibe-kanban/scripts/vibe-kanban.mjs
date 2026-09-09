#!/usr/bin/env node
import { existsSync, readFileSync, mkdirSync, watchFile, unwatchFile } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { Server as SocketServer } from "socket.io";

const STATUSES = ["open", "in_progress", "hold", "cancelled", "in_review", "closed"];
const TICKET_TYPES = ["US", "use_case", "task", "uat_feedback", "qc_feedback"];

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
  smart-search <query> [--json] [--type <type>] [--status <status>] [--parent-for <type>] [--limit <n>]
  get <ticket-id> [--json]
  create --title <title> [--raw-requirement <text|@file>] [--specification <text|@file>] [--execution-plan <text|@file>]
  update <ticket-id> [--title <title>] [--type <US|use_case|task|uat_feedback|qc_feedback>] [--parent-id <id>] [--specification <text|@file>] [--execution-plan <text|@file>]
  approve <ticket-id> [--actor <name>] [--description <text|@file>] [--quiet]
  comment <ticket-id> --comment <text|@file> [--actor <name>] [--quiet]
  questions <ticket-id> --questions <text|@file> [--description <text|@file>] [--quiet]
  start <ticket-id> [--description <text|@file>] [--quiet]
  progress <ticket-id> --percent <0-100> [--note <text|@file>] [--description <text|@file>] [--quiet]
  progress-log <ticket-id> --description <text|@file> [--step <name>] [--percent <0-100>] [--quiet]
  hold <ticket-id> [--description <text|@file>] [--quiet]
  review <ticket-id> [--description <text|@file>] [--quiet]
  close <ticket-id> [--description <text|@file>] [--quiet]
  cancel <ticket-id> [--description <text|@file>] [--quiet]
  move <ticket-id> --status <open|in_progress|hold|cancelled|in_review|closed> [--description <text|@file>] [--quiet]
  add-commit <ticket-id> --commit-hash <hash> [--parent-hash <hash>] [--branch <branch>] [--message <message>] [--author <author>]
  pr <ticket-id> [--pr-url <url>] [--pr-number <number>] [--pr-status <status>] [--description <text|@file>] [--quiet]
  pipeline <ticket-id> [--pipeline-status <status>] [--pipeline-url <url>] [--description <text|@file>] [--quiet]
  action-log <ticket-id> --description <text|@file> [--action-type <type>] [--status <status>] [--url <url>] [--quiet]
  events <ticket-id> [--json]
  seed [--json]
  serve [--host 127.0.0.1] [--port 8765]

Options:
  --type <US|use_case|task|uat_feedback|qc_feedback>
  --status <open|in_progress|hold|cancelled|in_review|closed>
  --parent-id <id>
  --source-type <type>
  --source-id <id>
  --source-url <url>
  --source-snapshot <text|@file>
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
  --parent-for <US|use_case|task|uat_feedback|qc_feedback>

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
    if (key === "json" || key === "help" || key === "quiet") {
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
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'US',
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
      created_at TEXT NOT NULL
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
  ensureColumn(db, "tickets", "type", "TEXT NOT NULL DEFAULT 'US'");
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
  return db;
}

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function normalizeType(type) {
  const value = type || "US";
  if (!TICKET_TYPES.includes(value)) {
    fail(`invalid ticket type: ${value}. Expected one of: ${TICKET_TYPES.join(", ")}`);
  }
  return value;
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
    if (type === "use_case") fail("use_case tickets must have a US parent");
    return null;
  }
  if (ownId && Number(parentId) === Number(ownId)) fail("ticket cannot be its own parent");
  const parent = db.prepare("SELECT id, type FROM tickets WHERE id = ?").get(parentId);
  if (!parent) fail(`parent ticket not found: ${parentId}`);
  if (type === "US") fail("US tickets must not have a parent");
  if (type === "use_case" && parent.type !== "US") fail("use_case tickets must be linked under a US ticket");
  if (type === "task" && !["US", "use_case", "uat_feedback", "qc_feedback"].includes(parent.type)) {
    fail("task tickets may be top-level or linked under US, use_case, uat_feedback, or qc_feedback tickets");
  }
  if ((type === "uat_feedback" || type === "qc_feedback") && parent.type !== "US") {
    fail(`${type} tickets may be top-level or linked under a US ticket`);
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
  };
}

function boolRow(row) {
  if (!row) return row;
  return {
    ...row,
    user_reviewed: Boolean(row.user_reviewed),
    raw_requirement: row.raw_requirement || "",
    specification: row.specification || "",
    execution_plan: row.execution_plan || "",
    source_snapshot: row.source_snapshot || "",
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

function requireTicket(db, id) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(Number(id));
  if (!ticket) fail(`ticket not found: ${id}`);
  const full = boolRow(ticket);
  full.parent = full.parent_id
    ? boolRow(db.prepare("SELECT id, parent_id, title, type, status, user_reviewed FROM tickets WHERE id = ?").get(full.parent_id))
    : null;
  full.children = db.prepare("SELECT id, parent_id, title, type, status, user_reviewed FROM tickets WHERE parent_id = ? ORDER BY type, id").all(full.id).map(boolRow);
  full.revisions = db.prepare("SELECT * FROM ticket_revisions WHERE ticket_id = ? ORDER BY id").all(full.id);
  full.commits = db.prepare("SELECT * FROM ticket_commits WHERE ticket_id = ? ORDER BY id").all(full.id);
  full.events = db.prepare("SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY id").all(full.id)
    .map((event) => ({ ...event, payload: JSON.parse(event.payload || "{}") }));
  return full;
}

function listTickets(db) {
  return db.prepare("SELECT * FROM tickets ORDER BY updated_at DESC, id DESC").all().map(boolRow);
}

function normalizeLimit(value, fallback = 10) {
  if (value === undefined || value === null || value === "") return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) fail(`invalid limit: ${value}`);
  return Math.min(limit, 50);
}

function parentTypesFor(type) {
  const ticketType = normalizeType(type);
  if (ticketType === "US") return [];
  if (ticketType === "use_case") return ["US"];
  if (ticketType === "task") return ["US", "use_case", "uat_feedback", "qc_feedback"];
  if (ticketType === "uat_feedback" || ticketType === "qc_feedback") return ["US"];
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

function fieldScore(value, tokens, exactQuery, weight) {
  const text = String(value || "").toLowerCase();
  if (!text) return { score: 0, matched: false };
  let score = exactQuery && text.includes(exactQuery) ? weight * 4 : 0;
  let matched = score > 0;
  for (const token of tokens) {
    if (text.includes(token)) {
      score += weight;
      matched = true;
    }
  }
  return { score, matched };
}

function summarizeTicket(row) {
  if (!row) return null;
  return boolRow({
    id: row.id,
    parent_id: row.parent_id,
    title: row.title,
    type: row.type,
    status: row.status,
    user_reviewed: row.user_reviewed,
    source_type: row.source_type,
    source_id: row.source_id,
    source_url: row.source_url,
    updated_at: row.updated_at,
  });
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

  const rows = listTickets(db);
  const filtered = rows.filter((ticket) => {
    if (args.type && ticket.type !== normalizeType(args.type)) return false;
    if (args.status && ticket.status !== args.status) return false;
    if (allowedParentTypes && !allowedParentTypes.includes(ticket.type)) return false;
    return true;
  });

  const scored = filtered.map((ticket) => {
    const fields = [
      ["title", ticket.title, 8],
      ["source_id", ticket.source_id, 7],
      ["source_url", ticket.source_url, 4],
      ["source_type", ticket.source_type, 3],
      ["specification", ticket.specification, 3],
      ["raw_requirement", ticket.raw_requirement, 3],
      ["source_snapshot", ticket.source_snapshot, 3],
      ["open_questions", ticket.open_questions, 3],
      ["user_comments", ticket.user_comments, 2],
      ["execution_plan", ticket.execution_plan, 2],
      ["action_items", ticket.action_items, 1],
      ["branch", ticket.branch, 1],
    ];
    let score = 0;
    const matched_fields = [];
    for (const [name, value, weight] of fields) {
      const result = fieldScore(value, tokens, exactQuery, weight);
      score += result.score;
      if (result.matched) matched_fields.push(name);
    }
    if (String(ticket.id) === query) {
      score += 100;
      matched_fields.push("id");
    }
    return { ticket, score, matched_fields };
  })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.ticket.updated_at) - new Date(a.ticket.updated_at) || b.ticket.id - a.ticket.id)
    .slice(0, limit);

  return scored.map(({ ticket, score, matched_fields }) => {
    const parent = ticket.parent_id
      ? db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket.parent_id)
      : null;
    const children = db.prepare("SELECT id, parent_id, title, type, status, user_reviewed, source_type, source_id, source_url, updated_at FROM tickets WHERE parent_id = ? ORDER BY type, id")
      .all(ticket.id);
    return {
      score,
      matched_fields,
      ticket: summarizeTicket(ticket),
      parent: summarizeTicket(parent),
      children: children.map(summarizeTicket),
    };
  });
}

function createTicket(db, args) {
  if (!args.title) fail("create requires --title");
  const stamp = now();
  const git = currentGit();
  const result = db.prepare(`
    INSERT INTO tickets (
      parent_id, title, raw_requirement, specification, execution_plan, source_type,
      source_id, source_url, source_snapshot, branch, base_commit, type,
      head_commit, pr_url, pr_number, pr_status, pipeline_status, pipeline_url,
      action_items, user_comments, open_questions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    validateParent(db, normalizeParentId(args.parent_id), normalizeType(args.type)),
    args.title,
    readValue(args.raw_requirement),
    readValue(args.specification),
    readValue(args.execution_plan),
    args.source_type || null,
    args.source_id || null,
    args.source_url || null,
    readValue(args.source_snapshot),
    args.branch || git.branch,
    args.base_commit || git.head_commit,
    normalizeType(args.type),
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
  if (args.specification) revision(db, ticketId, "specification", readValue(args.specification));
  if (args.execution_plan) revision(db, ticketId, "execution_plan", readValue(args.execution_plan));
  recordEvent(db, ticketId, "ticket.created", { title: args.title });
  return requireTicket(db, ticketId);
}

function updateTicket(db, id, args) {
  const ticket = requireTicket(db, id);
  const fields = {};
  for (const key of ["title", "raw_requirement", "source_type", "source_id", "source_url", "source_snapshot", "branch", "base_commit", "head_commit", "pr_url", "pr_number", "pr_status", "pipeline_status", "pipeline_url", "action_items", "user_comments", "open_questions"]) {
    if (args[key] !== undefined) fields[key] = key.endsWith("snapshot") || ["raw_requirement", "action_items", "user_comments", "open_questions"].includes(key) ? readValue(args[key]) : args[key];
  }
  if (args.progress_percent !== undefined) fields.progress_percent = normalizeProgress(args.progress_percent);
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
  const percent = normalizeProgress(args.percent ?? args.progress_percent);
  const fields = { updated_at: now() };
  if (percent !== null) fields.progress_percent = percent;
  const names = Object.keys(fields);
  db.prepare(`UPDATE tickets SET ${names.map((name) => `${name} = ?`).join(", ")} WHERE id = ?`)
    .run(...names.map((name) => fields[name]), Number(id));
  recordEvent(db, Number(id), "ticket.progress_logged", {
    description,
    step: args.step || "",
    percent,
  });
  return requireTicket(db, id);
}

function addCommit(db, id, args) {
  if (!args.commit_hash) fail("add-commit requires --commit-hash");
  db.prepare(`
    INSERT INTO ticket_commits(ticket_id, commit_hash, parent_hash, branch, message, author, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(Number(id), args.commit_hash, args.parent_hash || null, args.branch || currentGit().branch, args.message || null, args.author || null, now());
  db.prepare("UPDATE tickets SET head_commit = ?, updated_at = ? WHERE id = ?").run(args.commit_hash, now(), Number(id));
  recordEvent(db, Number(id), "ticket.commit_added", { commit_hash: args.commit_hash });
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

function listActivity(db, limit = 200) {
  return db.prepare(`
    SELECT
      ticket_events.id,
      ticket_events.ticket_id,
      ticket_events.type,
      ticket_events.actor,
      ticket_events.payload,
      ticket_events.created_at,
      tickets.title AS ticket_title,
      tickets.type AS ticket_type,
      tickets.status AS ticket_status
    FROM ticket_events
    LEFT JOIN tickets ON tickets.id = ticket_events.ticket_id
    ORDER BY ticket_events.id DESC
    LIMIT ?
  `).all(Number(limit)).map((event) => ({ ...event, payload: JSON.parse(event.payload || "{}") }));
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
      type: "US",
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
      type: "use_case",
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
  const story = db.prepare("SELECT id FROM tickets WHERE source_type = 'sample' AND type = 'US' ORDER BY id LIMIT 1").get();
  const useCase = db.prepare("SELECT id FROM tickets WHERE source_type = 'sample' AND type = 'use_case' ORDER BY id LIMIT 1").get();
  const task = db.prepare("SELECT id FROM tickets WHERE source_type = 'sample' AND type = 'task' ORDER BY id LIMIT 1").get();
  if (story && useCase) {
    db.prepare("UPDATE tickets SET parent_id = ? WHERE id = ?").run(story.id, useCase.id);
  }
  if (useCase && task) {
    db.prepare("UPDATE tickets SET parent_id = ? WHERE id = ?").run(useCase.id, task.id);
  }
}

function print(value, jsonOutput, quiet = false) {
  if (quiet) return;
  if (jsonOutput) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const ticket = item.ticket || item;
      const prefix = item.ticket ? `score=${item.score} ` : "";
      const matched = item.matched_fields?.length ? ` matched=${item.matched_fields.join(",")}` : "";
      const parent = item.parent ? ` parent=#${item.parent.id}` : "";
      console.log(`${prefix}#${ticket.id} [${ticket.type || "US"}:${ticket.status}] ${ticket.title} reviewed=${ticket.user_reviewed}${parent}${matched}`);
    }
    return;
  }
  console.log(`#${value.id} [${value.type || "US"}:${value.status}] ${value.title}`);
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
      return send(res, 200, { statuses: STATUSES, types: TICKET_TYPES, tickets: listTickets(db) }, { "content-type": "application/json" });
    }
    if (req.method === "GET" && url.pathname === "/api/activity") {
      const limit = Number(url.searchParams.get("limit") || 200);
      return send(res, 200, { events: listActivity(db, limit) }, { "content-type": "application/json" });
    }
    if (req.method === "POST" && url.pathname === "/api/tickets") {
      const body = await readBody(req);
      const result = createTicket(db, body);
      notify(result);
      return send(res, 201, result, { "content-type": "application/json" });
    }
    const match = url.pathname.match(/^\/api\/tickets\/(\d+)(?:\/([a-z-]+))?$/);
    if (!match) return send(res, 404, { error: "not found" }, { "content-type": "application/json" });
    const id = Number(match[1]);
    const action = match[2];
    if (req.method === "GET" && !action) {
      return send(res, 200, requireTicket(db, id), { "content-type": "application/json" });
    }
    if (req.method !== "POST") {
      return send(res, 405, { error: "method not allowed" }, { "content-type": "application/json" });
    }
    const body = await readBody(req);
    let result;
    if (action === "approve") result = approve(db, id, body.actor || "user", body);
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
    notify(result);
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
  let lastApiEmitAt = 0;
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://local");
    if (url.pathname.startsWith("/api/")) return handleApi(req, res, db, (ticket) => {
      lastApiEmitAt = Date.now();
      io.emit("tickets:changed", { ticket_id: ticket.id, status: ticket.status, updated_at: ticket.updated_at });
    });
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
          "React UI is not built. Run `pnpm install && pnpm --filter vibe-kanban run build` from the workspace root.",
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
  });
  const io = new SocketServer(server, {
    cors: { origin: "*" },
  });
  io.on("connection", (socket) => {
    socket.emit("tickets:ready", { connected: true });
  });
  watchFile(databasePath, { interval: 500 }, (current, previous) => {
    if (current.mtimeMs === previous.mtimeMs) return;
    if (Date.now() - lastApiEmitAt < 700) return;
    io.emit("tickets:changed", { source: "sqlite", updated_at: now() });
  });
  server.on("close", () => {
    unwatchFile(databasePath);
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
  if (command === "get") return print(requireTicket(db, id), args.json, args.quiet);
  if (command === "create") return print(createTicket(db, args), args.json, args.quiet);
  if (command === "update") return print(updateTicket(db, id, args), args.json, args.quiet);
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
  throw error;
}
