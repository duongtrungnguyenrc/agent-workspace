import type { ReactNode } from "react";

function inlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.9em] text-violet-700" key={index}>{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function Markdown({ value }: { value?: string | null }) {
  const lines = String(value || "").split("\n");
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li className="ml-5 list-disc break-words text-sm leading-6 text-neutral-700" key={index}>{inlineCode(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length && !inCode) return;
    nodes.push(
      <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-3 text-xs leading-5 text-neutral-100" key={`pre-${nodes.length}`}>
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
      nodes.push(<h2 className="mt-4 text-lg font-bold text-neutral-950 first:mt-0" key={`h2-${nodes.length}`}>{inlineCode(line.slice(2))}</h2>);
      return;
    }
    if (line.startsWith("## ")) {
      flushList();
      nodes.push(<h3 className="mt-3 text-base font-bold text-neutral-900 first:mt-0" key={`h3-${nodes.length}`}>{inlineCode(line.slice(3))}</h3>);
      return;
    }
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }
    if (line.trim()) {
      flushList();
      nodes.push(<p className="m-0 break-words text-sm leading-6 text-neutral-700" key={`p-${nodes.length}`}>{inlineCode(line)}</p>);
      return;
    }
    flushList();
  });

  flushList();
  if (inCode) flushCode();

  return <div className="grid gap-2">{nodes.length ? nodes : <p className="m-0 text-sm text-neutral-500">No content yet.</p>}</div>;
}
