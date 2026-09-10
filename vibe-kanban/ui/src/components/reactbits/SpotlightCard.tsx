// Adapted from ReactBits SpotlightCard (https://reactbits.dev) to use the app theme tokens
// and to forward native div props so the card can be draggable and clickable.
import { useRef, useState, type ComponentProps, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends ComponentProps<"div"> {
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "color-mix(in oklab, var(--primary) 18%, transparent)",
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    onMouseMove?.(event);
  };

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden rounded-xl border bg-card text-card-foreground", className)}
      onMouseMove={handleMove}
      onMouseEnter={(event) => {
        setOpacity(1);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setOpacity(0);
        onMouseLeave?.(event);
      }}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity,
          background: `radial-gradient(240px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}

export default SpotlightCard;
