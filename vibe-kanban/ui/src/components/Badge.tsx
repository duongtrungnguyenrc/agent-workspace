import type { ReactNode } from "react";
import { Badge as UiBadge } from "@/components/ui/badge";
import { tone } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone: name,
  className,
}: {
  children: ReactNode;
  tone: string;
  className?: string;
}) {
  return (
    <UiBadge variant="outline" className={cn("max-w-full font-semibold", tone(name).badge, className)}>
      <span className="truncate">{children}</span>
    </UiBadge>
  );
}
