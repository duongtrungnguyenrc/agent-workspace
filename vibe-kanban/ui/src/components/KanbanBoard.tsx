import { useEffect, useRef, useState } from "react";
import { InboxIcon } from "lucide-react";
import { formatKind, formatStatus, formatType, parentLabel } from "../lib/format";
import { kindTone, statusTone, tone, typeTone } from "../lib/styles";
import type { GroupBy, TicketKind, TicketListItem, TicketStatus, TicketType } from "../types/kanban";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TicketCard } from "./TicketCard";

interface KanbanBoardProps {
  tickets: TicketListItem[];
  allTickets: TicketListItem[];
  statuses: TicketStatus[];
  types: TicketType[];
  kinds: TicketKind[];
  groupBy: GroupBy;
  onOpen: (id: number) => void;
  onMove: (id: number, status: TicketStatus) => void;
  onAction: (id: number, action: string) => Promise<void>;
}

interface Group {
  key: string;
  label: string;
  tone: string;
  status?: TicketStatus;
  tickets: TicketListItem[];
}

const TICKETS_PER_BATCH = 20;

function groupsFor(props: KanbanBoardProps): Group[] {
  if (props.groupBy === "type") {
    return props.types.map((type) => ({
      key: type,
      label: formatType(type),
      tone: typeTone[type],
      tickets: props.tickets.filter((ticket) => ticket.type === type),
    }));
  }
  if (props.groupBy === "kind") {
    return [
      ...props.kinds.map((kind) => ({
        key: kind,
        label: formatKind(kind),
        tone: kindTone[kind],
        tickets: props.tickets.filter((ticket) => ticket.kind === kind),
      })),
      { key: "no-kind", label: "No kind", tone: "neutral", tickets: props.tickets.filter((ticket) => !ticket.kind) },
    ];
  }
  if (props.groupBy === "review") {
    return [
      { key: "pending", label: "Needs review", tone: "orange", tickets: props.tickets.filter((ticket) => !ticket.user_reviewed) },
      { key: "approved", label: "Approved", tone: "emerald", tickets: props.tickets.filter((ticket) => ticket.user_reviewed) },
    ];
  }
  if (props.groupBy === "branch") {
    const branches = [...new Set(props.tickets.map((ticket) => ticket.branch || "No branch"))].sort();
    return branches.map((branch) => ({
      key: branch,
      label: branch,
      tone: "neutral",
      tickets: props.tickets.filter((ticket) => (ticket.branch || "No branch") === branch),
    }));
  }
  if (props.groupBy === "parent") {
    const parentLabels = [...new Set(props.tickets.map((ticket) => parentLabel(ticket, props.allTickets)))].sort();
    return parentLabels.map((label) => ({
      key: label,
      label,
      tone: "neutral",
      tickets: props.tickets.filter((ticket) => parentLabel(ticket, props.allTickets) === label),
    }));
  }
  return props.statuses.map((status) => ({
    key: status,
    label: formatStatus(status),
    tone: statusTone[status],
    status,
    tickets: props.tickets.filter((ticket) => ticket.status === status),
  }));
}

export function KanbanBoard(props: KanbanBoardProps) {
  const groups = groupsFor(props);
  const isStatusBoard = props.groupBy === "status";
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  useEffect(() => {
    const clearTarget = () => setDragTarget(null);
    window.addEventListener("dragend", clearTarget);
    window.addEventListener("drop", clearTarget);
    return () => {
      window.removeEventListener("dragend", clearTarget);
      window.removeEventListener("drop", clearTarget);
    };
  }, []);

  return (
    <section className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
      {groups.map((group) => (
        <KanbanGroup
          group={group}
          isStatusBoard={isStatusBoard}
          isDragTarget={dragTarget === group.key}
          allTickets={props.allTickets}
          onOpen={props.onOpen}
          onAction={props.onAction}
          onMove={props.onMove}
          onDragTarget={setDragTarget}
          key={group.key}
        />
      ))}
    </section>
  );
}

interface KanbanGroupProps {
  group: Group;
  isStatusBoard: boolean;
  isDragTarget: boolean;
  allTickets: TicketListItem[];
  onOpen: (id: number) => void;
  onMove: (id: number, status: TicketStatus) => void;
  onAction: (id: number, action: string) => Promise<void>;
  onDragTarget: (key: string | null) => void;
}

function KanbanGroup({ group, isStatusBoard, isDragTarget, allTickets, onOpen, onMove, onAction, onDragTarget }: KanbanGroupProps) {
  const [visibleCount, setVisibleCount] = useState(TICKETS_PER_BATCH);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const visibleTickets = group.tickets.slice(0, visibleCount);
  const hasMore = visibleTickets.length < group.tickets.length;
  const ticketIdentity = group.tickets.map((ticket) => ticket.id).join(",");

  useEffect(() => {
    setVisibleCount(TICKETS_PER_BATCH);
  }, [group.key, ticketIdentity]);

  useEffect(() => {
    const loadMore = loadMoreRef.current;
    if (!loadMore || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => count + TICKETS_PER_BATCH);
      },
      { root: scrollContainerRef.current, rootMargin: "240px 0px" },
    );
    observer.observe(loadMore);
    return () => observer.disconnect();
  }, [hasMore, visibleTickets.length]);

  return (
    <article
      className={cn(
        "flex h-[calc(100vh-17rem)] max-h-[52rem] min-h-[26rem] w-80 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        isDragTarget && "border-primary bg-primary/5 ring-2 ring-primary/20",
      )}
      onDragOver={(event) => {
        if (!group.status) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragTarget(group.key);
      }}
      onDragEnter={(event) => {
        if (!group.status) return;
        event.preventDefault();
        onDragTarget(group.key);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDragTarget(null);
      }}
      onDrop={(event) => {
        if (!group.status) return;
        event.preventDefault();
        onDragTarget(null);
        const id = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(id)) onMove(id, group.status);
      }}
      onDragEnd={() => onDragTarget(null)}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="m-0 flex min-w-0 items-center gap-2 text-sm font-semibold capitalize">
          <span className={cn("size-2 shrink-0 rounded-full", tone(group.tone).fill)} aria-hidden="true" />
          <span className="truncate">{group.label}</span>
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {group.tickets.length}
        </Badge>
      </header>

      {isStatusBoard && isDragTarget ? (
        <div className="mx-3 mb-2 shrink-0 rounded-md border border-dashed border-primary/50 bg-background px-3 py-1.5 text-center text-xs font-medium text-primary capitalize">
          Drop to set {group.label}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" ref={scrollContainerRef}>
        {visibleTickets.length ? (
          <div className="grid w-full min-w-0 gap-2">
            {visibleTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} tickets={allTickets} onOpen={onOpen} onAction={onAction} />
            ))}
            {hasMore ? <div aria-hidden="true" className="h-2" ref={loadMoreRef} /> : null}
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-lg border border-dashed text-center text-xs text-muted-foreground">
            <span className="grid justify-items-center gap-1 p-4">
              <InboxIcon className="size-4 opacity-60" />
              {isStatusBoard ? "Drop tickets here" : "No tickets"}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
