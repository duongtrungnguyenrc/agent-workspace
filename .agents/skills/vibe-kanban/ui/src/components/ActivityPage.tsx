import { useEffect, useRef } from "react";
import { eventLabel, eventSummary, eventTone } from "../lib/events";
import {
  formatKind,
  formatStatus,
  formatType,
  ticketCode,
} from "../lib/format";
import {
  buttonClass,
  fillToneClass,
  kindTone,
  panelClass,
  secondaryButtonClass,
  statusTone,
  ticketCodeClass,
  typeTone,
} from "../lib/styles";
import type { ActivityEvent } from "../types/kanban";
import { Badge } from "./Badge";

interface ActivityPageProps {
  events: ActivityEvent[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onBack: () => void;
  onOpen: (id: number) => void;
}

export function ActivityPage({
  events,
  hasMore,
  loading,
  onLoadMore,
  onBack,
  onOpen,
}: ActivityPageProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, events.length]);

  return (
    <section className="grid gap-4">
      <header
        className={`${panelClass} flex flex-col gap-4 md:flex-row md:items-start md:justify-between`}
      >
        <div className="min-w-0">
          <button
            className={`${buttonClass} ${secondaryButtonClass}`}
            type="button"
            onClick={onBack}
          >
            Back to board
          </button>
          <h1 className="mb-1 mt-4 break-words text-3xl font-bold leading-tight text-neutral-950">
            Activity logs
          </h1>
          <p className="m-0 max-w-3xl break-words text-sm leading-6 text-neutral-500">
            Server-recorded ticket activity across status, approvals, plans,
            progress, commits, deletions, and edits. Newest first; older entries
            load as you scroll.
          </p>
        </div>
        <strong className="rounded-xl bg-violet-50 px-4 py-2 text-2xl font-bold text-violet-700">
          {events.length}
          {hasMore ? "+" : ""}
        </strong>
      </header>

      <section className={`${panelClass} grid gap-0 p-0`}>
        {events.length ? (
          events.map((event) => {
            const summary = eventSummary(event.type, event.payload);
            const tone = eventTone(event.type);
            return (
              <article
                key={event.id}
                className="grid grid-cols-[12px_minmax(0,1fr)] gap-3 border-b border-neutral-100 p-4 last:border-b-0"
              >
                <span
                  className={`mt-2 size-2 rounded-full ring-4 ring-neutral-100 ${fillToneClass(tone)}`}
                />
                <div className="grid min-w-0 gap-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <span className={ticketCodeClass}>
                        {ticketCode({
                          id: event.ticket_id,
                          type: event.ticket_type || "group",
                        })}
                      </span>
                      <h2 className="m-0 break-words text-base font-bold text-neutral-950">
                        {eventLabel(event.type)}
                      </h2>
                    </div>
                    <time className="shrink-0 text-xs font-semibold text-neutral-500">
                      {event.created_at}
                    </time>
                  </div>
                  <button
                    className="flex min-w-0 flex-col gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition enabled:hover:border-violet-200 enabled:hover:bg-violet-50 disabled:cursor-default md:flex-row md:items-center md:justify-between"
                    disabled={!event.ticket_exists}
                    title={
                      event.ticket_exists
                        ? "Open ticket"
                        : "This ticket was deleted"
                    }
                    type="button"
                    onClick={() => onOpen(event.ticket_id)}
                  >
                    <strong
                      className={`min-w-0 truncate text-sm font-bold ${event.ticket_exists ? "text-neutral-900" : "text-neutral-500 line-through"}`}
                    >
                      {event.ticket_title || "Deleted ticket"}
                    </strong>
                    <span className="shrink-0 text-xs font-semibold text-neutral-500">
                      {event.actor}
                    </span>
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {event.ticket_type ? (
                      <Badge tone={typeTone[event.ticket_type]}>
                        {formatType(event.ticket_type)}
                      </Badge>
                    ) : null}
                    {event.ticket_kind ? (
                      <Badge tone={kindTone[event.ticket_kind]}>
                        {formatKind(event.ticket_kind)}
                      </Badge>
                    ) : null}
                    {event.ticket_status ? (
                      <Badge tone={statusTone[event.ticket_status]}>
                        {formatStatus(event.ticket_status)}
                      </Badge>
                    ) : null}
                    {!event.ticket_exists ? (
                      <Badge tone="rose">Deleted</Badge>
                    ) : null}
                  </div>
                  <p className="m-0 break-words text-sm leading-6 text-neutral-600">
                    {summary || "No details recorded"}
                  </p>
                </div>
              </article>
            );
          })
        ) : (
          <p className="m-0 p-4 text-sm text-neutral-500">
            {loading ? "Loading activity..." : "No activity recorded yet."}
          </p>
        )}
        {events.length && (hasMore || loading) ? (
          <div className="flex items-center justify-center gap-3 border-t border-neutral-100 p-4">
            <div aria-hidden="true" className="h-px w-px" ref={sentinelRef} />
            <button
              className={`${buttonClass} ${secondaryButtonClass}`}
              disabled={loading}
              type="button"
              onClick={onLoadMore}
            >
              {loading ? "Loading older activity..." : "Load older activity"}
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
