import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: string; title?: string; description?: string; variant?: "default" | "success" | "destructive" };

const ToastContext = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setItems(prev => [...prev, { id, ...t }]);
    setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 3500);
  }, []);

  const ctx = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {items.map(t => (
          <div key={t.id} className={`rounded-md border px-3 py-2 shadow bg-card text-foreground ${t.variant === "destructive" ? "border-red-400" : t.variant === "success" ? "border-green-400" : "border-border"}`}>
            {t.title && <div className="text-sm font-medium">{t.title}</div>}
            {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToasterProvider");
  return ctx;
}


