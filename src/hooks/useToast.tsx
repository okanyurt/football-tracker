"use client";

import { useState, useCallback } from "react";
import { AlertCircle, X } from "lucide-react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const ToastEl = message ? (
    <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium">
      <AlertCircle size={16} className="shrink-0" />
      <span>{message}</span>
      <button
        onClick={() => setMessage(null)}
        className="ml-1 p-0.5 hover:bg-red-700 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  ) : null;

  return { showError, ToastEl };
}
