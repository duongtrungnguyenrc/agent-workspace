import { useEffect, useState } from "react";
import { eventLabel, eventSummary } from "../lib/events";
import {
  formatKind,
  formatStatus,
  formatType,
  progressFor,
  ticketCode,
} from "../lib/format";
import { Markdown } from "../lib/markdown";
import {
  buttonClass,
  buttonTone,
  fieldClass,
  inputClass,
  kindTone,
  mutedTextClass,
  panelClass,
  secondaryButtonClass,
  selectClass,
  statusTone,
  textareaClass,
  ticketCodeClass,
  typeTone,
} from "../lib/styles";
import type {
  TicketDetail,
  TicketKind,
  TicketListItem,
  TicketStatus,
  TicketType,
} from "../types/kanban";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";

interface TicketDetailPageProps {
  ticket: TicketDetail;
  tickets: TicketListItem[];
  statuses: TicketStatus[];
  types: TicketType[];
  kinds: TicketKind[];
  onBack: () => void;
  onOpen: (id: number) => void;
  onMove: (id: number, status: TicketStatus) => Promise<void>;
  onAction: (
    id: number,
    action: string,
    body?: Record<string, unknown>,
  ) => Promise<void>;
  onSave: (
    id: number,
    data: Record<string, FormDataEntryValue | string>,
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function eligibleParents(
  type: TicketType,
  tickets: TicketListItem[],
  excludeId: number,
) {
  if (type === "use_case")
    return tickets.filter(
      (ticket) => ticket.type === "US" && ticket.id !== excludeId,
    );
  if (type === "task")
    return tickets.filter(
      (ticket) =>
        ["US", "use_case", "uat_feedback", "qc_feedback"].includes(
          ticket.type,
        ) && ticket.id !== excludeId,
    );
  if (type === "uat_feedback" || type === "qc_feedback")
    return tickets.filter(
      (ticket) => ticket.type === "US" && ticket.id !== excludeId,
    );
  return [];
}

function Property({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-neutral-100 py-2 last:border-b-0 max-sm:grid-cols-1 max-sm:gap-1">
      <span className="text-xs font-bold uppercase text-neutral-500">
        {label}
      </span>
      <strong className="min-w-0 break-words text-sm font-semibold text-neutral-900">
        {value || "None"}
      </strong>
    </div>
  );
}

function textValue(value: string | null | undefined) {
  return value || "";
}

function ActionButton({
  id,
  action,
  label,
  disabled,
  title,
  onAction,
}: {
  id: number;
  action: string;
  label: string;
  disabled?: boolean;
  title?: string;
  onAction: (id: number, action: string) => Promise<void>;
}) {
  return (
    <button
      className={`${buttonClass} ${disabled ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400" : buttonTone(action)}`}
      disabled={disabled}
      title={title}
      type="button"
      onClick={() => onAction(id, action)}
    >
      {label}
    </button>
  );
}

export function TicketDetailPage({
  ticket,
  tickets,
  statuses,
  types,
  kinds,
  onBack,
  onOpen,
  onMove,
  onAction,
  onSave,
  onDelete,
}: TicketDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<TicketType>(ticket.type);
  const [comment, setComment] = useState("");
  const parents = eligibleParents(editType, tickets, ticket.id);
  const progress = progressFor(ticket);
  const isTask = ticket.type === "task";
  const needsApproval = isTask && !ticket.user_reviewed;
  const specification = textValue(ticket.specification);
  const executionPlan = textValue(ticket.execution_plan);
  const sourceSnapshot = textValue(ticket.source_snapshot);
  const actionItems = textValue(ticket.action_items);
  const userComments = textValue(ticket.user_comments);
  const openQuestions = textValue(ticket.open_questions);
  const hasExecutionPlan = executionPlan.trim().length > 0;

  useEffect(() => {
    setIsEditing(false);
    setEditType(ticket.type);
    setComment("");
  }, [ticket.id, ticket.type]);

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
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone={typeTone[ticket.type]}>
              {formatType(ticket.type)}
            </Badge>
            {ticket.kind ? (
              <Badge tone={kindTone[ticket.kind]}>
                {formatKind(ticket.kind)}
              </Badge>
            ) : null}
            <Badge tone={statusTone[ticket.status]}>
              {formatStatus(ticket.status)}
            </Badge>
            <Badge tone={ticket.user_reviewed ? "emerald" : "orange"}>
              {ticket.user_reviewed ? "Approved" : "Needs review"}
            </Badge>
          </div>
          <span className={`${ticketCodeClass} mt-3`}>
            {ticketCode(ticket)}
          </span>
          <h1 className="my-1 break-words text-3xl font-bold leading-tight text-neutral-950">
            {ticket.title}
          </h1>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:min-w-64 md:justify-end">
          <label className={fieldClass}>
            <span>Status</span>
            <select
              className={selectClass}
              value={ticket.status}
              onChange={(event) =>
                onMove(ticket.id, event.target.value as TicketStatus)
              }
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {needsApproval ? (
              <ActionButton
                id={ticket.id}
                action="approve"
                label="Approve"
                disabled={!hasExecutionPlan}
                title={
                  hasExecutionPlan
                    ? "Approve this task for implementation"
                    : "Add an execution plan before approval"
                }
                onAction={onAction}
              />
            ) : null}
            <button
              className={`${buttonClass} ${secondaryButtonClass}`}
              type="button"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? "Close editor" : "Edit"}
            </button>
            <button
              className={`${buttonClass} border-rose-200 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50`}
              title={
                ticket.children.length
                  ? "Deletes this ticket and its child tickets"
                  : "Delete this ticket"
              }
              type="button"
              onClick={() => onDelete(ticket.id)}
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      <section className={panelClass}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-bold text-neutral-950">
              Implementation progress
            </h2>
            <p className="m-0 text-sm leading-6 text-neutral-500">
              Status-aware progress for the current task flow.
            </p>
          </div>
          <strong className="text-lg font-bold text-violet-700">
            {progress}%
          </strong>
        </div>
        <ProgressBar percent={progress} tone={statusTone[ticket.status]} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <section className={panelClass}>
            <h2 className="mb-3 text-base font-bold text-neutral-950">
              Properties
            </h2>
            <Property label="Code" value={ticketCode(ticket)} />
            <Property label="Type" value={formatType(ticket.type)} />
            <Property
              label="Kind"
              value={ticket.kind ? formatKind(ticket.kind) : null}
            />
            <Property label="Status" value={formatStatus(ticket.status)} />
            <Property
              label="Review"
              value={ticket.user_reviewed ? "Approved" : "Needs review"}
            />
            <Property
              label="Parent"
              value={
                ticket.parent
                  ? `${ticketCode(ticket.parent)} ${ticket.parent.title}`
                  : "None"
              }
            />
            <Property label="Branch" value={ticket.branch} />
            <Property label="Base commit" value={ticket.base_commit} />
            <Property label="Head commit" value={ticket.head_commit} />
            <Property
              label="PR"
              value={ticket.pr_url || ticket.pr_number || "None"}
            />
            <Property label="PR status" value={ticket.pr_status} />
            <Property label="Pipeline" value={ticket.pipeline_status} />
          </section>

          {openQuestions.trim() ? (
            <section className={panelClass}>
              <h2 className="mb-3 text-base font-bold text-neutral-950">
                Open questions
              </h2>
              <Markdown value={openQuestions} />
            </section>
          ) : null}

          <section className={panelClass}>
            <h2 className="mb-3 text-base font-bold text-neutral-950">
              Child tickets
            </h2>
            {ticket.children.length ? (
              <div className="grid gap-2">
                {ticket.children.map((child) => (
                  <button
                    className="grid min-w-0 gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50"
                    key={child.id}
                    type="button"
                    onClick={() => onOpen(child.id)}
                  >
                    <span className={ticketCodeClass}>{ticketCode(child)}</span>
                    <strong className="min-w-0 truncate text-sm font-bold text-neutral-950">
                      {child.title}
                    </strong>
                    <span className="text-xs font-semibold text-neutral-500">
                      {formatStatus(child.status)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className={mutedTextClass}>No child tickets.</p>
            )}
          </section>

          <section className={panelClass}>
            <h2 className="mb-3 text-base font-bold text-neutral-950">
              Source ticket
            </h2>
            <Property label="Source type" value={ticket.source_type} />
            <Property label="Source id" value={ticket.source_id} />
            <Property label="Source URL" value={ticket.source_url} />
            <p className="mt-3 max-h-44 overflow-auto rounded-lg bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">
              {sourceSnapshot || "No source snapshot provided."}
            </p>
          </section>
        </aside>

        <main className="grid min-w-0 gap-4">
          {isEditing ? (
            <form
              className={`${panelClass} grid gap-3`}
              onSubmit={async (event) => {
                event.preventDefault();
                const data = Object.fromEntries(
                  new FormData(event.currentTarget).entries(),
                );
                if (!data.parent_id) data.parent_id = "";
                if (data.progress_percent === "") delete data.progress_percent;
                await onSave(ticket.id, data);
                setIsEditing(false);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-bold text-neutral-950">
                    Edit ticket
                  </h2>
                  <p className="m-0 text-sm leading-6 text-neutral-500">
                    Change ticket metadata and content.
                  </p>
                </div>
                <button
                  className={`${buttonClass} ${secondaryButtonClass}`}
                  type="button"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
              <div className="grid gap-3 xl:grid-cols-[1fr_140px_140px_1fr_120px]">
                <label className={fieldClass}>
                  <span>Title</span>
                  <input
                    className={inputClass}
                    name="title"
                    defaultValue={ticket.title}
                  />
                </label>
                <label className={fieldClass}>
                  <span>Type</span>
                  <select
                    className={selectClass}
                    name="type"
                    value={editType}
                    onChange={(event) =>
                      setEditType(event.target.value as TicketType)
                    }
                  >
                    {types.map((item) => (
                      <option key={item} value={item}>
                        {formatType(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldClass}>
                  <span>Kind</span>
                  <select
                    className={selectClass}
                    name="kind"
                    defaultValue={ticket.kind || ""}
                  >
                    <option value="">None</option>
                    {kinds.map((item) => (
                      <option key={item} value={item}>
                        {formatKind(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldClass}>
                  <span>Parent</span>
                  <select
                    className={selectClass}
                    name="parent_id"
                    defaultValue={ticket.parent_id || ""}
                  >
                    <option value="">None</option>
                    {parents.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {ticketCode(candidate)} - {candidate.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldClass}>
                  <span>Progress</span>
                  <input
                    className={inputClass}
                    name="progress_percent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={ticket.progress_percent ?? ""}
                  />
                </label>
              </div>
              <div
                className={`grid gap-3 ${editType === "task" ? "xl:grid-cols-2" : ""}`}
              >
                <label className={fieldClass}>
                  <span>Specification</span>
                  <textarea
                    className={textareaClass}
                    name="specification"
                    rows={10}
                    defaultValue={specification}
                  />
                </label>
                {editType === "task" ? (
                  <label className={fieldClass}>
                    <span>Execution plan</span>
                    <textarea
                      className={textareaClass}
                      name="execution_plan"
                      rows={10}
                      defaultValue={executionPlan}
                    />
                  </label>
                ) : null}
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                <label className={fieldClass}>
                  <span>Source type</span>
                  <input
                    className={inputClass}
                    name="source_type"
                    defaultValue={ticket.source_type || ""}
                  />
                </label>
                <label className={fieldClass}>
                  <span>Source id</span>
                  <input
                    className={inputClass}
                    name="source_id"
                    defaultValue={ticket.source_id || ""}
                  />
                </label>
                <label className={fieldClass}>
                  <span>Source URL</span>
                  <input
                    className={inputClass}
                    name="source_url"
                    defaultValue={ticket.source_url || ""}
                  />
                </label>
              </div>
              <label className={fieldClass}>
                <span>Source snapshot</span>
                <textarea
                  className={textareaClass}
                  name="source_snapshot"
                  rows={5}
                  defaultValue={sourceSnapshot}
                />
              </label>
              <div className="grid gap-3 xl:grid-cols-3">
                <label className={fieldClass}>
                  <span>PR URL</span>
                  <input
                    className={inputClass}
                    name="pr_url"
                    defaultValue={ticket.pr_url || ""}
                  />
                </label>
                <label className={fieldClass}>
                  <span>PR number</span>
                  <input
                    className={inputClass}
                    name="pr_number"
                    defaultValue={ticket.pr_number || ""}
                  />
                </label>
                <label className={fieldClass}>
                  <span>PR status</span>
                  <input
                    className={inputClass}
                    name="pr_status"
                    defaultValue={ticket.pr_status || ""}
                  />
                </label>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <label className={fieldClass}>
                  <span>Pipeline status</span>
                  <input
                    className={inputClass}
                    name="pipeline_status"
                    defaultValue={ticket.pipeline_status || ""}
                  />
                </label>
                <label className={fieldClass}>
                  <span>Pipeline URL</span>
                  <input
                    className={inputClass}
                    name="pipeline_url"
                    defaultValue={ticket.pipeline_url || ""}
                  />
                </label>
              </div>
              <label className={fieldClass}>
                <span>Action items</span>
                <textarea
                  className={textareaClass}
                  name="action_items"
                  rows={4}
                  defaultValue={actionItems}
                />
              </label>
              <div className="grid gap-3 xl:grid-cols-2">
                <label className={fieldClass}>
                  <span>User comments</span>
                  <textarea
                    className={textareaClass}
                    name="user_comments"
                    rows={5}
                    defaultValue={userComments}
                  />
                </label>
                <label className={fieldClass}>
                  <span>Open questions</span>
                  <textarea
                    className={textareaClass}
                    name="open_questions"
                    rows={5}
                    defaultValue={openQuestions}
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  className={`${buttonClass} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`}
                  type="submit"
                >
                  Save changes
                </button>
              </div>
            </form>
          ) : null}

          <section className={panelClass}>
            <h2 className="mb-3 text-base font-bold text-neutral-950">
              Ticket specification
            </h2>
            <Markdown value={specification} />
          </section>
          {isTask ? (
            <section className={panelClass}>
              <h2 className="mb-3 text-base font-bold text-neutral-950">
                Execution plan
              </h2>
              <Markdown value={executionPlan} />
            </section>
          ) : null}
          {needsApproval ? (
            <section className={panelClass}>
              <h2 className="mb-3 text-base font-bold text-neutral-950">
                User review comment
              </h2>
              <form
                className="grid gap-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const value = comment.trim();
                  if (!value) return;
                  await onAction(ticket.id, "comment", {
                    comment: value,
                    actor: "user",
                  });
                  setComment("");
                }}
              >
                <textarea
                  className={textareaClass}
                  value={comment}
                  rows={4}
                  placeholder="Add feedback before approval"
                  onChange={(event) => setComment(event.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    className={`${buttonClass} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`}
                    type="submit"
                  >
                    Add comment
                  </button>
                </div>
              </form>
            </section>
          ) : null}
          {userComments.trim() ? (
            <section className={panelClass}>
              <h2 className="mb-3 text-base font-bold text-neutral-950">
                User comments
              </h2>
              <Markdown value={userComments} />
            </section>
          ) : null}
          <section className={panelClass}>
            <h2 className="mb-3 text-base font-bold text-neutral-950">
              Git commits
            </h2>
            {ticket.commits.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
                      <th className="px-3 py-2 font-bold">Hash</th>
                      <th className="px-3 py-2 font-bold">Branch</th>
                      <th className="px-3 py-2 font-bold">Message</th>
                      <th className="px-3 py-2 font-bold">Author</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticket.commits.map((commit) => (
                      <tr
                        className="border-b border-neutral-100 last:border-b-0"
                        key={commit.id}
                      >
                        <td className="px-3 py-2 font-mono text-xs text-violet-700">
                          {commit.commit_hash}
                        </td>
                        <td className="px-3 py-2 text-neutral-700">
                          {commit.branch || "None"}
                        </td>
                        <td className="px-3 py-2 text-neutral-700">
                          {commit.message || "No message"}
                        </td>
                        <td className="px-3 py-2 text-neutral-700">
                          {commit.author || "Unknown"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={mutedTextClass}>No commits recorded yet.</p>
            )}
          </section>
          <section className={panelClass}>
            <h2 className="mb-3 text-base font-bold text-neutral-950">
              PR and pipeline
            </h2>
            <div className="grid gap-0">
              <Property label="PR URL" value={ticket.pr_url} />
              <Property label="PR number" value={ticket.pr_number} />
              <Property label="PR status" value={ticket.pr_status} />
              <Property label="Pipeline" value={ticket.pipeline_status} />
              <Property label="Pipeline URL" value={ticket.pipeline_url} />
            </div>
            {actionItems.trim() ? (
              <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                <h3 className="m-0 mb-2 text-xs font-bold uppercase text-neutral-500">
                  Action items
                </h3>
                <Markdown value={actionItems} />
              </div>
            ) : null}
          </section>
          <section className={panelClass}>
            <h2 className="mb-3 text-base font-bold text-neutral-950">
              Activity history
            </h2>
            {ticket.events.length ? (
              <ol className="grid gap-3">
                {ticket.events
                  .slice()
                  .reverse()
                  .map((event) => (
                    <li
                      className="grid grid-cols-[10px_minmax(0,1fr)] gap-3"
                      key={event.id}
                    >
                      <span className="mt-2 size-2 rounded-full bg-violet-600 ring-4 ring-violet-100" />
                      <div className="min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <strong className="block wrap-break-word text-sm font-bold text-neutral-950">
                          {eventLabel(event.type)}
                        </strong>
                        <p className="m-0 text-xs font-semibold text-neutral-500">
                          {event.actor} - {event.created_at}
                        </p>
                        {eventSummary(event.type, event.payload) ? (
                          <p className="m-0 mt-2 wrap-break-word text-sm leading-6 text-neutral-600">
                            {eventSummary(event.type, event.payload)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className={mutedTextClass}>No activity yet.</p>
            )}
          </section>
        </main>
      </div>
    </section>
  );
}
