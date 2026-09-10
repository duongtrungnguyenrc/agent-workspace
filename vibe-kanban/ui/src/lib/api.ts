import type { ActivityCollection, DeleteResult, TicketCollection, TicketDetail } from "../types/kanban";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || response.statusText);
  }
  return data as T;
}

export const api = {
  tickets: () => request<TicketCollection>("/api/tickets"),
  activity: (params: { limit?: number; before?: number | null } = {}) => {
    const search = new URLSearchParams();
    if (params.limit) search.set("limit", String(params.limit));
    if (params.before) search.set("before", String(params.before));
    const query = search.toString();
    return request<ActivityCollection>(`/api/activity${query ? `?${query}` : ""}`);
  },
  ticket: (id: number) => request<TicketDetail>(`/api/tickets/${id}`),
  createTicket: (body: Record<string, FormDataEntryValue>) =>
    request<TicketDetail>("/api/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  updateTicket: (id: number, body: Record<string, FormDataEntryValue | string>) =>
    request<TicketDetail>(`/api/tickets/${id}/update`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  deleteTicket: (id: number, cascade: boolean) =>
    request<DeleteResult>(`/api/tickets/${id}/delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cascade }),
    }),
  action: (id: number, action: string, body?: Record<string, unknown>) =>
    request<TicketDetail>(`/api/tickets/${id}/${action}`, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  moveTicket: (id: number, status: string) =>
    request<TicketDetail>(`/api/tickets/${id}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
};
