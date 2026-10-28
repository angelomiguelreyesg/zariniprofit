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
import { Card, Skeleton, Badge } from "@/components/ui";
import { formatMoney, startOfDay } from "@/lib/utils";
import type { Venta, Gasto, Producto } from "@/lib/types";

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

type Totals = {
  hoyVentas: number;
  hoyGastos: number;
  mesVentas: number;
  mesGastos: number;
};

export default function DashboardPage() {
  const { user, profile } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

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
          .limit(500),
        supabase
          .from("gastos")
          .select("id, monto, categoria, fecha")
          .order("fecha", { ascending: false })
          .limit(500),
        supabase.from("productos").select("id, nombre, stock").limit(1000),
      ]);
      setVentas((v.data as Venta[]) ?? []);
      setGastos((g.data as Gasto[]) ?? []);
      setProductos((p.data as Producto[]) ?? []);
      setLoading(false);
    }

    load();
  }, [user]);

  const totals = useMemo<Totals>(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let hoyVentas = 0;
    let mesVentas = 0;
    for (const v of ventas) {
      const t = new Date(v.fecha).getTime();
      if (t >= todayStart) hoyVentas += v.total;
      if (t >= monthStart) mesVentas += v.total;
    }

    let hoyGastos = 0;
    let mesGastos = 0;
    for (const g of gastos) {
      const t = new Date(g.fecha).getTime();
      if (t >= todayStart) hoyGastos += g.monto;
      if (t >= monthStart) mesGastos += g.monto;
    }

    return { hoyVentas, hoyGastos, mesVentas, mesGastos };
  }, [ventas, gastos]);

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
    () => productos.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 5),
    [productos],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const hoyGanancia = totals.hoyVentas - totals.hoyGastos;
  const mesGanancia = totals.mesVentas - totals.mesGastos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hola, {profile?.nombre || "bienvenido"} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Así va tu negocio {profile?.nombre_negocio ? `— ${profile.nombre_negocio}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={formatMoney(totals.hoyVentas, moneda)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Gastos de hoy"
          value={formatMoney(totals.hoyGastos, moneda)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          label="Ganancia de hoy"
          value={formatMoney(hoyGanancia, moneda)}
          icon={<Wallet className="h-5 w-5" />}
          tone={hoyGanancia >= 0 ? "green" : "rose"}
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
              <h2 className="font-semibold text-slate-900">Últimos 7 días</h2>
              <p className="text-sm text-slate-500">Ventas vs. gastos</p>
            </div>
            <Link
              href="/reportes"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Reportes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatMoney(value, moneda),
                    name === "ventas" ? "Ventas" : "Gastos",
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Bar dataKey="ventas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="gastos" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-semibold text-slate-900">Resumen del mes</h2>
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Ventas" value={formatMoney(totals.mesVentas, moneda)} positive />
              <SummaryRow label="Gastos" value={formatMoney(totals.mesGastos, moneda)} />
              <div className="border-t border-slate-100 pt-3">
                <SummaryRow
                  label="Ganancia neta"
                  value={formatMoney(mesGanancia, moneda)}
                  positive={mesGanancia >= 0}
                  bold
                />
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Productos más vendidos</h2>
            <Link href="/productos" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Inventario
            </Link>
          </div>
          {topProductos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Aún no hay ventas.</p>
          ) : (
            <ul className="space-y-3">
              {topProductos.map((p, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-700">
                    {p.nombre}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatMoney(p.total, moneda)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Stock bajo</h2>
            <Link href="/productos" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Ver todo
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <PackageOpen className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">Sin productos con stock bajo.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <span className="flex-1 truncate text-sm font-medium text-slate-700">
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
      </div>

      {ventas.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Últimas ventas</h2>
            <Link href="/ventas" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {ventas.slice(0, 5).map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {v.descripcion || "Venta"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(v.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {v.metodo_pago}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatMoney(v.total, moneda)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
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

function SummaryRow({
  label,
  value,
  positive,
  bold,
}: {
  label: string;
  value: string;
  positive?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`${
          bold ? "text-base font-bold" : "font-medium"
        } ${positive ? "text-brand-600" : "text-slate-900"}`}
      >
        {value}
      </dd>
    </div>
  );
}
