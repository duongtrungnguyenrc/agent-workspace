import { useState } from "react";
import type { TicketListItem, TicketType } from "../types/kanban";
import { formatType, ticketCode } from "../lib/format";
import { buttonClass, fieldClass, inputClass, panelClass, selectClass, textareaClass } from "../lib/styles";

interface TicketComposerProps {
  types: TicketType[];
  tickets: TicketListItem[];
  onCreate: (data: Record<string, FormDataEntryValue>) => Promise<void>;
}

function eligibleParents(type: TicketType, tickets: TicketListItem[]) {
  if (type === "use_case") return tickets.filter((ticket) => ticket.type === "US");
  if (type === "task") return tickets.filter((ticket) => ["US", "use_case", "uat_feedback", "qc_feedback"].includes(ticket.type));
  if (type === "uat_feedback" || type === "qc_feedback") return tickets.filter((ticket) => ticket.type === "US");
  return [];
}

export function TicketComposer({ types, tickets, onCreate }: TicketComposerProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TicketType>("US");
  const parents = eligibleParents(type, tickets);

  return (
    <section className={`${panelClass} mb-4`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-bold text-neutral-950">Create ticket</h2>
          <p className="m-0 text-sm leading-6 text-neutral-500">Capture a work ticket, source context, rewritten spec, and task execution plan.</p>
        </div>
        <button className={`${buttonClass} border-orange-500 bg-orange-500 text-white hover:bg-orange-600`} type="button" onClick={() => setOpen((value) => !value)}>
          New ticket
        </button>
      </div>

      {open ? (
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = Object.fromEntries(new FormData(form).entries());
            if (!data.parent_id) delete data.parent_id;
            await onCreate(data);
            form.reset();
            setType("US");
            setOpen(false);
          }}
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_1fr]">
            <label className={fieldClass}>
              <span>Title</span>
              <input className={inputClass} name="title" required />
            </label>
            <label className={fieldClass}>
              <span>Type</span>
              <select className={selectClass} name="type" value={type} onChange={(event) => setType(event.target.value as TicketType)}>
                {types.map((item) => (
                  <option key={item} value={item}>
                    {formatType(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className={fieldClass}>
              <span>Parent</span>
              <select className={selectClass} name="parent_id">
                <option value="">None</option>
                {parents.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticketCode(ticket)} - {ticket.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={fieldClass}>
            <span>Raw requirement</span>
            <textarea className={textareaClass} name="raw_requirement" rows={3} />
          </label>
          <div className="grid gap-3 lg:grid-cols-3">
            <label className={fieldClass}>
              <span>Source type</span>
              <input className={inputClass} name="source_type" placeholder="jira, kanban, linear" />
            </label>
            <label className={fieldClass}>
              <span>Source id</span>
              <input className={inputClass} name="source_id" placeholder="PROJ-123" />
            </label>
            <label className={fieldClass}>
              <span>Source URL</span>
              <input className={inputClass} name="source_url" />
            </label>
          </div>
          <label className={fieldClass}>
            <span>Source snapshot</span>
            <textarea className={textareaClass} name="source_snapshot" rows={4} />
          </label>
          <div className={`grid gap-3 ${type === "task" ? "lg:grid-cols-2" : ""}`}>
            <label className={fieldClass}>
              <span>Specification</span>
              <textarea className={textareaClass} name="specification" rows={8} />
            </label>
            {type === "task" ? (
              <label className={fieldClass}>
                <span>Execution plan</span>
                <textarea className={textareaClass} name="execution_plan" rows={8} />
              </label>
            ) : null}
          </div>
          <div className="flex justify-end">
            <button className={`${buttonClass} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`} type="submit">
              Create ticket
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
