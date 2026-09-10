import type { TicketKind, TicketStatus, TicketType } from "../types/kanban";

export type Tone =
  | "sky"
  | "violet"
  | "amber"
  | "rose"
  | "orange"
  | "emerald"
  | "indigo"
  | "fuchsia"
  | "teal"
  | "neutral";

export interface ToneClasses {
  /** Outline badge colors */
  badge: string;
  /** Solid fill for bars and dots */
  fill: string;
  /** Left accent border */
  accent: string;
  /** Colored text */
  text: string;
  /** Soft tinted background with readable text */
  soft: string;
}

export const toneClasses: Record<Tone, ToneClasses> = {
  sky: {
    badge: "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300",
    fill: "bg-sky-500",
    accent: "border-l-sky-500",
    text: "text-sky-600 dark:text-sky-400",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  violet: {
    badge: "border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300",
    fill: "bg-violet-500",
    accent: "border-l-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  amber: {
    badge: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
    fill: "bg-amber-500",
    accent: "border-l-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  rose: {
    badge: "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300",
    fill: "bg-rose-500",
    accent: "border-l-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  orange: {
    badge: "border-orange-200/80 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-300",
    fill: "bg-orange-500",
    accent: "border-l-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    soft: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  emerald: {
    badge: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
    fill: "bg-emerald-500",
    accent: "border-l-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  indigo: {
    badge: "border-indigo-200/80 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-300",
    fill: "bg-indigo-500",
    accent: "border-l-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
    soft: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  fuchsia: {
    badge: "border-fuchsia-200/80 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/10 dark:text-fuchsia-300",
    fill: "bg-fuchsia-500",
    accent: "border-l-fuchsia-500",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    soft: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  },
  teal: {
    badge: "border-teal-200/80 bg-teal-50 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
    fill: "bg-teal-500",
    accent: "border-l-teal-500",
    text: "text-teal-600 dark:text-teal-400",
    soft: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  neutral: {
    badge: "border-border bg-muted text-muted-foreground",
    fill: "bg-muted-foreground/40",
    accent: "border-l-muted-foreground/40",
    text: "text-muted-foreground",
    soft: "bg-muted text-muted-foreground",
  },
};

export function tone(name?: string | null): ToneClasses {
  return toneClasses[(name || "violet") as Tone] || toneClasses.violet;
}

export const kindTone: Record<TicketKind, Tone> = {
  feature: "emerald",
  bugfix: "rose",
  refactor: "sky",
  chore: "amber",
  docs: "indigo",
  test: "fuchsia",
};

export const statusTone: Record<TicketStatus, Tone> = {
  open: "sky",
  in_progress: "violet",
  hold: "amber",
  cancelled: "rose",
  in_review: "orange",
  closed: "emerald",
};

export const typeTone: Record<TicketType, Tone> = {
  group: "indigo",
  feature: "fuchsia",
  task: "teal",
};

export const ticketCodeClass =
  "font-mono text-[11px] font-semibold uppercase tracking-wide text-primary";
export const mutedTextClass = "m-0 text-sm leading-6 text-muted-foreground";
export const sectionTitleClass = "text-sm font-semibold tracking-tight text-foreground";
