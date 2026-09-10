import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./lib/api";
import type {
  ActivityEvent,
  GroupBy,
  ReviewFilter,
  TicketChangeEvent,
  TicketCollection,
  TicketDetail,
  TicketKind,
  TicketStatus,
  TicketType,
} from "./types/kanban";
import { Filters } from "./components/Filters";
import { ActivityPage } from "./components/ActivityPage";
import { HierarchyPage } from "./components/HierarchyPage";
import { KanbanBoard } from "./components/KanbanBoard";
import { MindMapPage } from "./components/MindMapPage";
import { Summary } from "./components/Summary";
import { TicketComposer } from "./components/TicketComposer";
import { TicketDetailPage } from "./components/TicketDetailPage";
import { ToastStack, type Toast } from "./components/ToastStack";
import { useSocketTickets } from "./hooks/useSocketTickets";
import { eventLabel, eventSummary, eventTone } from "./lib/events";
import { formatKind, formatType, ticketCode } from "./lib/format";
import { buttonClass, secondaryButtonClass } from "./lib/styles";

const ACTIVITY_PAGE_SIZE = 50;
const TOAST_LIMIT = 4;
const TOAST_DURATION_MS = 6000;
const REFRESH_DEBOUNCE_MS = 150;

const defaultCollection: TicketCollection = {
  statuses: ["open", "in_progress", "in_review", "closed", "hold", "cancelled"],
  types: ["US", "use_case", "task", "uat_feedback", "qc_feedback"],
  kinds: ["feature", "bugfix", "refactor", "chore", "docs", "test"],
  tickets: [],
};

function selectedIdFromPath() {
  const match = window.location.pathname.match(/^\/tickets\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function pageFromPath() {
  return window.location.pathname === "/activity" ? "activity" : "board";
}

function mergeEvents(incoming: ActivityEvent[], current: ActivityEvent[]) {
  const byId = new Map<number, ActivityEvent>();
  for (const event of [...incoming, ...current]) byId.set(event.id, event);
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

function toastFromChange(event: TicketChangeEvent): Toast {
  const code = ticketCode({
    id: event.ticket_id,
    type: event.ticket_type || "US",
  });
  const meta = [
    event.ticket_type ? formatType(event.ticket_type) : "",
    event.ticket_kind ? formatKind(event.ticket_kind) : "",
    event.actor,
    event.source === "sqlite" ? "via CLI" : "via UI",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    id: event.id,
    tone: eventTone(event.type),
    title: `${eventLabel(event.type)} · ${code}`,
    detail: [event.ticket_title, eventSummary(event.type, event.payload)]
      .filter(Boolean)
      .join(" — "),
    meta,
    ticketId: event.ticket_exists ? event.ticket_id : undefined,
  };
}

export default function App() {
  const [collection, setCollection] =
    useState<TicketCollection>(defaultCollection);
  const [selectedId, setSelectedId] = useState<number | null>(
    selectedIdFromPath,
  );
  const [page, setPage] = useState<"board" | "activity">(pageFromPath);
  const [boardView, setBoardView] = useState<"kanban" | "list" | "graph">(
    "kanban",
  );
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [activityCursor, setActivityCursor] = useState<number | null>(null);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [typesSelected, setTypesSelected] = useState<TicketType[]>([]);
  const [kindsSelected, setKindsSelected] = useState<TicketKind[]>([]);
  const [statusesSelected, setStatusesSelected] = useState<TicketStatus[]>([]);
  const [reviewsSelected, setReviewsSelected] = useState<ReviewFilter[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef(new Map<number, number>());
  const refreshTimer = useRef<number | null>(null);
  const selectedIdRef = useRef(selectedId);
  const activityLoadingRef = useRef(false);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Toast) => {
      setToasts((current) => [
        ...current
          .filter((item) => item.id !== toast.id)
          .slice(-(TOAST_LIMIT - 1)),
        toast,
      ]);
      const timer = window.setTimeout(
        () => dismissToast(toast.id),
        TOAST_DURATION_MS,
      );
      toastTimers.current.set(toast.id, timer);
    },
    [dismissToast],
  );

  const refreshTickets = useCallback(async () => {
    try {
      setCollection(await api.tickets());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    }
  }, []);

  const backToBoard = useCallback(() => {
    setPage("board");
    setSelectedId(null);
    setDetail(null);
    window.history.pushState({}, "", "/");
  }, []);

  const refreshDetail = useCallback(
    async (id: number | null) => {
      if (!id) {
        setDetail(null);
        return;
      }
      try {
        setDetail(await api.ticket(id));
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load ticket";
        if (message.includes("not found")) backToBoard();
        setError(message);
      }
    },
    [backToBoard],
  );

  const refreshActivity = useCallback(async () => {
    try {
      const data = await api.activity({ limit: ACTIVITY_PAGE_SIZE });
      setActivity((current) => {
        const oldestIncoming = data.events[data.events.length - 1]?.id;
        // Event ids are contiguous, so a gap between the first page and the loaded list means the list is stale.
        const contiguous =
          current.length > 0 &&
          oldestIncoming !== undefined &&
          oldestIncoming <= current[0].id + 1;
        if (!contiguous) {
          setActivityCursor(data.next_cursor);
          setActivityHasMore(data.has_more);
          return data.events;
        }
        return mergeEvents(data.events, current);
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    }
  }, []);

  const loadMoreActivity = useCallback(async () => {
    if (activityLoadingRef.current || !activityHasMore || !activityCursor)
      return;
    activityLoadingRef.current = true;
    setActivityLoading(true);
    try {
      const data = await api.activity({
        limit: ACTIVITY_PAGE_SIZE,
        before: activityCursor,
      });
      setActivity((current) => mergeEvents(current, data.events));
      setActivityCursor(data.next_cursor);
      setActivityHasMore(data.has_more);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load older activity",
      );
    } finally {
      activityLoadingRef.current = false;
      setActivityLoading(false);
    }
  }, [activityCursor, activityHasMore]);

  const refreshAll = useCallback(async () => {
    await refreshTickets();
    await refreshDetail(selectedId);
    if (page === "activity") await refreshActivity();
  }, [page, refreshActivity, refreshDetail, refreshTickets, selectedId]);

  const refreshAllRef = useRef(refreshAll);
  useEffect(() => {
    refreshAllRef.current = refreshAll;
  }, [refreshAll]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      refreshAllRef.current();
    }, REFRESH_DEBOUNCE_MS);
  }, []);

  const handleSocketChange = useCallback(
    (event: TicketChangeEvent) => {
      pushToast(toastFromChange(event));
      if (
        event.type === "ticket.deleted" &&
        event.ticket_id === selectedIdRef.current
      ) {
        backToBoard();
      }
      scheduleRefresh();
    },
    [backToBoard, pushToast, scheduleRefresh],
  );

  useSocketTickets(handleSocketChange);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onPopState = () => {
      setSelectedId(selectedIdFromPath());
      setPage(pageFromPath());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    refreshDetail(selectedId);
  }, [refreshDetail, selectedId]);

  useEffect(() => {
    if (page === "activity") refreshActivity();
  }, [page, refreshActivity]);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return collection.tickets.filter((ticket) => {
      const haystack = [
        ticket.title,
        ticket.type,
        ticket.kind,
        ticket.status,
        ticket.branch,
        ticket.pr_url,
        ticket.pr_number,
        ticket.pr_status,
        ticket.pipeline_status,
        ticket.pipeline_url,
        ticket.action_items,
        ticket.user_comments,
        ticket.open_questions,
        ticket.specification,
        ticket.execution_plan,
        ticket.source_type,
        ticket.source_id,
      ]
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (typesSelected.length && !typesSelected.includes(ticket.type))
        return false;
      if (
        kindsSelected.length &&
        (!ticket.kind || !kindsSelected.includes(ticket.kind))
      )
        return false;
      if (statusesSelected.length && !statusesSelected.includes(ticket.status))
        return false;
      if (reviewsSelected.length) {
        const reviewState: ReviewFilter = ticket.user_reviewed
          ? "approved"
          : "pending";
        if (!reviewsSelected.includes(reviewState)) return false;
      }
      return true;
    });
  }, [
    collection.tickets,
    kindsSelected,
    query,
    reviewsSelected,
    statusesSelected,
    typesSelected,
  ]);

  const openTicket = useCallback((id: number) => {
    setPage("board");
    setSelectedId(id);
    window.history.pushState({}, "", `/tickets/${id}`);
  }, []);

  const openActivity = useCallback(() => {
    setPage("activity");
    setSelectedId(null);
    setDetail(null);
    setActivity([]);
    setActivityCursor(null);
    setActivityHasMore(false);
    window.history.pushState({}, "", "/activity");
  }, []);

  const runAction = useCallback(
    async (id: number, action: string, body?: Record<string, unknown>) => {
      try {
        await api.action(id, action, body);
        await refreshAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    },
    [refreshAll],
  );

  const moveTicket = useCallback(
    async (id: number, nextStatus: TicketStatus) => {
      const ticket = collection.tickets.find((item) => item.id === id);
      if (!ticket || ticket.status === nextStatus) return;
      try {
        await api.moveTicket(id, nextStatus);
        await refreshAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Move failed");
      }
    },
    [collection.tickets, refreshAll],
  );

  const createTicket = useCallback(
    async (data: Record<string, FormDataEntryValue>) => {
      try {
        const ticket = await api.createTicket(data);
        openTicket(ticket.id);
        await refreshAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    },
    [openTicket, refreshAll],
  );

  const saveTicket = useCallback(
    async (id: number, data: Record<string, FormDataEntryValue | string>) => {
      try {
        await api.updateTicket(id, data);
        await refreshAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [refreshAll],
  );

  const deleteTicket = useCallback(
    async (id: number) => {
      const ticket = collection.tickets.find((item) => item.id === id);
      const childCount = collection.tickets.filter(
        (item) => item.parent_id === id,
      ).length;
      const label = ticket
        ? `${ticketCode(ticket)} ${ticket.title}`
        : `ticket ${id}`;
      const scope = childCount
        ? ` and its ${childCount} child ticket(s) (including their descendants)`
        : "";
      if (
        !window.confirm(
          `Delete ${label}${scope}? Activity history is kept for the audit trail.`,
        )
      )
        return;
      try {
        await api.deleteTicket(id, childCount > 0);
        if (selectedIdRef.current === id) backToBoard();
        await refreshTickets();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [backToBoard, collection.tickets, refreshTickets],
  );

  return (
    <main className="min-h-screen px-14 bg-[linear-gradient(180deg,#fafafa_0%,#f4f4f5_46%,#eeeeee_100%)] font-sans text-neutral-900">
      <div className="mx-auto w-full py-5">
        <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <span className="block font-mono text-xs font-bold uppercase tracking-normal text-violet-700">
              Local Task Management
            </span>
            <h1 className="my-1 break-words text-3xl font-bold leading-tight text-neutral-950">
              Vibe Kanban
            </h1>
            <p className="m-0 max-w-3xl break-words text-sm leading-6 text-neutral-500">
              Agent tickets, reviewed plans, implementation progress, and Git
              trace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              className={`${buttonClass} ${secondaryButtonClass}`}
              type="button"
              onClick={openActivity}
            >
              Activity logs
            </button>
            <button
              className={`${buttonClass} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`}
              type="button"
              onClick={refreshAll}
            >
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 wrap-break-word rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}
        <ToastStack
          toasts={toasts}
          onOpen={openTicket}
          onDismiss={dismissToast}
        />

        {page === "activity" ? (
          <ActivityPage
            events={activity}
            hasMore={activityHasMore}
            loading={activityLoading}
            onLoadMore={loadMoreActivity}
            onBack={backToBoard}
            onOpen={openTicket}
          />
        ) : selectedId && detail ? (
          <TicketDetailPage
            ticket={detail}
            tickets={collection.tickets}
            statuses={collection.statuses}
            types={collection.types}
            kinds={collection.kinds}
            onBack={backToBoard}
            onOpen={openTicket}
            onMove={moveTicket}
            onAction={runAction}
            onSave={saveTicket}
            onDelete={deleteTicket}
          />
        ) : (
          <>
            <Summary tickets={filteredTickets} statuses={collection.statuses} />
            <Filters
              query={query}
              typesSelected={typesSelected}
              kindsSelected={kindsSelected}
              statusesSelected={statusesSelected}
              reviewsSelected={reviewsSelected}
              groupBy={groupBy}
              types={collection.types}
              kinds={collection.kinds}
              statuses={collection.statuses}
              onQuery={setQuery}
              onTypes={setTypesSelected}
              onKinds={setKindsSelected}
              onStatuses={setStatusesSelected}
              onReviews={setReviewsSelected}
              onGroupBy={setGroupBy}
            />
            <TicketComposer
              types={collection.types}
              kinds={collection.kinds}
              tickets={collection.tickets}
              onCreate={createTicket}
            />
            <section
              className="mb-4 inline-flex w-full items-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm sm:w-auto"
              aria-label="Ticket view"
            >
              {(["kanban", "list", "graph"] as const).map((view) => (
                <button
                  className={`min-h-9 flex-1 rounded-xl px-4 text-sm font-bold capitalize transition sm:min-w-24 ${boardView === view ? "bg-violet-600 text-white shadow-sm shadow-violet-900/20" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}
                  key={view}
                  type="button"
                  onClick={() => setBoardView(view)}
                >
                  {view}
                </button>
              ))}
            </section>
            {boardView === "kanban" ? (
              <KanbanBoard
                tickets={filteredTickets}
                allTickets={collection.tickets}
                statuses={collection.statuses}
                types={collection.types}
                kinds={collection.kinds}
                groupBy={groupBy}
                onOpen={openTicket}
                onMove={moveTicket}
                onAction={runAction}
              />
            ) : boardView === "list" ? (
              <HierarchyPage
                tickets={filteredTickets}
                allTickets={collection.tickets}
                onOpen={openTicket}
              />
            ) : (
              <MindMapPage tickets={filteredTickets} onOpen={openTicket} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
