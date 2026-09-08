import { useEffect, useRef, useState } from "react";
import { formatStatus, formatType, parentLabel } from "../lib/format";
import type {
  GroupBy,
  TicketListItem,
  TicketStatus,
  TicketType,
} from "../types/kanban";
import { TicketCard } from "./TicketCard";

interface KanbanBoardProps {
  tickets: TicketListItem[];
  allTickets: TicketListItem[];
  statuses: TicketStatus[];
  types: TicketType[];
  groupBy: GroupBy;
  onOpen: (id: number) => void;
  onMove: (id: number, status: TicketStatus) => void;
  onAction: (id: number, action: string) => Promise<void>;
}

interface Group {
  key: string;
  label: string;
  status?: TicketStatus;
  tickets: TicketListItem[];
}

const TICKETS_PER_BATCH = 20;

function groupsFor(props: KanbanBoardProps): Group[] {
  if (props.groupBy === "type") {
    return props.types.map((type) => ({
      key: type,
      label: formatType(type),
      tickets: props.tickets.filter((ticket) => ticket.type === type),
    }));
  }
  if (props.groupBy === "review") {
    return [
      {
        key: "pending",
        label: "Needs review",
        tickets: props.tickets.filter((ticket) => !ticket.user_reviewed),
      },
      {
        key: "approved",
        label: "Approved",
        tickets: props.tickets.filter((ticket) => ticket.user_reviewed),
      },
    ];
  }
  if (props.groupBy === "branch") {
    const branches = [
      ...new Set(props.tickets.map((ticket) => ticket.branch || "No branch")),
    ].sort();
    return branches.map((branch) => ({
      key: branch,
      label: branch,
      tickets: props.tickets.filter(
        (ticket) => (ticket.branch || "No branch") === branch,
      ),
    }));
  }
  if (props.groupBy === "parent") {
    const parentLabels = [
      ...new Set(
        props.tickets.map((ticket) => parentLabel(ticket, props.allTickets)),
      ),
    ].sort();
    return parentLabels.map((label) => ({
      key: label,
      label,
      tickets: props.tickets.filter(
        (ticket) => parentLabel(ticket, props.allTickets) === label,
      ),
    }));
  }
  return props.statuses.map((status) => ({
    key: status,
    label: formatStatus(status),
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
    <section className="flex gap-4 overflow-x-auto pb-3">
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

function KanbanGroup({
  group,
  isStatusBoard,
  isDragTarget,
  allTickets,
  onOpen,
  onMove,
  onAction,
  onDragTarget,
}: KanbanGroupProps) {
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
        if (entry.isIntersecting) {
          setVisibleCount((count) => count + TICKETS_PER_BATCH);
        }
      },
      { root: scrollContainerRef.current, rootMargin: "240px 0px" },
    );

    observer.observe(loadMore);
    return () => observer.disconnect();
  }, [hasMore, visibleTickets.length]);

  return (
    <article
      className={`flex h-[calc(100vh-12rem)] min-h-105 max-h-180 w-76 shrink-0 flex-col rounded-2xl border bg-white/90 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_16px_40px_rgb(15_23_42/0.04)] transition ${isStatusBoard ? "border-dashed" : ""} ${isDragTarget ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : "border-neutral-200/80"}`}
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
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onDragTarget(null);
        }
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
      <header className="p-3 flex shrink-0 items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2">
        <h2 className="m-0 min-w-0 truncate text-sm font-bold text-neutral-950">
          {group.label}
        </h2>

        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-neutral-600 shadow-sm">
          {group.tickets.length}
        </span>
      </header>

      {isStatusBoard ? (
        <div
          className={`my-3 mx-3 shrink-0 rounded-md border border-dashed px-3 py-2 text-center text-xs font-semibold transition ${isDragTarget ? "border-violet-300 bg-white text-violet-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
        >
          Drop to set {group.label}
        </div>
      ) : null}

      <div
        className="min-h-0 flex-1 overflow-y-auto pr-1 px-3"
        ref={scrollContainerRef}
      >
        <div className="grid gap-3">
          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              tickets={allTickets}
              onOpen={onOpen}
              onAction={onAction}
            />
          ))}

          {hasMore ? (
            <div aria-hidden="true" className="h-2" ref={loadMoreRef} />
          ) : null}
        </div>
      </div>
    </article>
  );
}
