import { useEffect, useState } from "react";
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
        <article
          className={`min-h-[420px] w-[304px] shrink-0 rounded-2xl border bg-white/90 p-3 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_16px_40px_rgb(15_23_42/0.04)] transition ${isStatusBoard ? "border-dashed" : ""} ${dragTarget === group.key ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : "border-neutral-200/80"}`}
          key={group.key}
          onDragOver={(event) => {
            if (!group.status) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDragTarget(group.key);
          }}
          onDragEnter={(event) => {
            if (!group.status) return;
            event.preventDefault();
            setDragTarget(group.key);
          }}
          onDragLeave={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              setDragTarget((current) =>
                current === group.key ? null : current,
              );
            }
          }}
          onDrop={(event) => {
            if (!group.status) return;
            event.preventDefault();
            setDragTarget(null);
            const id = Number(event.dataTransfer.getData("text/plain"));
            if (Number.isInteger(id)) props.onMove(id, group.status);
          }}
          onDragEnd={() => setDragTarget(null)}
        >
          <header className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2">
            <h2 className="m-0 min-w-0 truncate text-sm font-bold text-neutral-950">
              {group.label}
            </h2>

            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-neutral-600 shadow-sm">
              {group.tickets.length}
            </span>
          </header>

          {isStatusBoard ? (
            <div className={`my-3 rounded-xl border border-dashed px-3 py-2 text-center text-xs font-semibold transition ${dragTarget === group.key ? "border-violet-300 bg-white text-violet-700" : "border-neutral-200 bg-neutral-50 text-neutral-500"}`}>
              Drop to set {group.label}
            </div>
          ) : null}

          <div className="grid gap-3">
            {group.tickets.length ? (
              group.tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  tickets={props.allTickets}
                  onOpen={props.onOpen}
                  onAction={props.onAction}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-sm font-medium text-neutral-500">
                {isStatusBoard ? "Drop tickets here" : "No tickets"}
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
