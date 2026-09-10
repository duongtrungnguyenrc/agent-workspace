import { useEffect, useRef } from "react";
import { ArrowLeftIcon, HistoryIcon } from "lucide-react";
import { eventLabel, eventSummary, eventTone } from "../lib/events";
import { formatDate, formatKind, formatStatus, formatType, ticketCode } from "../lib/format";
import { kindTone, statusTone, ticketCodeClass, tone, typeTone } from "../lib/styles";
import type { ActivityEvent } from "../types/kanban";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { LinkText } from "./LinkText";

interface ActivityPageProps {
  events: ActivityEvent[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onBack: () => void;
  onOpen: (id: number) => void;
}

export function ActivityPage({ events, hasMore, loading, onLoadMore, onBack, onOpen }: ActivityPageProps) {
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
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
            <ArrowLeftIcon /> Board
          </Button>
          <h1 className="mt-2 mb-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <HistoryIcon className="size-5 text-primary" /> Activity
          </h1>
          <p className="m-0 max-w-2xl text-sm text-muted-foreground">
            Every ticket event recorded by the API and CLI. Newest first; older entries load as you scroll.
          </p>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {events.length}
          {hasMore ? "+" : ""} events
        </span>
      </header>

      <Card className="gap-0 p-0">
        {events.length ? (
          <ol className="m-0 grid list-none">
            {events.map((event) => {
              const summary = eventSummary(event.type, event.payload);
              return (
                <li key={event.id} className="grid grid-cols-[14px_minmax(0,1fr)] gap-3 border-b px-4 py-3 last:border-b-0">
                  <span className={cn("mt-1.5 size-2.5 rounded-full ring-4 ring-muted", tone(eventTone(event.type)).fill)} />
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-semibold">{eventLabel(event.type)}</span>
                        <button
                          className={cn(ticketCodeClass, "hover:underline disabled:no-underline disabled:opacity-60")}
                          disabled={!event.ticket_exists}
                          type="button"
                          onClick={() => onOpen(event.ticket_id)}
                        >
                          {ticketCode({ id: event.ticket_id, type: event.ticket_type || "group" })}
                        </button>
                        <span
                          className={cn(
                            "min-w-0 truncate text-sm text-muted-foreground",
                            !event.ticket_exists && "line-through",
                          )}
                        >
                          {event.ticket_title || "Deleted ticket"}
                        </span>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {event.actor} · {formatDate(event.created_at)}
                      </time>
                    </div>
                    {summary ? (
                      <p className="m-0 break-words text-sm leading-6 text-foreground/80">
                        <LinkText value={summary} />
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {event.ticket_type ? <Badge tone={typeTone[event.ticket_type]}>{formatType(event.ticket_type)}</Badge> : null}
                      {event.ticket_kind ? <Badge tone={kindTone[event.ticket_kind]}>{formatKind(event.ticket_kind)}</Badge> : null}
                      {event.ticket_status ? (
                        <Badge tone={statusTone[event.ticket_status]} className="capitalize">
                          {formatStatus(event.ticket_status)}
                        </Badge>
                      ) : null}
                      {!event.ticket_exists ? <Badge tone="rose">Deleted</Badge> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : loading ? (
          <div className="grid gap-3 p-4">
            {[0, 1, 2].map((index) => (
              <div className="grid grid-cols-[14px_minmax(0,1fr)] gap-3" key={index}>
                <Skeleton className="mt-1.5 size-2.5 rounded-full" />
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 p-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
        )}
        {events.length && (hasMore || loading) ? (
          <div className="flex items-center justify-center border-t p-3">
            <div aria-hidden="true" className="h-px w-px" ref={sentinelRef} />
            <Button variant="outline" size="sm" disabled={loading} onClick={onLoadMore}>
              {loading ? "Loading older activity…" : "Load older activity"}
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
