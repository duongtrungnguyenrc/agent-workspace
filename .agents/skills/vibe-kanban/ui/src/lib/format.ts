import type { TicketListItem, TicketStatus, TicketType } from "../types/kanban";

export function formatType(type: TicketType | string): string {
  if (type === "US") return "US";
  if (type === "use_case") return "Use Case";
  if (type === "uat_feedback") return "UAT Feedback";
  if (type === "qc_feedback") return "QC Feedback";
  return String(type || "US").replaceAll("_", " ");
}

export function formatStatus(status: TicketStatus | string): string {
  return String(status || "").replace("_", " ");
}

export function ticketCode(ticket: Pick<TicketListItem, "id" | "type">): string {
  return `${ticket.type || "US"}-${ticket.id}`;
}

export function progressFor(ticket: Pick<TicketListItem, "progress_percent" | "status" | "user_reviewed">): number {
  if (Number.isInteger(ticket.progress_percent)) return ticket.progress_percent ?? 0;
  if (ticket.status === "closed") return 100;
  if (ticket.status === "cancelled") return 0;
  if (ticket.status === "in_review") return 75;
  if (ticket.status === "in_progress") return 50;
  if (ticket.status === "hold") return 30;
  return ticket.user_reviewed ? 25 : 10;
}

export function parentLabel(ticket: TicketListItem, allTickets: TicketListItem[]): string {
  if (!ticket.parent_id) return "Top level";
  const parent = allTickets.find((candidate) => candidate.id === ticket.parent_id);
  return parent ? `${ticketCode(parent)} ${parent.title}` : `Parent ${ticket.parent_id}`;
}
