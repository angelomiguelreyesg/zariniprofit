"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney, isoToDateKey, toLocalDateStr } from "@/lib/utils";
import type { Venta } from "@/lib/types";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEK_HEAD = ["L", "M", "X", "J", "V", "S", "D"];

export default function Calendar({
  ventas,
  selectedDate,
  onSelectDate,
  month,
  onMonthChange,
  moneda,
}: {
  ventas: Venta[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  month: Date;
  onMonthChange: (d: Date) => void;
  moneda: string;
}) {
  const totalsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of ventas) {
      const key = isoToDateKey(v.fecha);
      map.set(key, (map.get(key) || 0) + v.total);
    }
    return map;
  }, [ventas]);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const result: ({ date: string; day: number } | null)[] = [];
    for (let i = 0; i < offset; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        date: `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
      });
    }
    return result;
  }, [month]);

  const todayKey = toLocalDateStr(new Date());

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
        {WEEK_HEAD.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="aspect-square" />;
          const total = totalsByDay.get(cell.date) || 0;
          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === todayKey;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                isSelected
                  ? "bg-brand-600 text-white shadow-sm"
                  : isToday
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/40"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="font-medium">{cell.day}</span>
              {total > 0 && (
                <span
                  className={`mt-0.5 max-w-full truncate px-1 text-[9px] leading-tight ${
                    isSelected ? "text-emerald-50" : "text-brand-600 dark:text-brand-400"
                  }`}
                >
                  {formatMoney(total, moneda)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
