import { formatStatus, formatType, progressFor, ticketCode } from "./format";
import type { TicketListItem } from "../types/kanban";

export interface TicketTreeNode {
  ticket: TicketListItem | null;
  code: string;
  title: string;
  type: TicketListItem["type"] | "project" | "orphan";
  typeLabel: string;
  status: TicketListItem["status"] | "project";
  statusLabel: string;
  reviewed: boolean;
  progress: number;
  children?: TicketTreeNode[];
}

export function sortTickets(tickets: TicketListItem[]) {
  const typeOrder: Record<string, number> = {
    group: 0,
    feature: 1,
    task: 2,
  };
  return [...tickets].sort((a, b) => {
    const byType = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    if (byType) return byType;
    return a.id - b.id;
  });
}

function ticketNode(
  ticket: TicketListItem,
  tickets: TicketListItem[],
): TicketTreeNode {
  const children = buildChildren(ticket.id, tickets);
  return {
    ticket,
    code: ticketCode(ticket),
    title: ticket.title,
    type: ticket.type,
    typeLabel: formatType(ticket.type),
    status: ticket.status,
    statusLabel: formatStatus(ticket.status),
    reviewed: ticket.user_reviewed,
    progress: progressFor(ticket),
    children: children.length ? children : undefined,
  };
}

export function buildChildren(
  parentId: number | null,
  tickets: TicketListItem[],
): TicketTreeNode[] {
  return sortTickets(
    tickets.filter((ticket) => ticket.parent_id === parentId),
  ).map((ticket) => ticketNode(ticket, tickets));
}

function collectIds(nodes: TicketTreeNode[], linkedIds = new Set<number>()) {
  for (const node of nodes) {
    if (node.ticket) linkedIds.add(node.ticket.id);
    collectIds(node.children || [], linkedIds);
  }
  return linkedIds;
}

export function projectTree(tickets: TicketListItem[]): TicketTreeNode {
  const roots = buildChildren(null, tickets);
  const linkedIds = collectIds(roots);
  const orphanTickets = tickets.filter((ticket) => !linkedIds.has(ticket.id));
  const orphanNodes: TicketTreeNode[] = orphanTickets.length
    ? [
        {
          ticket: null,
          code: "orphan",
          title: "Unlinked tickets",
          type: "orphan",
          typeLabel: "Unlinked",
          status: "project",
          statusLabel: "Needs parent",
          reviewed: false,
          progress: 0,
          children: sortTickets(orphanTickets).map((ticket) =>
            ticketNode(ticket, []),
          ),
        },
      ]
    : [];

  return {
    ticket: null,
    code: "project",
    title: "Vibe Kanban",
    type: "project",
    typeLabel: "Project",
    status: "project",
    statusLabel: `${tickets.length} tickets`,
    reviewed: false,
    progress: tickets.length
      ? Math.round(
          tickets.reduce((sum, ticket) => sum + progressFor(ticket), 0) /
            tickets.length,
        )
      : 0,
    children:
      roots.length || orphanNodes.length
        ? [...roots, ...orphanNodes]
        : undefined,
  };
}
