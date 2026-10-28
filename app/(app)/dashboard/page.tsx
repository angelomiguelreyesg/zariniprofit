"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  ArrowRight,
  Receipt,
  PackageOpen,
  Percent,
  ShoppingCart,
  Plus,
  Scale,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { useTheme } from "@/components/theme-provider";
import { Card, Skeleton, Badge } from "@/components/ui";
import { formatMoney, startOfDay } from "@/lib/utils";
import type { Venta, Gasto, Producto } from "@/lib/types";

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

type Period = "hoy" | "semana" | "mes";

const PERIOD_LABELS: Record<Period, string> = {
  hoy: "Hoy",
  semana: "Semana",
  mes: "Mes",
};

function periodRange(period: Period) {
  const now = new Date();
  const end = now.getTime();
  const todayStart = startOfDay(now).getTime();
  let start: number;
  let prevStart: number;
  let prevEnd: number;

  if (period === "hoy") {
    start = todayStart;
    prevStart = todayStart - 86400000;
    prevEnd = todayStart;
  } else if (period === "semana") {
    start = todayStart - 6 * 86400000;
    prevStart = start - 7 * 86400000;
    prevEnd = start;
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevStart = prevMonth.getTime();
    prevEnd = start;
  }

  return { start, end, prevStart, prevEnd };
}

function pctLabel(hoy: number, ayer: number): { text: string; positive: boolean } | null {
  if (ayer === 0) return hoy > 0 ? { text: "Nuevo", positive: true } : null;
  const pct = ((hoy - ayer) / Math.abs(ayer)) * 100;
  if (Math.abs(pct) < 0.05) return null;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`,
    positive: pct >= 0,
  };
}

export default function DashboardPage() {
  const { user, profile } = useApp();
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("hoy");

  const moneda = profile?.moneda || "COP";

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const [v, g, p] = await Promise.all([
        supabase
          .from("ventas")
          .select("id, producto_id, cantidad, total, metodo_pago, fecha")
          .order("fecha", { ascending: false })
          .limit(1000),
        supabase
          .from("gastos")
          .select("id, monto, categoria, fecha")
          .order("fecha", { ascending: false })
          .limit(1000),
        supabase.from("productos").select("id, nombre, stock").limit(1000),
      ]);
      setVentas((v.data as Venta[]) ?? []);
      setGastos((g.data as Gasto[]) ?? []);
      setProductos((p.data as Producto[]) ?? []);
      setLoading(false);
    }

    load();
  }, [user]);

  const sums = useMemo(() => {
    const { start, end, prevStart, prevEnd } = periodRange(period);
    let ingresos = 0;
    let egresos = 0;
    let ingresosPrev = 0;
    let egresosPrev = 0;

    for (const v of ventas) {
      const t = new Date(v.fecha).getTime();
      if (t >= start && t <= end) ingresos += v.total;
      else if (t >= prevStart && t < prevEnd) ingresosPrev += v.total;
    }
    for (const g of gastos) {
      const t = new Date(g.fecha).getTime();
      if (t >= start && t <= end) egresos += g.monto;
      else if (t >= prevStart && t < prevEnd) egresosPrev += g.monto;
    }

    const balance = ingresos - egresos;
    const balancePrev = ingresosPrev - egresosPrev;
    const margen = ingresos > 0 ? (balance / ingresos) * 100 : 0;

    return { ingresos, egresos, balance, ingresosPrev, egresosPrev, balancePrev, margen };
  }, [ventas, gastos, period]);

  const chartData = useMemo(() => {
    const days: { day: string; ventas: number; gastos: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = startOfDay(d).getTime();
      const end = start + 86400000;
      const ventasDia = ventas
        .filter((v) => {
          const t = new Date(v.fecha).getTime();
          return t >= start && t < end;
        })
        .reduce((a, b) => a + b.total, 0);
      const gastoDia = gastos
        .filter((g) => {
          const t = new Date(g.fecha).getTime();
          return t >= start && t < end;
        })
        .reduce((a, b) => a + b.monto, 0);
      days.push({ day: WEEKDAYS[d.getDay()], ventas: ventasDia, gastos: gastoDia });
    }
    return days;
  }, [ventas, gastos]);

  const topProductos = useMemo(() => {
    const map = new Map<string, { nombre: string; total: number }>();
    for (const v of ventas) {
      if (!v.producto_id) continue;
      const p = productos.find((p) => p.id === v.producto_id);
      const nombre = p?.nombre || "Producto eliminado";
      const prev = map.get(v.producto_id) || { nombre, total: 0 };
      prev.total += v.total;
      map.set(v.producto_id, prev);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [ventas, productos]);

  const lowStock = useMemo(
    () =>
      productos
        .filter((p) => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5),
    [productos],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-36" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipStyle = isDark
    ? { backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 13 }
    : { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 };

  const balanceTrend = pctLabel(sums.balance, sums.balancePrev);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Hola, {profile?.nombre || "bienvenido"} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {profile?.nombre_negocio ? `${profile.nombre_negocio} · ` : ""}
            Así va tu negocio
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                period === p
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjeta de balance */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-emerald-500 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-50/90">
            <Scale className="h-4 w-4" /> Balance · {PERIOD_LABELS[period]}
          </span>
          {balanceTrend && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                balanceTrend.positive ? "bg-white/20" : "bg-rose-500/30"
              }`}
            >
              {balanceTrend.positive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {balanceTrend.text}
            </span>
          )}
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {formatMoney(sums.balance, moneda)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-50/80">
              <TrendingUp className="h-3.5 w-3.5" /> Ingresos
            </p>
            <p className="mt-0.5 text-lg font-bold">{formatMoney(sums.ingresos, moneda)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-50/80">
              <TrendingDown className="h-3.5 w-3.5" /> Egresos
            </p>
            <p className="mt-0.5 text-lg font-bold">{formatMoney(sums.egresos, moneda)}</p>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction href="/ventas" icon={<ShoppingCart className="h-5 w-5" />} label="Venta" />
        <QuickAction href="/gastos" icon={<Wallet className="h-5 w-5" />} label="Gasto" />
        <QuickAction href="/productos" icon={<Package className="h-5 w-5" />} label="Producto" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={`Ingresos (${PERIOD_LABELS[period].toLowerCase()})`}
          value={formatMoney(sums.ingresos, moneda)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
          trend={pctLabel(sums.ingresos, sums.ingresosPrev)}
        />
        <StatCard
          label={`Egresos (${PERIOD_LABELS[period].toLowerCase()})`}
          value={formatMoney(sums.egresos, moneda)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="rose"
          trend={pctLabel(sums.egresos, sums.egresosPrev)}
          invertTrend
        />
        <StatCard
          label="Margen de ganancia"
          value={`${sums.margen.toFixed(1)}%`}
          icon={<Percent className="h-5 w-5" />}
          tone="blue"
          hint="del período"
        />
        <StatCard
          label="Productos"
          value={String(productos.length)}
          icon={<Package className="h-5 w-5" />}
          tone="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Últimos 7 días
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ventas vs. gastos
              </p>
            </div>
            <Link
              href="/reportes"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Reportes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: tickColor }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: tickColor }} />
                <Tooltip
                  cursor={{ fill: isDark ? "rgba(148,163,184,0.06)" : "rgba(100,116,139,0.05)" }}
                  formatter={(value: number, name: string) => [
                    formatMoney(value, moneda),
                    name === "ventas" ? "Ventas" : "Gastos",
                  ]}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: isDark ? "#cbd5e1" : "#0f172a" }}
                />
                <Bar dataKey="ventas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="gastos" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Más vendidos
            </h2>
            <Link href="/productos" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
              Inventario
            </Link>
          </div>
          {topProductos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Aún no hay ventas.
            </p>
          ) : (
            <ul className="space-y-3">
              {topProductos.map((p, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {p.nombre}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatMoney(p.total, moneda)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Stock bajo
            </h2>
            <Link href="/productos" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
              Ver todo
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <PackageOpen className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Sin productos con stock bajo.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {p.nombre}
                  </span>
                  <Badge tone={p.stock <= 0 ? "rose" : "amber"}>
                    {p.stock <= 0 ? "Agotado" : `${p.stock} u.`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {ventas.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Últimas ventas
              </h2>
              <Link href="/ventas" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {ventas.slice(0, 5).map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      {v.descripcion || "Venta"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(v.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {v.metodo_pago}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatMoney(v.total, moneda)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        {icon}
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Plus className="h-3.5 w-3.5" /> {label}
      </span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  trend,
  invertTrend,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "rose" | "blue";
  trend?: { text: string; positive: boolean } | null;
  invertTrend?: boolean;
  hint?: string;
}) {
  const tones = {
    green: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    blue: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  };

  let trendPositive: boolean | null = null;
  let trendText = "";
  if (trend) {
    trendPositive = invertTrend ? !trend.positive : trend.positive;
    trendText = trend.text;
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
        <p className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
          {value}
        </p>
        {trendText && trendPositive !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {trendPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trendText}
          </span>
        )}
        {hint && <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
      </div>
    </Card>
  );
}
