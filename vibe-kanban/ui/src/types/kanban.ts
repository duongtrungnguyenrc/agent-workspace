export type TicketStatus =
  | "open"
  | "in_progress"
  | "hold"
  | "cancelled"
  | "in_review"
  | "closed";
export type TicketType = "group" | "feature" | "task";
export type TicketKind =
  | "feature"
  | "bugfix"
  | "refactor"
  | "chore"
  | "docs"
  | "test";
export type ReviewFilter = "" | "approved" | "pending";
export type GroupBy =
  | "status"
  | "type"
  | "kind"
  | "review"
  | "branch"
  | "parent";

export interface SourceEvidence {
  type: "link" | "image";
  url: string;
  label?: string;
  description?: string;
}

export type PlanStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked";

export interface PlanStep {
  id: number;
  position: number;
  title: string;
  status: PlanStepStatus;
  detail: string;
  updated_at: string;
}

export interface TicketListItem {
  id: number;
  parent_id: number | null;
  title: string;
  type: TicketType;
  kind: TicketKind | null;
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
  source_evidence: SourceEvidence[];
  user_comments: string;
  open_questions: string;
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

export type TicketSummary = Pick<
  TicketListItem,
  "id" | "parent_id" | "title" | "type" | "kind" | "status" | "user_reviewed"
>;

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
  url: string | null;
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
  ticket_exists: boolean;
  ticket_title: string | null;
  ticket_type: TicketType | null;
  ticket_kind: TicketKind | null;
  ticket_status: TicketStatus | null;
}

export interface ActivityCollection {
  events: ActivityEvent[];
  has_more: boolean;
  next_cursor: number | null;
}

export interface TicketChangeEvent extends ActivityEvent {
  source: "api" | "sqlite";
  updated_at: string;
}

export interface DeleteResult {
  deleted: true;
  ticket_id: number;
  deleted_tickets: TicketSummary[];
}

export interface TicketDetail extends TicketListItem {
  parent: TicketSummary | null;
  children: TicketSummary[];
  revisions: TicketRevision[];
  commits: TicketCommit[];
  plan_steps: PlanStep[];
  events: TicketEvent[];
}

export interface TicketCollection {
  statuses: TicketStatus[];
  types: TicketType[];
  kinds: TicketKind[];
  tickets: TicketListItem[];
}
