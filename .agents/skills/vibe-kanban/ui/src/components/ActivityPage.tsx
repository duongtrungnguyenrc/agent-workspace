import { formatStatus, ticketCode } from "../lib/format";
import { buttonClass, panelClass, secondaryButtonClass, statusTone, ticketCodeClass, typeTone } from "../lib/styles";
import type { ActivityEvent } from "../types/kanban";
import { Badge } from "./Badge";

function payloadSummary(payload: Record<string, unknown>) {
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const step = typeof payload.step === "string" ? payload.step.trim() : "";
  const percent = typeof payload.percent === "number" ? `${payload.percent}%` : "";
  const from = typeof payload.from === "string" ? formatStatus(payload.from) : "";
  const to = typeof payload.to === "string" ? formatStatus(payload.to) : "";
  const comment = typeof payload.comment === "string" ? payload.comment.trim() : "";
  const questions = typeof payload.questions === "string" ? payload.questions.trim() : "";
  if (description || step || percent || comment || questions || (from && to)) {
    return [
      from && to ? `Status ${from} -> ${to}` : "",
      step ? `Step: ${step}` : "",
      percent ? `Progress: ${percent}` : "",
      comment ? `Comment: ${comment}` : "",
      questions ? `Questions: ${questions}` : "",
      description ? `Description: ${description}` : "",
    ].filter(Boolean).join(" - ");
  }
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "No payload";
  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" - ");
}

export function ActivityPage({ events, onBack, onOpen }: { events: ActivityEvent[]; onBack: () => void; onOpen: (id: number) => void }) {
  return (
    <section className="grid gap-4">
      <header className={`${panelClass} flex flex-col gap-4 md:flex-row md:items-start md:justify-between`}>
        <div className="min-w-0">
          <button className={`${buttonClass} ${secondaryButtonClass}`} type="button" onClick={onBack}>
            Back to board
          </button>
          <h1 className="mb-1 mt-4 break-words text-3xl font-bold leading-tight text-neutral-950">Activity logs</h1>
          <p className="m-0 max-w-3xl break-words text-sm leading-6 text-neutral-500">Server-recorded ticket activity across status, approvals, plans, progress, commits, and edits.</p>
        </div>
        <strong className="rounded-xl bg-violet-50 px-4 py-2 text-2xl font-bold text-violet-700">{events.length}</strong>
      </header>

      <section className={`${panelClass} grid gap-0 p-0`}>
        {events.length ? (
          events.map((event) => (
            <article key={event.id} className="grid grid-cols-[12px_minmax(0,1fr)] gap-3 border-b border-neutral-100 p-4 last:border-b-0">
              <span className="mt-2 size-2 rounded-full bg-violet-600 ring-4 ring-violet-100" />
              <div className="grid min-w-0 gap-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <span className={ticketCodeClass}>
                      {event.ticket_type ? ticketCode({ id: event.ticket_id, type: event.ticket_type }) : `ticket-${event.ticket_id}`}
                    </span>
                    <h2 className="m-0 break-words text-base font-bold capitalize text-neutral-950">{event.type.replaceAll(".", " ")}</h2>
                  </div>
                  <time className="shrink-0 text-xs font-semibold text-neutral-500">{event.created_at}</time>
                </div>
                <button className="flex min-w-0 flex-col gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50 md:flex-row md:items-center md:justify-between" type="button" onClick={() => onOpen(event.ticket_id)}>
                  <strong className="min-w-0 truncate text-sm font-bold text-neutral-900">{event.ticket_title || "Deleted ticket"}</strong>
                  <span className="shrink-0 text-xs font-semibold text-neutral-500">{event.actor}</span>
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {event.ticket_type ? <Badge tone={typeTone[event.ticket_type]}>{event.ticket_type === "use_case" ? "Use Case" : event.ticket_type}</Badge> : null}
                  {event.ticket_status ? <Badge tone={statusTone[event.ticket_status]}>{formatStatus(event.ticket_status)}</Badge> : null}
                </div>
                <p className="m-0 break-words text-sm leading-6 text-neutral-600">{payloadSummary(event.payload)}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="m-0 p-4 text-sm text-neutral-500">No activity recorded yet.</p>
        )}
      </section>
    </section>
  );
}
