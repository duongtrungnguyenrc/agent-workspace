import { ChevronDownIcon, KanbanSquareIcon, ListTreeIcon, SearchIcon, WaypointsIcon, XIcon } from "lucide-react";
import type { GroupBy, ReviewFilter, TicketKind, TicketStatus, TicketType } from "../types/kanban";
import { formatKind, formatStatus, formatType } from "../lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type BoardView = "kanban" | "list" | "graph";

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
  view: BoardView;
  shown: number;
  total: number;
  onQuery: (value: string) => void;
  onTypes: (value: TicketType[]) => void;
  onKinds: (value: TicketKind[]) => void;
  onStatuses: (value: TicketStatus[]) => void;
  onReviews: (value: ReviewFilter[]) => void;
  onGroupBy: (value: GroupBy) => void;
  onView: (value: BoardView) => void;
  onReset: () => void;
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
  const active = values.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", active && "border-primary/40 bg-primary/5 text-primary hover:text-primary")}
        >
          {label}
          {active ? (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] tabular-nums">
              {active}
            </Badge>
          ) : null}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={values.includes(option)}
            onCheckedChange={() => onChange(toggleValue(values, option))}
            onSelect={(event) => event.preventDefault()}
          >
            {format(option)}
          </DropdownMenuCheckboxItem>
        ))}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              <XIcon /> Clear
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const groupOptions: Array<[GroupBy, string]> = [
  ["status", "Status"],
  ["type", "Type"],
  ["kind", "Kind"],
  ["review", "Review"],
  ["branch", "Branch"],
  ["parent", "Parent"],
];

export function Filters(props: FiltersProps) {
  const hasFilters =
    props.query.trim().length > 0 ||
    props.typesSelected.length > 0 ||
    props.kindsSelected.length > 0 ||
    props.statusesSelected.length > 0 ||
    props.reviewsSelected.length > 0;

  return (
    <section className="mb-4 flex flex-wrap items-center gap-2" aria-label="Board filters">
      <div className="relative w-full sm:w-72">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-8"
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          placeholder="Search title, spec, plan, branch…"
          aria-label="Search tickets"
        />
        {props.query ? (
          <button
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
            type="button"
            aria-label="Clear search"
            onClick={() => props.onQuery("")}
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      <MultiFilter label="Type" options={props.types} values={props.typesSelected} onChange={props.onTypes} format={formatType} />
      <MultiFilter label="Kind" options={props.kinds} values={props.kindsSelected} onChange={props.onKinds} format={formatKind} />
      <MultiFilter
        label="Status"
        options={props.statuses}
        values={props.statusesSelected}
        onChange={props.onStatuses}
        format={formatStatus}
      />
      <MultiFilter
        label="Review"
        options={["approved", "pending"] as ReviewFilter[]}
        values={props.reviewsSelected}
        onChange={props.onReviews}
        format={(review) => (review === "approved" ? "Approved" : "Needs review")}
      />
      {props.view === "kanban" ? (
        <Select value={props.groupBy} onValueChange={(value) => props.onGroupBy(value as GroupBy)}>
          <SelectTrigger size="sm" className="w-36" aria-label="Group columns by">
            <span className="text-muted-foreground">Group:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={props.onReset}>
          <XIcon /> Reset
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {props.shown === props.total ? `${props.total} tickets` : `${props.shown} of ${props.total} tickets`}
        </span>
        <Tabs value={props.view} onValueChange={(value) => props.onView(value as BoardView)}>
          <TabsList className="h-8">
            <TabsTrigger value="kanban" className="px-2.5">
              <KanbanSquareIcon /> <span className="max-sm:hidden">Board</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="px-2.5">
              <ListTreeIcon /> <span className="max-sm:hidden">Tree</span>
            </TabsTrigger>
            <TabsTrigger value="graph" className="px-2.5">
              <WaypointsIcon /> <span className="max-sm:hidden">Graph</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </section>
  );
}
