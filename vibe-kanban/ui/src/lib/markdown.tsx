import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "./utils";

// GFM markdown (tables, task lists, strikethrough, autolinks) rendered with theme tokens.
// react-markdown never renders raw HTML, so ticket content from agents and source systems stays inert.

const headingClass = "mt-4 mb-1 font-semibold tracking-tight text-foreground first:mt-0";

function isTaskItem(props: ComponentProps<"li">) {
  return typeof props.className === "string" && props.className.includes("task-list-item");
}

const components: Components = {
  h1: ({ children }) => <h2 className={cn(headingClass, "text-lg")}>{children}</h2>,
  h2: ({ children }) => <h3 className={cn(headingClass, "text-base")}>{children}</h3>,
  h3: ({ children }) => <h4 className={cn(headingClass, "text-[13px] tracking-wide text-muted-foreground uppercase")}>{children}</h4>,
  h4: ({ children }) => <h5 className={cn(headingClass, "text-sm")}>{children}</h5>,
  h5: ({ children }) => <h6 className={cn(headingClass, "text-sm")}>{children}</h6>,
  h6: ({ children }) => <h6 className={cn(headingClass, "text-sm")}>{children}</h6>,
  p: ({ children }) => <p className="m-0 break-words text-sm leading-6 text-foreground/85">{children}</p>,
  a: ({ href, children }) => (
    <a
      className="inline-flex max-w-full items-baseline gap-0.5 break-all font-medium text-primary underline-offset-4 hover:underline"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="min-w-0 break-all">{children}</span>
      {href && /^https?:\/\//.test(href) ? <ExternalLinkIcon className="size-3 shrink-0 self-center opacity-70" aria-hidden="true" /> : null}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-muted-foreground line-through decoration-muted-foreground/60">{children}</del>,
  hr: () => <hr className="my-3 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="my-1 grid gap-2 border-l-2 border-primary/40 bg-muted/40 py-2 pr-3 pl-4 text-foreground/80 [&>p]:text-foreground/80">{children}</blockquote>
  ),
  ul: ({ children, className }) => (
    <ul className={cn("my-1 grid gap-1 pl-5", className?.includes("contains-task-list") ? "list-none pl-0" : "list-disc")}>{children}</ul>
  ),
  ol: ({ children, start }) => (
    <ol className="my-1 grid list-decimal gap-1 pl-5 marker:font-mono marker:text-xs marker:text-muted-foreground" start={start}>
      {children}
    </ol>
  ),
  li: (props) => {
    const { children, className } = props;
    if (!isTaskItem(props)) {
      return <li className="break-words text-sm leading-6 text-foreground/85 [&>ol]:mt-1 [&>ul]:mt-1">{children}</li>;
    }
    // remark-gfm emits <input type="checkbox" checked disabled> as the first child of a task item.
    const items = Array.isArray(children) ? children : [children];
    const checkbox = items.find((child) => typeof child === "object" && child !== null && "props" in child && (child as { props: { type?: string } }).props?.type === "checkbox");
    const checked = Boolean(checkbox && (checkbox as { props: { checked?: boolean } }).props.checked);
    const rest = items.filter((child) => child !== checkbox);
    return (
      <li className={cn("grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2 break-words text-sm leading-6 text-foreground/85", className)}>
        <span
          aria-hidden="true"
          className={cn(
            "mt-1.5 grid size-4 place-items-center rounded-[4px] border",
            checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background text-transparent",
          )}
        >
          <CheckIcon className="size-3" strokeWidth={3} />
        </span>
        <span className={cn("min-w-0 [&>ol]:mt-1 [&>ul]:mt-1", checked && "text-muted-foreground line-through decoration-muted-foreground/50")}>{rest}</span>
      </li>
    );
  },
  input: (props) => (props.type === "checkbox" ? null : <input {...props} />),
  code: ({ children, className, ...rest }) => {
    // Fenced blocks arrive wrapped in <pre>; inline code has no language class and no newline.
    const isBlock = typeof className === "string" && className.startsWith("language-");
    const text = String(children);
    if (isBlock || text.includes("\n")) {
      return (
        <code className={cn("block font-mono text-xs leading-5", className)} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary" {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-1 overflow-x-auto rounded-lg border bg-zinc-950 p-3 text-zinc-100 dark:bg-black">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-1 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">{children}</thead>,
  tbody: ({ children }) => <tbody className="[&>tr:nth-child(even)]:bg-muted/30">{children}</tbody>,
  tr: ({ children }) => <tr className="border-b last:border-b-0">{children}</tr>,
  th: ({ children, style }) => <th className="px-3 py-2 align-top font-semibold whitespace-nowrap" style={style}>{children}</th>,
  td: ({ children, style }) => <td className="px-3 py-2 align-top leading-6 text-foreground/85" style={style}>{children}</td>,
  img: ({ src, alt }) => (
    <a href={src} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
      <img className="my-1 max-h-96 max-w-full rounded-lg border bg-background object-contain" src={src} alt={alt || ""} loading="lazy" />
    </a>
  ),
};

export function Markdown({ value, className }: { value?: string | null; className?: string }): ReactNode {
  const text = String(value || "").trim();
  if (!text) return <p className={cn("m-0 text-sm text-muted-foreground", className)}>No content yet.</p>;
  return (
    <div className={cn("grid min-w-0 gap-2 [&_li>p]:inline", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
