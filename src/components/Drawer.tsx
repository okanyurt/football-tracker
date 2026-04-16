"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface DrawerProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Drawer({ title, onClose, children }: DrawerProps) {
  useEscapeKey(onClose);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
