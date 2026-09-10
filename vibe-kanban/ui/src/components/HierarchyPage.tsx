import { ChevronRightIcon, FolderTreeIcon } from "lucide-react";
import { formatKind, formatStatus, formatType } from "../lib/format";
import { kindTone, statusTone, ticketCodeClass, tone, typeTone } from "../lib/styles";
import { projectTree, type TicketTreeNode } from "../lib/tree";
import type { TicketListItem } from "../types/kanban";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";

interface HierarchyPageProps {
  tickets: TicketListItem[];
  allTickets: TicketListItem[];
  onOpen: (id: number) => void;
}

function toneFor(node: TicketTreeNode) {
  if (node.type === "task") return "teal";
  if (node.type === "feature") return "fuchsia";
  if (node.type === "orphan") return "amber";
  if (node.type === "project") return "violet";
  return "indigo";
}

function markerFor(node: TicketTreeNode) {
  if (node.type === "task") return "TK";
  if (node.type === "feature") return "FT";
  if (node.type === "group") return "GR";
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

function TreeRow({ node, isMatch, onOpen }: { node: TicketTreeNode; isMatch: boolean; onOpen: (id: number) => void }) {
  const ticket = node.ticket;
  const status = ticket?.status ?? null;
  const type = ticket?.type ?? null;
  const kind = ticket?.kind ?? null;
  const name = toneFor(node);
  return (
    <div
      className={cn(
        "group grid min-h-10 grid-cols-[minmax(0,1fr)_auto_minmax(96px,140px)] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent max-lg:grid-cols-1 max-lg:items-start",
        !isMatch && "opacity-50",
      )}
    >
      <button
        className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
        type="button"
        disabled={!ticket}
        onClick={() => ticket && onOpen(ticket.id)}
      >
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border text-[10px] font-bold", tone(name).badge)}>
          {markerFor(node)}
        </span>
        <span className={cn(ticketCodeClass, "min-w-[68px] shrink-0")}>{node.code}</span>
        <span className="min-w-0 truncate text-sm font-medium text-foreground/90 group-hover:text-foreground">{node.title}</span>
      </button>
      <div className="flex flex-wrap gap-1 max-lg:pl-8">
        {type ? <Badge tone={typeTone[type]}>{formatType(type)}</Badge> : <Badge tone={name}>{node.typeLabel}</Badge>}
        {kind ? <Badge tone={kindTone[kind]}>{formatKind(kind)}</Badge> : null}
        {status ? (
          <Badge tone={statusTone[status]} className="capitalize">
            {formatStatus(status)}
          </Badge>
        ) : (
          <Badge tone="neutral">{node.statusLabel}</Badge>
        )}
        {ticket ? <Badge tone={node.reviewed ? "emerald" : "orange"}>{node.reviewed ? "Approved" : "Needs review"}</Badge> : null}
      </div>
      <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2 max-lg:w-full max-lg:pl-8">
        <span className="text-right text-xs text-muted-foreground tabular-nums">{node.progress}%</span>
        <ProgressBar percent={node.progress} tone={status ? statusTone[status] : "violet"} className="h-1.5" />
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  visibleIds,
  onOpen,
}: {
  node: TicketTreeNode;
  depth: number;
  visibleIds: Set<number>;
  onOpen: (id: number) => void;
}) {
  const children = node.children || [];
  const isMatch = !node.ticket || visibleIds.has(node.ticket.id);
  const row = <TreeRow node={node} isMatch={isMatch} onOpen={onOpen} />;

  return (
    <li className="relative">
      {children.length ? (
        <details className="group/tree" open>
          <summary className="grid cursor-pointer list-none grid-cols-[18px_minmax(0,1fr)] items-center gap-1 rounded-lg [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-open/tree:rotate-90" />
            {row}
          </summary>
          <ol className="mt-0.5 ml-[26px] grid list-none gap-0.5 border-l pl-2">
            {children.map((child, index) => (
              <TreeNode node={child} depth={depth + 1} visibleIds={visibleIds} onOpen={onOpen} key={`${child.code}-${index}`} />
            ))}
          </ol>
        </details>
      ) : (
        <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-1">
          <span className="text-center text-xs text-muted-foreground/60">·</span>
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
    <Card className="mb-4 gap-0 overflow-hidden p-0">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FolderTreeIcon className="size-4 text-primary" />
          <h2 className="m-0 text-sm font-semibold">Ticket tree</h2>
          <span className="text-xs text-muted-foreground">group → feature → task</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{tickets.length} shown</span>
      </header>
      {topLevel.length ? (
        <ol className="m-0 grid list-none gap-0.5 p-2">
          {topLevel.map((node, index) => (
            <TreeNode node={node} depth={0} visibleIds={visibleIds} onOpen={onOpen} key={`${node.code}-${index}`} />
          ))}
        </ol>
      ) : (
        <p className="m-0 p-6 text-center text-sm text-muted-foreground">No tickets match the current filters.</p>
      )}
    </Card>
  );
}
