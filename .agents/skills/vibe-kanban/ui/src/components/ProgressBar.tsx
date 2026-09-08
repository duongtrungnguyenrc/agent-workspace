import { fillToneClass } from "../lib/styles";

export function ProgressBar({ percent, tone }: { percent: number; tone?: string }) {
  const safePercent = Math.max(0, Math.min(percent, 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100" aria-label={`Progress ${safePercent}%`}>
      <div className={`h-full rounded-full ${fillToneClass(tone)}`} style={{ width: `${safePercent}%` }} />
    </div>
  );
}
