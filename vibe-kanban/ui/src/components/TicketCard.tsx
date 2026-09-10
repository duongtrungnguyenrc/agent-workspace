import { useState } from "react";
import { CheckIcon, GitBranchIcon } from "lucide-react";
import { formatKind, formatStatus, formatType, hasChecklistSteps, parentLabel, progressFor, ticketCode } from "../lib/format";
import { kindTone, statusTone, ticketCodeClass, tone, typeTone } from "../lib/styles";
import type { TicketListItem } from "../types/kanban";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";
import { SpotlightCard } from "./reactbits/SpotlightCard";

interface TicketCardProps {
  ticket: TicketListItem;
  tickets: TicketListItem[];
  onOpen: (id: number) => void;
  onAction: (id: number, action: string) => Promise<void>;
}

export function TicketCard({ ticket, tickets, onOpen, onAction }: TicketCardProps) {
  const progress = progressFor(ticket);
  const [dragging, setDragging] = useState(false);
  const needsApproval = ticket.type === "task" && !ticket.user_reviewed && ticket.status === "open";
  const hasExecutionPlan = hasChecklistSteps(ticket.execution_plan);
  const parent = parentLabel(ticket, tickets);

  return (
    <SpotlightCard
      className={cn(
        "group grid w-full min-w-0 gap-2.5 border-l-[3px] p-3 shadow-xs transition-[transform,box-shadow,opacity] hover:-translate-y-0.5 hover:shadow-md",
        tone(typeTone[ticket.type]).accent,
        dragging && "scale-[0.98] opacity-60",
      )}
      draggable
      onDragStart={(event) => {
        setDragging(true);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(ticket.id));
      }}
      onDragEnd={() => setDragging(false)}
    >
      <header className="flex min-w-0 items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <span className={ticketCodeClass}>{ticketCode(ticket)}</span>
          <button
            className="line-clamp-2 text-left text-[15px] leading-5 font-semibold text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            type="button"
            onClick={() => onOpen(ticket.id)}
          >
            {ticket.title}
          </button>
        </div>
        <Badge tone={typeTone[ticket.type]}>{formatType(ticket.type)}</Badge>
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Badge tone={statusTone[ticket.status]} className="capitalize">
            {formatStatus(ticket.status)}
          </Badge>
          {ticket.kind ? <Badge tone={kindTone[ticket.kind]}>{formatKind(ticket.kind)}</Badge> : null}
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{progress}%</span>
      </div>

      <ProgressBar percent={progress} tone={statusTone[ticket.status]} className="h-1.5" />

      <footer className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <GitBranchIcon className="size-3 shrink-0" />
          <span className="truncate font-mono text-[11px]">{ticket.branch || "no branch"}</span>
        </span>
        {needsApproval ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative z-10">
                <Button
                  size="xs"
                  variant={hasExecutionPlan ? "default" : "secondary"}
                  disabled={!hasExecutionPlan}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAction(ticket.id, "approve");
                  }}
                >
                  <CheckIcon /> Approve
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {hasExecutionPlan ? "Approve this task for implementation" : "Add a checklist execution plan before approval"}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </footer>
      {parent !== "Top level" ? (
        <p className="m-0 truncate rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">{parent}</p>
      ) : null}
    </SpotlightCard>
  );
}
