import { borderToneClass, textToneClass } from "../lib/styles";

export interface Toast {
  id: number;
  tone: string;
  title: string;
  detail?: string;
  meta?: string;
  ticketId?: number;
}

interface ToastStackProps {
  toasts: Toast[];
  onOpen: (id: number) => void;
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onOpen, onDismiss }: ToastStackProps) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(380px,calc(100vw-32px))] gap-2" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          className={`pointer-events-auto grid grid-cols-[minmax(0,1fr)_auto] gap-2 overflow-hidden rounded-xl border border-l-4 bg-white/95 p-3 text-neutral-900 shadow-lg shadow-neutral-950/10 backdrop-blur ${borderToneClass(toast.tone)}`}
          key={toast.id}
          role="status"
        >
          <button
            className="grid min-w-0 gap-1 text-left disabled:cursor-default"
            disabled={!toast.ticketId}
            type="button"
            onClick={() => {
              if (toast.ticketId) onOpen(toast.ticketId);
              onDismiss(toast.id);
            }}
          >
            <strong className={`inline-flex w-fit max-w-full rounded-md px-1.5 text-sm font-bold ${textToneClass(toast.tone)}`}>
              <span className="truncate">{toast.title}</span>
            </strong>
            {toast.detail ? <span className="line-clamp-3 break-words text-xs leading-5 text-neutral-700">{toast.detail}</span> : null}
            {toast.meta ? <span className="truncate text-[11px] font-semibold text-neutral-500">{toast.meta}</span> : null}
          </button>
          <button
            aria-label="Dismiss notification"
            className="self-start rounded-md px-1.5 text-sm font-bold text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            type="button"
            onClick={() => onDismiss(toast.id)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
