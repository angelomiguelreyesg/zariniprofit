"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { Card, Spinner } from "@/components/ui";
import {
  formatMoney,
  toISODate,
  endOfDay,
  downloadCSV,
} from "@/lib/utils";
import type { Venta, Gasto } from "@/lib/types";

const PIE_COLORS = [
  "#10b981",
  "#0ea5e9",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#64748b",
];

export default function ReportesPage() {
  const { user, profile } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [desde, setDesde] = useState(toISODate(firstOfMonth).slice(0, 10));
  const [hasta, setHasta] = useState(toISODate(today).slice(0, 10));

  const moneda = profile?.moneda || "COP";

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [v, g] = await Promise.all([
      supabase.from("ventas").select("id, total, metodo_pago, fecha, descripcion").order("fecha", { ascending: false }).limit(1000),
      supabase.from("gastos").select("id, monto, categoria, descripcion, fecha").order("fecha", { ascending: false }).limit(1000),
    ]);
    setVentas((v.data as Venta[]) ?? []);
    setGastos((g.data as Gasto[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const from = new Date(`${desde}T00:00:00`).getTime();
    const to = endOfDay(new Date(`${hasta}T00:00:00`)).getTime();
    const ventasF = ventas.filter((v) => {
      const t = new Date(v.fecha).getTime();
      return t >= from && t <= to;
    });
    const gastosF = gastos.filter((g) => {
      const t = new Date(g.fecha).getTime();
      return t >= from && t <= to;
    });
    return { ventas: ventasF, gastos: gastosF };
  }, [ventas, gastos, desde, hasta]);

  const totals = useMemo(() => {
    const totalVentas = filtered.ventas.reduce((a, v) => a + v.total, 0);
    const totalGastos = filtered.gastos.reduce((a, g) => a + g.monto, 0);
    return {
      totalVentas,
      totalGastos,
      ganancia: totalVentas - totalGastos,
      count: filtered.ventas.length,
    };
  }, [filtered]);

  const porMetodo = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of filtered.ventas) {
      map.set(v.metodo_pago, (map.get(v.metodo_pago) || 0) + v.total);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered.ventas]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of filtered.gastos) {
      const c = g.categoria || "Sin categoría";
      map.set(c, (map.get(c) || 0) + g.monto);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered.gastos]);

  function exportVentas() {
    const rows: string[][] = [
      ["Fecha", "Descripción", "Método de pago", "Total"],
      ...filtered.ventas.map((v) => [
        new Date(v.fecha).toLocaleString("es-CO"),
        v.descripcion || "Venta",
        v.metodo_pago,
        String(v.total),
      ]),
    ];
    downloadCSV(`zariniprofit-ventas-${desde}-a-${hasta}.csv`, rows);
  }

  function exportGastos() {
    const rows: string[][] = [
      ["Fecha", "Descripción", "Categoría", "Monto"],
      ...filtered.gastos.map((g) => [
        new Date(g.fecha).toLocaleString("es-CO"),
        g.descripcion,
        g.categoria || "",
        String(g.monto),
      ]),
    ];
    downloadCSV(`zariniprofit-gastos-${desde}-a-${hasta}.csv`, rows);
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500">
            Analiza el desempeño de tu negocio
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className="input"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className="input"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Ventas"
          value={formatMoney(totals.totalVentas, moneda)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Gastos"
          value={formatMoney(totals.totalGastos, moneda)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          label="Ganancia neta"
          value={formatMoney(totals.ganancia, moneda)}
          icon={<Wallet className="h-5 w-5" />}
          tone={totals.ganancia >= 0 ? "green" : "rose"}
        />
        <StatCard
          label="N° de ventas"
          value={String(totals.count)}
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Ventas por método de pago</h2>
          {porMetodo.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Sin datos en este período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porMetodo}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {porMetodo.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatMoney(value, moneda)}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Gastos por categoría</h2>
          {porCategoria.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Sin datos en este período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {porCategoria.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatMoney(value, moneda)}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <div>
              <h2 className="font-semibold text-slate-900">Exportar datos</h2>
              <p className="text-sm text-slate-500">
                Descarga los datos del período en formato CSV
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportVentas} className="btn-secondary">
              <Download className="h-4 w-4" /> Ventas CSV
            </button>
            <button onClick={exportGastos} className="btn-secondary">
              <Download className="h-4 w-4" /> Gastos CSV
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "rose" | "blue";
}) {
  const tones = {
    green: "bg-brand-50 text-brand-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-sky-50 text-sky-600",
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-lg font-bold text-slate-900 sm:text-xl">
        {value}
      </p>
    </Card>
  );
}
