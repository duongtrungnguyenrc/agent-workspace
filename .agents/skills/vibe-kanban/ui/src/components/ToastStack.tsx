interface Toast {
  id: number;
  message: string;
  detail?: string;
}

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(360px,calc(100vw-32px))] gap-2" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className="grid gap-1 overflow-hidden rounded-xl border border-violet-200 bg-white/95 p-3 text-neutral-900 shadow-lg shadow-violet-950/10" key={toast.id}>
          <strong className="text-sm font-bold text-violet-700">{toast.message}</strong>
          {toast.detail ? <span className="break-words text-xs text-neutral-600">{toast.detail}</span> : null}
        </div>
      ))}
    </div>
  );
}
