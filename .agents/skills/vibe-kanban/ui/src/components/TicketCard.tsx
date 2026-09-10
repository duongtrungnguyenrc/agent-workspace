import { useState } from "react";
import {
  formatStatus,
  formatType,
  parentLabel,
  progressFor,
  ticketCode,
} from "../lib/format";
import {
  borderToneClass,
  buttonClass,
  buttonTone,
  statusTone,
  ticketCodeClass,
  typeTone,
} from "../lib/styles";
import type { TicketListItem } from "../types/kanban";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";

interface TicketCardProps {
  ticket: TicketListItem;
  tickets: TicketListItem[];
  onOpen: (id: number) => void;
  onAction: (id: number, action: string) => Promise<void>;
}

export function TicketCard({
  ticket,
  tickets,
  onOpen,
  onAction,
}: TicketCardProps) {
  const progress = progressFor(ticket);
  const [dragging, setDragging] = useState(false);
  const needsApproval =
    ticket.type === "task" && !ticket.user_reviewed && ticket.status === "open";

  const hasExecutionPlan =
    String(ticket.execution_plan || "").trim().length > 0;

  return (
    <button
      className={`grid min-w-0 w-full gap-y-3 rounded-md border border-l-4 bg-white p-3 text-left shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-950/10 active:translate-y-px ${dragging ? "scale-[0.98] opacity-60" : ""} ${borderToneClass(typeTone[ticket.type])}`}
      draggable
      onDragStart={(event) => {
        setDragging(true);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(ticket.id));
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(ticket.id)}
      type="button"
    >
      <header className="flex min-w-0 items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1.5">
          <span className={ticketCodeClass}>{ticketCode(ticket)}</span>
          <strong className="line-clamp-2 wrap-break-word text-[15px] font-semibold leading-5 text-neutral-950">
            {ticket.title}
          </strong>
        </div>

        <Badge tone={typeTone[ticket.type]}>{formatType(ticket.type)}</Badge>
      </header>

      <div className="flex items-center justify-between gap-3">
        <Badge tone={statusTone[ticket.status]}>
          {formatStatus(ticket.status)}
        </Badge>
        <span className="shrink-0 text-xs font-bold text-neutral-500">
          {progress}%
        </span>
      </div>

      <ProgressBar percent={progress} tone={statusTone[ticket.status]} />

      <footer className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        {needsApproval && (
          <div className="grid min-w-0 gap-1.5">
            <Badge tone={ticket.user_reviewed ? "emerald" : "orange"}>
              {ticket.user_reviewed ? "Approved" : "Needs review"}
            </Badge>
          </div>
        )}

        <span className="min-w-0 truncate text-xs font-semibold text-neutral-500">
          {ticket.branch || "No branch"}
        </span>
      </footer>

      {needsApproval ? (
        <button
          className={`${buttonClass} min-h-8 px-3 text-xs ${hasExecutionPlan ? buttonTone("approve") : "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400"}`}
          disabled={!hasExecutionPlan}
          title={
            hasExecutionPlan
              ? "Approve this task for implementation"
              : "Add an execution plan before approval"
          }
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAction(ticket.id, "approve");
          }}
        >
          Approve
        </button>
      ) : null}
      <p className="m-0 rounded-lg bg-white/60 px-2 py-1 truncate text-xs font-medium text-neutral-500">
        {parentLabel(ticket, tickets)}
      </p>
    </button>
  );
}
