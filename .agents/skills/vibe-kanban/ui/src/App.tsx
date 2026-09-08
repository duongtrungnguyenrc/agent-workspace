import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { GroupBy, ReviewFilter, TicketCollection, TicketDetail, TicketListItem, TicketStatus, TicketType } from "./types/kanban";
import { Filters } from "./components/Filters";
import { ActivityPage } from "./components/ActivityPage";
import { HierarchyPage } from "./components/HierarchyPage";
import { KanbanBoard } from "./components/KanbanBoard";
import { MindMapPage } from "./components/MindMapPage";
import { Summary } from "./components/Summary";
import { TicketComposer } from "./components/TicketComposer";
import { TicketDetailPage } from "./components/TicketDetailPage";
import { ToastStack } from "./components/ToastStack";
import { useSocketTickets } from "./hooks/useSocketTickets";
import { ticketCode } from "./lib/format";
import { buttonClass, secondaryButtonClass } from "./lib/styles";
import type { ActivityEvent, TicketChangeEvent } from "./types/kanban";

const defaultCollection: TicketCollection = {
  statuses: ["open", "in_progress", "hold", "cancelled", "in_review", "closed"],
  types: ["US", "use_case", "task", "uat_feedback", "qc_feedback"],
  tickets: [],
};

function selectedIdFromPath() {
  const match = window.location.pathname.match(/^\/tickets\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function pageFromPath() {
  return window.location.pathname === "/activity" ? "activity" : "board";
}

export default function App() {
  const [collection, setCollection] = useState<TicketCollection>(defaultCollection);
  const [selectedId, setSelectedId] = useState<number | null>(selectedIdFromPath);
  const [page, setPage] = useState<"board" | "activity">(pageFromPath);
  const [boardView, setBoardView] = useState<"kanban" | "list" | "graph">("kanban");
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [query, setQuery] = useState("");
  const [typesSelected, setTypesSelected] = useState<TicketType[]>([]);
  const [statusesSelected, setStatusesSelected] = useState<TicketStatus[]>([]);
  const [reviewsSelected, setReviewsSelected] = useState<ReviewFilter[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; detail?: string }>>([]);

  const pushToast = useCallback((message: string, detail?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current.slice(-2), { id, message, detail }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  const refreshTickets = useCallback(async () => {
    try {
      setCollection(await api.tickets());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    }
  }, []);

  const refreshDetail = useCallback(async (id: number | null) => {
    if (!id) {
      setDetail(null);
      return;
    }
    try {
      setDetail(await api.ticket(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    }
  }, []);

  const refreshActivity = useCallback(async () => {
    try {
      const data = await api.activity();
      setActivity(data.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshTickets();
    await refreshDetail(selectedId);
    if (page === "activity") await refreshActivity();
  }, [page, refreshActivity, refreshDetail, refreshTickets, selectedId]);

  const handleSocketChange = useCallback(
    (event: TicketChangeEvent) => {
      if (event.ticket_id) {
        const ticket = collection.tickets.find((item) => item.id === event.ticket_id);
        pushToast("Ticket updated", ticket ? ticketCode(ticket) : `ticket-${event.ticket_id}`);
      } else {
        pushToast("Tickets updated", "SQLite change detected");
      }
      refreshAll();
    },
    [collection.tickets, pushToast, refreshAll],
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
        ticket.status,
        ticket.branch,
        ticket.pr_url,
        ticket.pr_number,
        ticket.pr_status,
        ticket.pipeline_status,
        ticket.pipeline_url,
        ticket.action_items,
        ticket.specification,
        ticket.execution_plan,
        ticket.source_type,
        ticket.source_id,
      ]
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (typesSelected.length && !typesSelected.includes(ticket.type)) return false;
      if (statusesSelected.length && !statusesSelected.includes(ticket.status)) return false;
      if (reviewsSelected.length) {
        const reviewState: ReviewFilter = ticket.user_reviewed ? "approved" : "pending";
        if (!reviewsSelected.includes(reviewState)) return false;
      }
      return true;
    });
  }, [collection.tickets, query, reviewsSelected, statusesSelected, typesSelected]);

  const openTicket = useCallback((id: number) => {
    setPage("board");
    setSelectedId(id);
    window.history.pushState({}, "", `/tickets/${id}`);
  }, []);

  const backToBoard = useCallback(() => {
    setPage("board");
    setSelectedId(null);
    setDetail(null);
    window.history.pushState({}, "", "/");
  }, []);

  const openActivity = useCallback(() => {
    setPage("activity");
    setSelectedId(null);
    setDetail(null);
    window.history.pushState({}, "", "/activity");
  }, []);

  const runAction = useCallback(
    async (id: number, action: string) => {
      try {
        await api.action(id, action);
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafafa_0%,#f4f4f5_46%,#eeeeee_100%)] font-sans text-neutral-900">
      <div className="mx-auto w-[min(1480px,calc(100vw-32px))] py-5">
        <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm backdrop-blur md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <span className="block font-mono text-xs font-bold uppercase tracking-normal text-violet-700">Local Task Management</span>
            <h1 className="my-1 break-words text-3xl font-bold leading-tight text-neutral-950">Vibe Kanban</h1>
            <p className="m-0 max-w-3xl break-words text-sm leading-6 text-neutral-500">Agent tickets, reviewed plans, implementation progress, and Git trace.</p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button className={`${buttonClass} ${secondaryButtonClass}`} type="button" onClick={openActivity}>
              Activity logs
            </button>
            <button className={`${buttonClass} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`} type="button" onClick={refreshAll}>
              Refresh
            </button>
          </div>
        </header>

      {error ? <div className="mb-4 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</div> : null}
      <ToastStack toasts={toasts} />

      {page === "activity" ? (
        <ActivityPage events={activity} onBack={backToBoard} onOpen={openTicket} />
      ) : selectedId && detail ? (
        <TicketDetailPage
          ticket={detail}
          tickets={collection.tickets}
          statuses={collection.statuses}
          types={collection.types}
          onBack={backToBoard}
          onOpen={openTicket}
          onMove={moveTicket}
          onAction={runAction}
          onSave={saveTicket}
        />
      ) : (
        <>
          <Summary tickets={filteredTickets} statuses={collection.statuses} />
          <Filters
            query={query}
            typesSelected={typesSelected}
            statusesSelected={statusesSelected}
            reviewsSelected={reviewsSelected}
            groupBy={groupBy}
            types={collection.types}
            statuses={collection.statuses}
            onQuery={setQuery}
            onTypes={setTypesSelected}
            onStatuses={setStatusesSelected}
            onReviews={setReviewsSelected}
            onGroupBy={setGroupBy}
          />
          <TicketComposer types={collection.types} tickets={collection.tickets} onCreate={createTicket} />
          <section className="mb-4 inline-flex w-full items-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm sm:w-auto" aria-label="Ticket view">
            <button
              className={`min-h-9 flex-1 rounded-xl px-4 text-sm font-bold transition sm:min-w-24 ${boardView === "kanban" ? "bg-violet-600 text-white shadow-sm shadow-violet-900/20" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}
              type="button"
              onClick={() => setBoardView("kanban")}
            >
              Kanban
            </button>
            <button
              className={`min-h-9 flex-1 rounded-xl px-4 text-sm font-bold transition sm:min-w-24 ${boardView === "list" ? "bg-violet-600 text-white shadow-sm shadow-violet-900/20" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}
              type="button"
              onClick={() => setBoardView("list")}
            >
              List
            </button>
            <button
              className={`min-h-9 flex-1 rounded-xl px-4 text-sm font-bold transition sm:min-w-24 ${boardView === "graph" ? "bg-violet-600 text-white shadow-sm shadow-violet-900/20" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}
              type="button"
              onClick={() => setBoardView("graph")}
            >
              Graph
            </button>
          </section>
          {boardView === "kanban" ? (
            <KanbanBoard
              tickets={filteredTickets}
              allTickets={collection.tickets}
              statuses={collection.statuses}
              types={collection.types}
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
      </div>
    </main>
  );
}
