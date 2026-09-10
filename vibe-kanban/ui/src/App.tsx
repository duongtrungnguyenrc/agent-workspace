import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircleIcon, HistoryIcon, KanbanSquareIcon, PlusIcon, RotateCwIcon } from "lucide-react";
import { toast } from "sonner";
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
import { ActivityPage } from "./components/ActivityPage";
import { Filters, type BoardView } from "./components/Filters";
import { FloatingPlanStepper } from "./components/FloatingPlanStepper";
import { HierarchyPage } from "./components/HierarchyPage";
import { KanbanBoard } from "./components/KanbanBoard";
import { MindMapPage } from "./components/MindMapPage";
import { Summary } from "./components/Summary";
import { ThemeToggle } from "./components/ThemeToggle";
import { TicketComposer } from "./components/TicketComposer";
import { TicketDetailPage } from "./components/TicketDetailPage";
import { useSocketTickets } from "./hooks/useSocketTickets";
import { eventLabel, eventSummary, eventTone } from "./lib/events";
import { formatKind, formatType, ticketCode } from "./lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ACTIVITY_PAGE_SIZE = 50;
const REFRESH_DEBOUNCE_MS = 150;

const defaultCollection: TicketCollection = {
  statuses: ["open", "in_progress", "in_review", "closed", "hold", "cancelled"],
  types: ["group", "feature", "task"],
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

function notify(event: TicketChangeEvent, open: (id: number) => void) {
  const code = ticketCode({ id: event.ticket_id, type: event.ticket_type || "group" });
  const meta = [
    event.ticket_type ? formatType(event.ticket_type) : "",
    event.ticket_kind ? formatKind(event.ticket_kind) : "",
    event.actor,
    event.source === "sqlite" ? "via CLI" : "via UI",
  ]
    .filter(Boolean)
    .join(" · ");
  const detail = [event.ticket_title, eventSummary(event.type, event.payload)].filter(Boolean).join(" — ");
  const tone = eventTone(event.type);
  const show =
    tone === "rose" ? toast.error : tone === "emerald" ? toast.success : tone === "amber" || tone === "orange" ? toast.warning : toast.info;
  show(`${eventLabel(event.type)} · ${code}`, {
    id: event.id,
    description: (
      <span className="grid gap-0.5">
        {detail ? <span className="line-clamp-3 break-words">{detail}</span> : null}
        <span className="text-[11px] opacity-70">{meta}</span>
      </span>
    ),
    action: event.ticket_exists ? { label: "Open", onClick: () => open(event.ticket_id) } : undefined,
  });
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

export default function App() {
  const [collection, setCollection] = useState<TicketCollection>(defaultCollection);
  const [selectedId, setSelectedId] = useState<number | null>(selectedIdFromPath);
  const [page, setPage] = useState<"board" | "activity">(pageFromPath);
  const [boardView, setBoardView] = useState<BoardView>("kanban");
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoredTicket, setMonitoredTicket] = useState<TicketDetail | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const selectedIdRef = useRef(selectedId);
  const activityLoadingRef = useRef(false);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

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

  const openTicket = useCallback((id: number) => {
    setPage("board");
    setSelectedId(id);
    window.history.pushState({}, "", `/tickets/${id}`);
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
        const message = err instanceof Error ? err.message : "Failed to load ticket";
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
        const contiguous = current.length > 0 && oldestIncoming !== undefined && oldestIncoming <= current[0].id + 1;
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
    if (activityLoadingRef.current || !activityHasMore || !activityCursor) return;
    activityLoadingRef.current = true;
    setActivityLoading(true);
    try {
      const data = await api.activity({ limit: ACTIVITY_PAGE_SIZE, before: activityCursor });
      setActivity((current) => mergeEvents(current, data.events));
      setActivityCursor(data.next_cursor);
      setActivityHasMore(data.has_more);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load older activity");
    } finally {
      activityLoadingRef.current = false;
      setActivityLoading(false);
    }
  }, [activityCursor, activityHasMore]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshTickets();
      await refreshDetail(selectedId);
      if (page === "activity") await refreshActivity();
    } finally {
      setRefreshing(false);
    }
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
      notify(event, openTicket);
      if (event.type === "ticket.progress_logged" && event.payload.step_status) {
        api.ticket(event.ticket_id).then(setMonitoredTicket).catch(() => undefined);
      } else if (monitoredTicket?.id === event.ticket_id) {
        api.ticket(event.ticket_id).then(setMonitoredTicket).catch(() => setMonitoredTicket(null));
      }
      if (event.type === "ticket.deleted" && event.ticket_id === selectedIdRef.current) backToBoard();
      scheduleRefresh();
    },
    [backToBoard, monitoredTicket?.id, openTicket, scheduleRefresh],
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
      if (typesSelected.length && !typesSelected.includes(ticket.type)) return false;
      if (kindsSelected.length && (!ticket.kind || !kindsSelected.includes(ticket.kind))) return false;
      if (statusesSelected.length && !statusesSelected.includes(ticket.status)) return false;
      if (reviewsSelected.length) {
        const reviewState: ReviewFilter = ticket.user_reviewed ? "approved" : "pending";
        if (!reviewsSelected.includes(reviewState)) return false;
      }
      return true;
    });
  }, [collection.tickets, kindsSelected, query, reviewsSelected, statusesSelected, typesSelected]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setTypesSelected([]);
    setKindsSelected([]);
    setStatusesSelected([]);
    setReviewsSelected([]);
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
        setComposerOpen(false);
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
      const childCount = collection.tickets.filter((item) => item.parent_id === id).length;
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

  const navClass = (active: boolean) =>
    cn("h-8 gap-1.5 px-2.5 text-muted-foreground", active && "bg-accent text-foreground");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-4 py-2.5 sm:px-6">
          <button className="flex min-w-0 items-center gap-2.5 rounded-md text-left" type="button" onClick={backToBoard}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30">
              <KanbanSquareIcon className="size-4" />
            </span>
            <span className="min-w-0 max-sm:hidden">
              <span className="block truncate text-sm font-semibold leading-tight">Vibe Kanban</span>
              <span className="block truncate text-[11px] leading-tight text-muted-foreground">Agent tickets · plans · trace</span>
            </span>
          </button>
          <nav className="ml-3 flex items-center gap-1" aria-label="Pages">
            <Button variant="ghost" size="sm" className={navClass(page === "board")} onClick={backToBoard}>
              <KanbanSquareIcon /> Board
            </Button>
            <Button variant="ghost" size="sm" className={navClass(page === "activity")} onClick={openActivity}>
              <HistoryIcon /> Activity
            </Button>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Refresh" onClick={refreshAll} disabled={refreshing}>
                  <RotateCwIcon className={cn(refreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <ThemeToggle />
            <Button size="sm" className="ml-1" onClick={() => setComposerOpen(true)}>
              <PlusIcon /> <span className="max-sm:hidden">New ticket</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-6">
        {error ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
            <button className="ml-auto text-xs underline-offset-2 hover:underline" type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        {page === "activity" ? (
          <ActivityPage
            events={activity}
            hasMore={activityHasMore}
            loading={activityLoading}
            onLoadMore={loadMoreActivity}
            onBack={backToBoard}
            onOpen={openTicket}
          />
        ) : selectedId ? (
          detail && detail.id === selectedId ? (
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
            <DetailSkeleton />
          )
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
              view={boardView}
              shown={filteredTickets.length}
              total={collection.tickets.length}
              onQuery={setQuery}
              onTypes={setTypesSelected}
              onKinds={setKindsSelected}
              onStatuses={setStatusesSelected}
              onReviews={setReviewsSelected}
              onGroupBy={setGroupBy}
              onView={setBoardView}
              onReset={resetFilters}
            />
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
              <HierarchyPage tickets={filteredTickets} allTickets={collection.tickets} onOpen={openTicket} />
            ) : (
              <MindMapPage tickets={filteredTickets} onOpen={openTicket} />
            )}
          </>
        )}
      </main>

      <FloatingPlanStepper ticket={monitoredTicket} onOpen={openTicket} onClose={() => setMonitoredTicket(null)} />
      <TicketComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        types={collection.types}
        kinds={collection.kinds}
        tickets={collection.tickets}
        onCreate={createTicket}
      />
    </div>
  );
}
