import { formatStatus, formatType } from "../lib/format";
import { badgeToneClass, panelClass, statusTone, ticketCodeClass, typeTone } from "../lib/styles";
import { projectTree, type TicketTreeNode } from "../lib/tree";
import type { TicketListItem } from "../types/kanban";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";

interface HierarchyPageProps {
  tickets: TicketListItem[];
  allTickets: TicketListItem[];
  onOpen: (id: number) => void;
}

function toneFor(node: TicketTreeNode) {
  if (node.type === "task") return "teal";
  if (node.type === "use_case") return "fuchsia";
  if (node.type === "uat_feedback") return "orange";
  if (node.type === "qc_feedback") return "amber";
  if (node.type === "orphan") return "amber";
  if (node.type === "project") return "violet";
  return "indigo";
}

function markerFor(node: TicketTreeNode) {
  if (node.type === "task") return "TK";
  if (node.type === "use_case") return "UC";
  if (node.type === "uat_feedback") return "UAT";
  if (node.type === "qc_feedback") return "QC";
  if (node.type === "US") return "US";
  if (node.type === "orphan") return "OR";
  return "PR";
}

function visibleWithAncestors(allTickets: TicketListItem[], visibleTickets: TicketListItem[]) {
  const byId = new Map(allTickets.map((ticket) => [ticket.id, ticket]));
  const included = new Set<number>();
  for (const ticket of visibleTickets) {
    let current: TicketListItem | undefined = ticket;
    while (current && !included.has(current.id)) {
      included.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
  }
  return allTickets.filter((ticket) => included.has(ticket.id));
}

function renderTreeNode(node: TicketTreeNode, depth: number, visibleIds: Set<number>, onOpen: (id: number) => void) {
  const hasTicket = Boolean(node.ticket);
  const status = hasTicket ? node.ticket?.status : null;
  const type = hasTicket ? node.ticket?.type : null;
  const isMatch = !node.ticket || visibleIds.has(node.ticket.id);
  const children = node.children || [];
  const tone = toneFor(node);
  const row = (
    <div className={`group grid min-h-11 grid-cols-[minmax(0,1fr)_auto_minmax(92px,132px)] items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-neutral-200 hover:bg-white hover:shadow-sm max-lg:grid-cols-1 max-lg:items-start ${isMatch ? "" : "opacity-55"}`}>
      <button className="flex min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left disabled:cursor-default" type="button" disabled={!hasTicket} onClick={() => node.ticket && onOpen(node.ticket.id)}>
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg border text-[10px] font-extrabold ${badgeToneClass(tone)}`}>{markerFor(node)}</span>
        <span className={`${ticketCodeClass} min-w-[74px] shrink-0`}>{node.code}</span>
        <span className="min-w-0 truncate text-sm font-semibold leading-5 text-neutral-800 group-hover:text-neutral-950">{node.title}</span>
      </button>
      <div className="flex flex-wrap gap-1 max-lg:pl-9">
        {type ? <Badge tone={typeTone[type]}>{formatType(type)}</Badge> : <Badge tone={tone}>{node.typeLabel}</Badge>}
        {status ? <Badge tone={statusTone[status]}>{formatStatus(status)}</Badge> : <Badge tone="violet">{node.statusLabel}</Badge>}
        {hasTicket ? <Badge tone={node.reviewed ? "emerald" : "orange"}>{node.reviewed ? "Approved" : "Needs review"}</Badge> : null}
      </div>
      <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2 max-lg:w-full max-lg:pl-9">
        <span className="text-right text-xs font-bold text-neutral-500">{node.progress}%</span>
        <ProgressBar percent={node.progress} tone={status && statusTone[status] ? statusTone[status] : "violet"} />
      </div>
    </div>
  );

  return (
    <li className="relative" key={`${node.code}-${depth}`}>
      {children.length ? (
        <details className="group/tree" open>
          <summary className="grid cursor-pointer list-none grid-cols-[18px_minmax(0,1fr)] items-center gap-1 rounded-xl marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="text-center text-xs font-black text-neutral-400 transition group-open/tree:rotate-90">+</span>
            {row}
          </summary>
          <ol className="ml-[27px] mt-1 grid list-none gap-1 border-l border-neutral-200 pl-3">
            {children.map((child) => renderTreeNode(child, depth + 1, visibleIds, onOpen))}
          </ol>
        </details>
      ) : (
        <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-1">
          <span className="text-center text-xs font-black text-neutral-300">-</span>
          {row}
        </div>
      )}
    </li>
  );
}

export function HierarchyPage({ tickets, allTickets, onOpen }: HierarchyPageProps) {
  const visibleIds = new Set(tickets.map((ticket) => ticket.id));
  const tree = projectTree(visibleWithAncestors(allTickets, tickets));
  const topLevel = tree.children || [];

  return (
    <section className={`${panelClass} mb-4 overflow-hidden p-0`}>
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <div>
          <h2 className="m-0 text-base font-bold text-neutral-950">Ticket folder tree</h2>
          <p className="m-0 text-xs leading-5 text-neutral-500">US folders, use case folders, and task leaves from the current filters.</p>
        </div>
        <strong className="shrink-0 text-xs font-extrabold uppercase text-violet-700">{tickets.length} shown</strong>
      </header>
      {topLevel.length ? <ol className="m-0 grid list-none gap-1 bg-neutral-50/70 p-3">{topLevel.map((node) => renderTreeNode(node, 0, visibleIds, onOpen))}</ol> : <p className="m-0 p-4 text-sm text-neutral-500">No tickets match the current filters.</p>}
    </section>
  );
}
