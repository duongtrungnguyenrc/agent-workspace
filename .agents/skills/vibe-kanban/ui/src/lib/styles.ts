import type { TicketStatus, TicketType } from "../types/kanban";

export const statusTone: Record<TicketStatus, string> = {
  open: "sky",
  in_progress: "violet",
  hold: "amber",
  cancelled: "rose",
  in_review: "orange",
  closed: "emerald",
};

export const typeTone: Record<TicketType, string> = {
  US: "indigo",
  use_case: "fuchsia",
  task: "teal",
  uat_feedback: "orange",
  qc_feedback: "amber",
};

export function buttonTone(action: string): string {
  const tones: Record<string, string> = {
    approve: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
    start: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
    review: "border-orange-500 bg-orange-500 text-white hover:bg-orange-600",
    hold: "border-amber-600 bg-amber-600 text-white hover:bg-amber-700",
    close: "border-sky-600 bg-sky-600 text-white hover:bg-sky-700",
    cancel: "border-rose-600 bg-rose-600 text-white hover:bg-rose-700",
  };
  return tones[action] || secondaryButtonClass;
}

export const panelClass = "min-w-0 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_16px_40px_rgb(15_23_42/0.04)]";
export const buttonClass =
  "inline-flex min-h-9 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButtonClass = "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 hover:shadow-sm";
export const fieldClass = "grid min-w-0 gap-1.5 text-xs font-bold uppercase text-neutral-500";
export const inputClass =
  "min-h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium normal-case text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
export const textareaClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium normal-case leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
export const selectClass = inputClass;
export const mutedTextClass = "m-0 text-sm leading-6 text-neutral-500 break-words";
export const ticketCodeClass = "block font-mono text-xs font-bold uppercase tracking-normal text-violet-700";

export function badgeToneClass(tone: string): string {
  const tones: Record<string, string> = {
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    fuchsia: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
  };
  return tones[tone] || tones.violet;
}

export function fillToneClass(tone?: string): string {
  const tones: Record<string, string> = {
    sky: "bg-sky-500",
    violet: "bg-violet-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    orange: "bg-orange-500",
    emerald: "bg-emerald-500",
    indigo: "bg-indigo-500",
    fuchsia: "bg-fuchsia-500",
    teal: "bg-teal-500",
  };
  return tone ? tones[tone] || tones.violet : "bg-gradient-to-r from-violet-600 via-orange-500 to-emerald-500";
}

export function textToneClass(tone: string): string {
  const tones: Record<string, string> = {
    sky: "text-sky-600 bg-sky-50",
    violet: "text-violet-700 bg-violet-50",
    amber: "text-amber-700 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
    orange: "text-orange-600 bg-orange-50",
    emerald: "text-emerald-600 bg-emerald-50",
    indigo: "text-indigo-600 bg-indigo-50",
    fuchsia: "text-fuchsia-600 bg-fuchsia-50",
    teal: "text-teal-600 bg-teal-50",
  };
  return tones[tone] || tones.violet;
}

export function borderToneClass(tone: string): string {
  const tones: Record<string, string> = {
    sky: "border-sky-500 bg-sky-50/70",
    violet: "border-violet-600 bg-violet-50/70",
    amber: "border-amber-500 bg-amber-50/70",
    rose: "border-rose-500 bg-rose-50/70",
    orange: "border-orange-500 bg-orange-50/70",
    emerald: "border-emerald-500 bg-emerald-50/70",
    indigo: "border-indigo-500 bg-indigo-50/70",
    fuchsia: "border-fuchsia-500 bg-fuchsia-50/70",
    teal: "border-teal-500 bg-teal-50/70",
  };
  return tones[tone] || tones.violet;
}
