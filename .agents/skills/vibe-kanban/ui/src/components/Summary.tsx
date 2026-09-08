import { progressFor } from "../lib/format";
import { panelClass, statusTone, textToneClass } from "../lib/styles";
import type { TicketListItem, TicketStatus } from "../types/kanban";
import { ProgressBar } from "./ProgressBar";

export function Summary({ tickets, statuses }: { tickets: TicketListItem[]; statuses: TicketStatus[] }) {
  const total = Math.max(tickets.length, 1);
  const active = tickets.filter((ticket) => ["open", "in_progress", "in_review", "hold"].includes(ticket.status)).length;
  const approved = tickets.filter((ticket) => ticket.user_reviewed).length;
  const closed = tickets.filter((ticket) => ticket.status === "closed").length;
  const average = tickets.length
    ? Math.round(tickets.reduce((sum, ticket) => sum + progressFor(ticket), 0) / tickets.length)
    : 0;

  return (
    <>
      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Tickets", tickets.length, "violet"],
          ["Active", active, "orange"],
          ["Approved", approved, "emerald"],
          ["Closed", closed, "sky"],
        ].map(([label, value, tone]) => (
          <article className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" key={label}>
            <span className="block text-xs font-bold uppercase text-neutral-500">{label}</span>
            <strong className={`mt-2 inline-flex rounded-lg px-2 text-3xl font-bold ${textToneClass(String(tone))}`}>{value}</strong>
          </article>
        ))}
      </section>

      <section className={`${panelClass} mb-4`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-bold text-neutral-950">Overall progress</h2>
            <p className="m-0 text-sm leading-6 text-neutral-500">Average ticket progress across the current view</p>
          </div>
          <strong className="text-lg font-bold text-violet-700">{average}%</strong>
        </div>
        <ProgressBar percent={average} />
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-100" aria-label="Ticket status distribution">
          {statuses.map((status) => {
            const count = tickets.filter((ticket) => ticket.status === status).length;
            const fillClass = {
              sky: "bg-sky-500",
              violet: "bg-violet-600",
              amber: "bg-amber-500",
              rose: "bg-rose-500",
              orange: "bg-orange-500",
              emerald: "bg-emerald-500",
            }[statusTone[status]];
            return <span className={fillClass} key={status} style={{ width: `${(count / total) * 100}%` }} />;
          })}
        </div>
      </section>
    </>
  );
}
