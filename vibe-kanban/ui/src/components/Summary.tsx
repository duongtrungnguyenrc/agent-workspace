import { CircleCheckBigIcon, LayersIcon, ShieldCheckIcon, ZapIcon } from "lucide-react";
import { formatStatus, progressFor } from "../lib/format";
import { statusTone, tone } from "../lib/styles";
import type { TicketListItem, TicketStatus } from "../types/kanban";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import CountUp from "./reactbits/CountUp";
import { ProgressBar } from "./ProgressBar";

export function Summary({ tickets, statuses }: { tickets: TicketListItem[]; statuses: TicketStatus[] }) {
  const total = Math.max(tickets.length, 1);
  const active = tickets.filter((ticket) => ["open", "in_progress", "in_review", "hold"].includes(ticket.status)).length;
  const approved = tickets.filter((ticket) => ticket.user_reviewed).length;
  const closed = tickets.filter((ticket) => ticket.status === "closed").length;
  const average = tickets.length
    ? Math.round(tickets.reduce((sum, ticket) => sum + progressFor(ticket), 0) / tickets.length)
    : 0;

  const stats = [
    { label: "Tickets", value: tickets.length, tone: "violet", Icon: LayersIcon },
    { label: "Active", value: active, tone: "orange", Icon: ZapIcon },
    { label: "Approved", value: approved, tone: "emerald", Icon: ShieldCheckIcon },
    { label: "Closed", value: closed, tone: "sky", Icon: CircleCheckBigIcon },
  ] as const;

  return (
    <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(300px,1.6fr)]">
      {stats.map(({ label, value, tone: name, Icon }) => (
        <Card className="gap-2 px-4 py-3" key={label}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
            <span className={cn("grid size-7 place-items-center rounded-md", tone(name).soft)}>
              <Icon className="size-4" />
            </span>
          </div>
          <CountUp to={value} duration={0.8} className="text-3xl font-semibold tracking-tight tabular-nums" />
        </Card>
      ))}

      <Card className="col-span-2 gap-3 px-4 py-3 xl:col-span-1">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Overall progress</span>
            <p className="m-0 text-xs text-muted-foreground">Average across the current view</p>
          </div>
          <span className="text-2xl font-semibold tabular-nums">
            <CountUp to={average} duration={0.8} />%
          </span>
        </div>
        <ProgressBar percent={average} />
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-label="Ticket status distribution">
          {statuses.map((status) => {
            const count = tickets.filter((ticket) => ticket.status === status).length;
            if (!count) return null;
            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <span
                    className={cn("h-full transition-[width] duration-500", tone(statusTone[status]).fill)}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {formatStatus(status)}: {count}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {statuses.map((status) => {
            const count = tickets.filter((ticket) => ticket.status === status).length;
            if (!count) return null;
            return (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground capitalize" key={status}>
                <span className={cn("size-2 rounded-full", tone(statusTone[status]).fill)} />
                {formatStatus(status)} <span className="tabular-nums">{count}</span>
              </span>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
