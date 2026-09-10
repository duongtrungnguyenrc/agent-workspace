import { tone } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  tone: name,
  className,
}: {
  percent: number;
  tone?: string;
  className?: string;
}) {
  const safePercent = Math.max(0, Math.min(Math.round(percent), 100));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress ${safePercent}%`}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          name ? tone(name).fill : "bg-linear-to-r from-violet-500 via-fuchsia-500 to-emerald-500",
        )}
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}
