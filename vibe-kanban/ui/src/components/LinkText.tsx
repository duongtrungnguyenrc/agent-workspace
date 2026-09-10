import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<>)\]}]+[^\s<>)\]}.,;:!?])/g;

export function LinkText({ value }: { value: string }) {
  const parts = value.split(URL_PATTERN);
  return parts.map((part, index): ReactNode =>
    /^https?:\/\//.test(part) ? (
      <a
        className="break-all font-medium text-primary underline-offset-4 hover:underline"
        href={part}
        key={`${part}-${index}`}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}
