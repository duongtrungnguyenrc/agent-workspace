import type { ReactNode } from "react";
import { badgeToneClass } from "../lib/styles";

export function Badge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-bold leading-5 ${badgeToneClass(tone)}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}
