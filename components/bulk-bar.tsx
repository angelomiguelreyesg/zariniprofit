"use client";

import { Trash2, X } from "lucide-react";

export default function BulkBar({
  count,
  onClear,
  onDelete,
  deleting,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-2 pl-4 pr-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {count} seleccionado{count !== 1 ? "s" : ""}
        </span>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Eliminando…" : "Eliminar"}
        </button>
        <button
          onClick={onClear}
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Cancelar selección"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
