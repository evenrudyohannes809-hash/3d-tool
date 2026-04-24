import { useEffect, useState, type ReactNode } from "react";

// Маленький toast-хук для калькулятора. Живёт в отдельном файле,
// чтобы не ломать React Fast Refresh (который требует, чтобы файл-компонент
// экспортировал только компоненты).
export function useToast(): {
  toast: string | null;
  show: (msg: string) => void;
  ToastView: ReactNode;
} {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);
  return {
    toast,
    show: setToast,
    ToastView: toast ? (
      <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[140] soft-sm bg-surface px-5 py-3 text-sm font-bold text-ink">
        {toast}
      </div>
    ) : null,
  };
}
