import type {
  TicketKind,
  TicketListItem,
  TicketStatus,
  TicketType,
} from "../types/kanban";

export function formatType(type: TicketType | string): string {
  if (type === "group") return "Group";
  if (type === "feature") return "Feature";
  if (type === "task") return "Task";
  return String(type || "group").replaceAll("_", " ");
}

export function formatKind(
  kind: TicketKind | string | null | undefined,
): string {
  if (kind === "bugfix") return "Bug fix";
  if (kind === "feature") return "Feature";
  if (kind === "refactor") return "Refactor";
  if (kind === "chore") return "Chore";
  if (kind === "docs") return "Docs";
  if (kind === "test") return "Test";
  return kind ? String(kind) : "No kind";
}

export function formatStatus(status: TicketStatus | string): string {
  return String(status || "").replace("_", " ");
}

export function formatLocalReview(state: string | null | undefined): string {
  if (state === "requested") return "Local review requested";
  if (state === "changes_requested") return "Changes requested";
  if (state === "confirmed") return "Local review confirmed";
  if (state === "skipped") return "Local review skipped";
  return "Local review pending";
}

export function ticketCode(
  ticket: Pick<TicketListItem, "id" | "type">,
): string {
  return `VK-${ticket.id}`;
}

export function progressFor(
  ticket: Pick<TicketListItem, "progress_percent" | "status" | "user_reviewed">,
): number {
  if (Number.isInteger(ticket.progress_percent))
    return ticket.progress_percent ?? 0;
  if (ticket.status === "closed") return 100;
  if (ticket.status === "cancelled") return 0;
  if (ticket.status === "in_review") return 75;
  if (ticket.status === "in_progress") return 50;
  if (ticket.status === "hold") return 30;
  return ticket.user_reviewed ? 25 : 10;
}

export function hasChecklistSteps(plan: string | null | undefined): boolean {
  return /^-\s*\[[ xX]\]\s+\S/m.test(String(plan || ""));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function parentLabel(
  ticket: TicketListItem,
  allTickets: TicketListItem[],
): string {
  if (!ticket.parent_id) return "Top level";
  const parent = allTickets.find(
    (candidate) => candidate.id === ticket.parent_id,
  );
  return parent
    ? `${ticketCode(parent)} ${parent.title}`
    : `Parent ${ticket.parent_id}`;
}
