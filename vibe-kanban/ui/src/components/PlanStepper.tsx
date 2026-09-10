import { CircleAlertIcon, CircleCheckIcon, CircleDashedIcon, LoaderCircleIcon } from "lucide-react";
import type { PlanStep, PlanStepStatus } from "../types/kanban";
import { cn } from "@/lib/utils";

const stepStyle: Record<PlanStepStatus, string> = {
  pending: "border-border bg-card text-muted-foreground",
  in_progress: "border-primary/40 bg-primary/5 text-foreground ring-2 ring-primary/15",
  completed: "border-emerald-500/30 bg-emerald-500/5 text-foreground",
  blocked: "border-rose-500/40 bg-rose-500/5 text-foreground",
};

const iconStyle: Record<PlanStepStatus, string> = {
  pending: "text-muted-foreground/70",
  in_progress: "text-primary animate-spin [animation-duration:2.5s]",
  completed: "text-emerald-500",
  blocked: "text-rose-500",
};

function StepIcon({ status }: { status: PlanStepStatus }) {
  const className = cn("size-5 shrink-0", iconStyle[status]);
  if (status === "completed") return <CircleCheckIcon className={className} />;
  if (status === "in_progress") return <LoaderCircleIcon className={className} />;
  if (status === "blocked") return <CircleAlertIcon className={className} />;
  return <CircleDashedIcon className={className} />;
}

export function PlanStepper({ steps, compact = false }: { steps: PlanStep[]; compact?: boolean }) {
  if (!steps.length) {
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Add top-level Markdown checklist items (<code className="rounded bg-muted px-1 font-mono text-xs">- [ ]</code>) to the
        execution plan to track steps here.
      </p>
    );
  }
  return (
    <ol className="grid gap-2">
      {steps.map((step) => (
        <li
          className={cn(
            "grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors",
            stepStyle[step.status],
          )}
          key={step.id}
        >
          <StepIcon status={step.status} />
          <div className="min-w-0">
            <p
              className={cn(
                "m-0 break-words text-sm font-medium leading-5",
                step.status === "completed" && "text-muted-foreground line-through decoration-muted-foreground/40",
              )}
            >
              <span className="mr-1.5 font-mono text-xs text-muted-foreground">{step.position}.</span>
              {step.title}
            </p>
            {!compact && step.detail ? (
              <p className="m-0 mt-1 break-words text-xs leading-5 text-muted-foreground">{step.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
