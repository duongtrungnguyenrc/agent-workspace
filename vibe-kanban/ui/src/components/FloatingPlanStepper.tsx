import { XIcon } from "lucide-react";
import type { TicketDetail } from "../types/kanban";
import { ticketCode } from "../lib/format";
import { ticketCodeClass } from "../lib/styles";
import { Button } from "@/components/ui/button";
import { PlanStepper } from "./PlanStepper";
import { ProgressBar } from "./ProgressBar";

export function FloatingPlanStepper({
  ticket,
  onOpen,
  onClose,
}: {
  ticket: TicketDetail | null;
  onOpen: (id: number) => void;
  onClose: () => void;
}) {
  if (!ticket?.plan_steps?.length) return null;
  const completed = ticket.plan_steps.filter((step) => step.status === "completed").length;
  const percent = Math.round((completed / ticket.plan_steps.length) * 100);
  return (
    <aside
      className="fixed right-4 bottom-4 z-40 w-[min(400px,calc(100vw-32px))] overflow-hidden rounded-xl border bg-card/95 text-card-foreground shadow-2xl shadow-black/15 backdrop-blur animate-in fade-in slide-in-from-bottom-4"
      aria-live="polite"
    >
      <div className="flex items-start gap-2 border-b p-3">
        <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onOpen(ticket.id)}>
          <span className={ticketCodeClass}>{ticketCode(ticket)}</span>
          <strong className="block truncate text-sm font-semibold">{ticket.title}</strong>
          <span className="text-xs text-muted-foreground">
            {completed}/{ticket.plan_steps.length} steps completed
          </span>
        </button>
        <Button variant="ghost" size="icon-sm" aria-label="Close progress monitor" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      <div className="px-3 pt-3">
        <ProgressBar percent={percent} tone={percent === 100 ? "emerald" : "violet"} />
      </div>
      <div className="max-h-64 overflow-y-auto p-3">
        <PlanStepper steps={ticket.plan_steps} compact />
      </div>
    </aside>
  );
}
