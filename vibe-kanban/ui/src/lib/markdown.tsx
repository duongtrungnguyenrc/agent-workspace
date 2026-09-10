import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { LinkText } from "../components/LinkText";
import { cn } from "./utils";

function inlineText(text: string, keyPrefix = "") {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong className="font-semibold text-foreground" key={`${keyPrefix}${index}`}>
          <LinkText value={part.slice(2, -2)} />
        </strong>
      );
    }
    return (
      <span key={`${keyPrefix}${index}`}>
        <LinkText value={part} />
      </span>
    );
  });
}

function inlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary" key={index}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{inlineText(part, `${index}-`)}</span>;
  });
}

export function Markdown({ value, className }: { value?: string | null; className?: string }) {
  const lines = String(value || "").split("\n");
  const nodes: ReactNode[] = [];
  let listItems: Array<{ text: string; checked?: boolean; nested: boolean }> = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul className="grid gap-1" key={`ul-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li
            className={cn(
              "break-words text-sm leading-6 text-foreground/85",
              item.checked === undefined ? "ml-5 list-disc" : "grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2",
              item.nested && "ml-9",
            )}
            key={index}
          >
            {item.checked === undefined ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 grid size-4 place-items-center rounded-[4px] border",
                  item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background text-transparent",
                )}
              >
                <CheckIcon className="size-3" strokeWidth={3} />
              </span>
            )}
            <span className={cn(item.checked && "text-muted-foreground line-through decoration-muted-foreground/50")}>
              {inlineCode(item.text)}
            </span>
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length && !inCode) return;
    nodes.push(
      <pre
        className="overflow-x-auto rounded-lg border bg-zinc-950 p-3 text-xs leading-5 text-zinc-100 dark:bg-black"
        key={`pre-${nodes.length}`}
      >
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
  };

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    if (line.startsWith("# ")) {
      flushList();
      nodes.push(
        <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground first:mt-0" key={`h2-${nodes.length}`}>
          {inlineCode(line.slice(2))}
        </h2>,
      );
      return;
    }
    if (line.startsWith("## ") || line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h3
          className="mt-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0"
          key={`h3-${nodes.length}`}
        >
          {inlineCode(line.replace(/^#+\s/, ""))}
        </h3>,
      );
      return;
    }
    const checklist = line.match(/^(\s*)-\s*\[([ xX])\]\s+(.+)$/);
    if (checklist) {
      listItems.push({ text: checklist[3], checked: checklist[2].toLowerCase() === "x", nested: checklist[1].length > 0 });
      return;
    }
    const bullet = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push({ text: bullet[2], nested: bullet[1].length > 0 });
      return;
    }
    if (line.trim()) {
      flushList();
      nodes.push(
        <p className="m-0 break-words text-sm leading-6 text-foreground/85" key={`p-${nodes.length}`}>
          {inlineCode(line)}
        </p>,
      );
      return;
    }
    flushList();
  });

  flushList();
  if (inCode) flushCode();

  return (
    <div className={cn("grid gap-2", className)}>
      {nodes.length ? nodes : <p className="m-0 text-sm text-muted-foreground">No content yet.</p>}
    </div>
  );
}
