import type { GroupBy, ReviewFilter, TicketKind, TicketStatus, TicketType } from "../types/kanban";
import { formatKind, formatStatus, formatType } from "../lib/format";
import { fieldClass, inputClass, panelClass, selectClass } from "../lib/styles";

interface FiltersProps {
  query: string;
  typesSelected: TicketType[];
  kindsSelected: TicketKind[];
  statusesSelected: TicketStatus[];
  reviewsSelected: ReviewFilter[];
  groupBy: GroupBy;
  types: TicketType[];
  kinds: TicketKind[];
  statuses: TicketStatus[];
  onQuery: (value: string) => void;
  onTypes: (value: TicketType[]) => void;
  onKinds: (value: TicketKind[]) => void;
  onStatuses: (value: TicketStatus[]) => void;
  onReviews: (value: ReviewFilter[]) => void;
  onGroupBy: (value: GroupBy) => void;
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function MultiFilter<T extends string>({
  label,
  options,
  values,
  onChange,
  format,
}: {
  label: string;
  options: T[];
  values: T[];
  onChange: (values: T[]) => void;
  format: (value: T) => string;
}) {
  const selectedLabel = values.length ? values.map(format).join(", ") : "All";
  return (
    <div className={fieldClass}>
      <span>{label}</span>
      <details className="group relative">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-neutral-900 outline-none transition marker:hidden hover:border-violet-300 group-open:border-violet-500 group-open:ring-2 group-open:ring-violet-100">
          <strong className="min-w-0 truncate font-semibold">{selectedLabel}</strong>
          <small className="shrink-0 text-xs font-bold text-neutral-400">{values.length ? `${values.length} selected` : "All"}</small>
        </summary>
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 grid gap-1 rounded-xl border border-neutral-200 bg-white p-2 normal-case shadow-xl shadow-neutral-950/10">
          <button className="rounded-lg px-2 py-1.5 text-left text-xs font-bold text-violet-700 hover:bg-violet-50" type="button" onClick={() => onChange([])}>
            Clear
          </button>
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
              <input className="size-4 accent-violet-600" type="checkbox" checked={values.includes(option)} onChange={() => onChange(toggleValue(values, option))} />
              <span className="truncate">{format(option)}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

export function Filters(props: FiltersProps) {
  return (
    <section className={`${panelClass} mb-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))_minmax(140px,0.8fr)]`}>
      <label className={fieldClass}>
        <span>Search</span>
        <input className={inputClass} value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Title, kind, spec, plan, branch" />
      </label>
      <MultiFilter label="Type" options={props.types} values={props.typesSelected} onChange={props.onTypes} format={formatType} />
      <MultiFilter label="Kind" options={props.kinds} values={props.kindsSelected} onChange={props.onKinds} format={formatKind} />
      <MultiFilter label="Status" options={props.statuses} values={props.statusesSelected} onChange={props.onStatuses} format={formatStatus} />
      <MultiFilter
        label="Review"
        options={["approved", "pending"] as ReviewFilter[]}
        values={props.reviewsSelected}
        onChange={props.onReviews}
        format={(review) => (review === "approved" ? "Approved" : "Needs review")}
      />
      <label className={fieldClass}>
        <span>Group</span>
        <select className={selectClass} value={props.groupBy} onChange={(event) => props.onGroupBy(event.target.value as GroupBy)}>
          <option value="status">Status</option>
          <option value="type">Type</option>
          <option value="kind">Kind</option>
          <option value="review">Review</option>
          <option value="branch">Branch</option>
          <option value="parent">Parent</option>
        </select>
      </label>
    </section>
  );
}
