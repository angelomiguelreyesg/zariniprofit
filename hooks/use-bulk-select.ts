"use client";

import { useCallback, useState } from "react";

export function useBulkSelect<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length && items.length > 0) {
        return new Set();
      }
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected = items.length > 0 && selected.size === items.length;

  return { selected, toggle, selectAll, clear, allSelected };
}
