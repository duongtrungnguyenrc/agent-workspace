export type TicketStatus = "open" | "in_progress" | "hold" | "cancelled" | "in_review" | "closed";
export type TicketType = "US" | "use_case" | "task" | "uat_feedback" | "qc_feedback";
export type ReviewFilter = "" | "approved" | "pending";
export type GroupBy = "status" | "type" | "review" | "branch" | "parent";

export interface TicketListItem {
  id: number;
  parent_id: number | null;
  title: string;
  type: TicketType;
  status: TicketStatus;
  user_reviewed: boolean;
  progress_percent: number | null;
  raw_requirement: string;
  specification: string;
  execution_plan: string;
  source_type: string | null;
  source_id: string | null;
  source_url: string | null;
  source_snapshot: string;
  branch: string | null;
  base_commit: string | null;
  head_commit: string | null;
  pr_url: string | null;
  pr_number: string | null;
  pr_status: string | null;
  pipeline_status: string | null;
  pipeline_url: string | null;
  action_items: string;
  created_at: string;
  updated_at: string;
}

export interface TicketRevision {
  id: number;
  ticket_id: number;
  kind: string;
  content: string;
  created_at: string;
}

export interface TicketCommit {
  id: number;
  ticket_id: number;
  commit_hash: string;
  parent_hash: string | null;
  branch: string | null;
  message: string | null;
  author: string | null;
  created_at: string;
}

export interface TicketEvent {
  id: number;
  ticket_id: number;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ActivityEvent extends TicketEvent {
  ticket_title: string | null;
  ticket_type: TicketType | null;
  ticket_status: TicketStatus | null;
}

export interface ActivityCollection {
  events: ActivityEvent[];
}

export interface TicketChangeEvent {
  ticket_id?: number;
  status?: TicketStatus;
  updated_at: string;
  source?: "api" | "sqlite";
}

export interface TicketDetail extends TicketListItem {
  parent: Pick<TicketListItem, "id" | "parent_id" | "title" | "type" | "status" | "user_reviewed"> | null;
  children: Array<Pick<TicketListItem, "id" | "parent_id" | "title" | "type" | "status" | "user_reviewed">>;
  revisions: TicketRevision[];
  commits: TicketCommit[];
  events: TicketEvent[];
}

export interface TicketCollection {
  statuses: TicketStatus[];
  types: TicketType[];
  tickets: TicketListItem[];
}
