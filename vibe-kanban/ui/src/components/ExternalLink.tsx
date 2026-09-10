import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExternalLinkProps {
  url?: string | null;
  label?: string;
  className?: string;
}

export function ExternalLink({ url, label, className }: ExternalLinkProps) {
  if (!url) return <span className="text-muted-foreground">{label || "None"}</span>;
  return (
    <a
      className={cn(
        "inline-flex max-w-full items-center gap-1 break-all font-medium text-primary underline-offset-4 hover:underline",
        className,
      )}
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="min-w-0 break-all">{label || url}</span>
      <ExternalLinkIcon className="size-3 shrink-0 opacity-70" aria-hidden="true" />
    </a>
  );
}
