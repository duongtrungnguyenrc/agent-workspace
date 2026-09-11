import { formatKind, formatStatus } from "./format";

const labels: Record<string, string> = {
  "ticket.created": "Ticket created",
  "ticket.deleted": "Ticket deleted",
  "ticket.updated": "Ticket updated",
  "ticket.spec_updated": "Specification updated",
  "ticket.plan_created": "Execution plan created",
  "ticket.plan_updated": "Execution plan updated",
  "ticket.approval_invalidated": "Approval invalidated",
  "ticket.approved": "Plan approved",
  "ticket.implementation_started": "Implementation started",
  "ticket.progress_updated": "Progress updated",
  "ticket.progress_logged": "Progress logged",
  "ticket.status_changed": "Status changed",
  "ticket.commit_added": "Commit added",
  "ticket.pr_updated": "PR updated",
  "ticket.pipeline_updated": "Pipeline updated",
  "ticket.action_logged": "Action logged",
  "ticket.user_commented": "User commented",
  "ticket.questions_opened": "Questions opened",
  "ticket.review_requested": "Review requested",
  "ticket.local_review_requested": "Local review requested",
  "ticket.local_review_changes_requested": "Local review: changes requested",
  "ticket.local_review_confirmed": "Local review confirmed",
  "ticket.local_review_skipped": "Local review skipped",
  "ticket.closed": "Ticket closed",
};

export function eventLabel(type: string): string {
  if (labels[type]) return labels[type];
  const plain = type.replace(/^ticket\./, "").replaceAll("_", " ").replaceAll(".", " ");
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

export function eventTone(type: string): string {
  if (type === "ticket.deleted" || type === "ticket.approval_invalidated") return "rose";
  if (type === "ticket.created" || type === "ticket.approved" || type === "ticket.closed" || type === "ticket.local_review_confirmed") return "emerald";
  if (type === "ticket.local_review_requested" || type === "ticket.local_review_changes_requested" || type === "ticket.local_review_skipped") return "orange";
  if (type === "ticket.questions_opened" || type === "ticket.user_commented") return "amber";
  if (type === "ticket.review_requested" || type === "ticket.pr_updated" || type === "ticket.pipeline_updated") return "orange";
  if (type === "ticket.status_changed" || type === "ticket.implementation_started") return "sky";
  return "violet";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function eventSummary(type: string, payload: Record<string, unknown>): string {
  const parts: string[] = [];
  const from = text(payload.from);
  const to = text(payload.to);
  if (from && to) parts.push(`${formatStatus(from)} -> ${formatStatus(to)}`);
  if (type === "ticket.created") {
    const kind = text(payload.kind);
    if (kind) {
      const detected = payload.kind_source === "detected" ? ` (detected, ${text(payload.kind_confidence) || "unknown"} confidence)` : "";
      parts.push(`Kind: ${formatKind(kind)}${detected}`);
    }
    if (typeof payload.parent_id === "number") parts.push(`Parent: VK-${payload.parent_id}`);
  }
  if (type === "ticket.deleted") {
    const title = text(payload.title);
    if (title) parts.push(`Removed ${text(payload.type) || "ticket"} "${title}"`);
    if (typeof payload.children_deleted === "number" && payload.children_deleted > 0) {
      parts.push(`${payload.children_deleted} child ticket(s) removed`);
    }
  }
  if (Array.isArray(payload.fields) && payload.fields.length) parts.push(`Fields: ${payload.fields.join(", ")}`);
  const reason = text(payload.reason);
  if (reason) parts.push(`Reason: ${reason.replaceAll("_", " ")}`);
  if (typeof payload.approved_revision_id === "number") parts.push(`Plan revision #${payload.approved_revision_id}`);
  const step = text(payload.step);
  if (step) parts.push(`Step: ${step}`);
  const stepStatus = text(payload.step_status);
  if (stepStatus) parts.push(`Step status: ${stepStatus.replaceAll("_", " ")}`);
  if (typeof payload.percent === "number") parts.push(`Progress: ${payload.percent}%`);
  const note = text(payload.note);
  if (note) parts.push(`Note: ${note}`);
  const commit = text(payload.commit_hash);
  if (commit) parts.push(`Commit ${commit.slice(0, 12)}`);
  const prStatus = text(payload.pr_status);
  if (prStatus) parts.push(`PR ${prStatus}`);
  const prUrl = text(payload.pr_url);
  if (prUrl) parts.push(prUrl);
  const pipelineStatus = text(payload.pipeline_status);
  if (pipelineStatus) parts.push(`Pipeline ${pipelineStatus}`);
  const pipelineUrl = text(payload.pipeline_url);
  if (pipelineUrl) parts.push(pipelineUrl);
  if (type === "ticket.action_logged") {
    const action = [text(payload.action_type), text(payload.status)].filter(Boolean).join(" ");
    if (action) parts.push(action);
  }
  const url = text(payload.url);
  if (url) parts.push(url);
  const comment = text(payload.comment);
  if (comment) parts.push(`Comment: ${comment}`);
  const questions = text(payload.questions);
  if (questions) parts.push(`Questions: ${questions}`);
  const description = text(payload.description);
  if (description) parts.push(description);
  return parts.join(" · ");
}
