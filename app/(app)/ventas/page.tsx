"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  ShoppingCart,
  Trash2,
  Receipt,
  CalendarDays,
  ListFilter,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { Card, Modal, EmptyState, Spinner } from "@/components/ui";
import Calendar from "@/components/calendar";
import ProductCart, { type CartItem } from "@/components/product-cart";
import {
  formatMoney,
  formatDateTime,
  startOfDay,
  toLocalDateStr,
  toTimestamp,
  isoToDateKey,
} from "@/lib/utils";
import { METODOS_PAGO } from "@/lib/types";
import type { Venta, Producto } from "@/lib/types";

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export default function VentasPage() {
  const { user, profile } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Venta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<CartItem[]>([]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [fecha, setFecha] = useState(toLocalDateStr(new Date()));
  const [hora, setHora] = useState("");

  const todayStr = toLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [monthView, setMonthView] = useState(new Date());
  const [showAll, setShowAll] = useState(false);

  const moneda = profile?.moneda || "COP";

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [v, p] = await Promise.all([
      supabase
        .from("ventas")
        .select("*, producto:productos(nombre)")
        .order("fecha", { ascending: false })
        .limit(500),
      supabase.from("productos").select("*").order("nombre"),
    ]);
    setVentas((v.data as Venta[]) ?? []);
    setProductos((p.data as Producto[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const hoy = startOfDay(new Date()).getTime();
    let totalGeneral = 0;
    let totalHoy = 0;
    for (const v of ventas) {
      totalGeneral += v.total;
      if (new Date(v.fecha).getTime() >= hoy) totalHoy += v.total;
    }
    return { totalGeneral, totalHoy };
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
    if (showAll) return ventas;
    return ventas.filter((v) => isoToDateKey(v.fecha) === selectedDate);
  }, [ventas, selectedDate, showAll]);

  const totalSelected = useMemo(
    () => ventasFiltradas.reduce((a, v) => a + v.total, 0),
    [ventasFiltradas],
  );

  function openForm(date?: string) {
    const d = date || selectedDate;
    setItems([]);
    setMetodoPago("Efectivo");
    setFecha(d);
    setHora(nowTimeStr());
    setError(null);
    setFormOpen(true);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setFecha(date);
    setShowAll(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (items.length === 0) {
      setError("Agrega al menos un producto o concepto.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const ts = toTimestamp(fecha, hora);

    const rows = items.map((item) => ({
      user_id: user.id,
      producto_id: item.productoId || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      total: item.cantidad * item.precio,
      metodo_pago: metodoPago,
      fecha: ts,
    }));

    const { error: insertError } = await supabase.from("ventas").insert(rows);

    if (!insertError) {
      const qtyByProduct = new Map<string, number>();
      for (const item of items) {
        if (item.productoId) {
          qtyByProduct.set(
            item.productoId,
            (qtyByProduct.get(item.productoId) || 0) + item.cantidad,
          );
        }
      }
      for (const [pid, qty] of qtyByProduct) {
        const p = productos.find((x) => x.id === pid);
        if (p) {
          await supabase
            .from("productos")
            .update({ stock: Math.max(0, Number(p.stock) - qty) })
            .eq("id", pid);
        }
      }
    }

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setFormOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("ventas").delete().eq("id", toDelete.id);
    setDeleting(false);
    setToDelete(null);
    await load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ventas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registra y revisa tus ventas por fecha
          </p>
        </div>
        <button onClick={() => openForm()} className="btn-primary">
          <Plus className="h-4 w-4" /> Nueva venta
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Ventas de hoy" value={formatMoney(stats.totalHoy, moneda)} tone="green" />
        <MiniStat label="Ventas totales" value={formatMoney(stats.totalGeneral, moneda)} />
        <MiniStat
          label={`Día (${fmtDay(selectedDate)})`}
          value={formatMoney(totalSelected, moneda)}
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <CalendarDays className="h-5 w-5" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Calendario</h2>
        </div>
        <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
          Toca un día para ver o registrar ventas en esa fecha.
        </p>
        <Calendar
          ventas={ventas}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          month={monthView}
          onMonthChange={setMonthView}
          moneda={moneda}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          {showAll ? "Todas las ventas" : `Ventas del ${fmtDay(selectedDate)}`}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAll((s) => !s)} className="btn-secondary">
            <ListFilter className="h-4 w-4" />
            {showAll ? "Ver por día" : "Ver todas"}
          </button>
          <button onClick={() => openForm()} className="btn-secondary">
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>
      </div>

      {ventasFiltradas.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title={showAll ? "Aún no hay ventas" : "Sin ventas en esta fecha"}
          description={
            showAll
              ? "Registra tu primera venta para llevar el control de tu negocio."
              : "No hay ventas registradas el día seleccionado."
          }
          action={
            <button onClick={() => openForm()} className="btn-primary">
              <Plus className="h-4 w-4" /> Registrar venta
            </button>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {ventasFiltradas.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {v.descripcion || "Venta libre"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDateTime(v.fecha)} · {v.metodo_pago}
                  {v.cantidad > 1 ? ` · ${v.cantidad} u.` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatMoney(v.total, moneda)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatMoney(v.precio_unitario, moneda)} c/u
                </p>
              </div>
              <button
                onClick={() => setToDelete(v)}
                className="ml-1 rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Nueva venta"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProductCart
            productos={productos}
            moneda={moneda}
            items={items}
            onChange={setItems}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input
                className="input"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Hora</label>
              <input
                className="input"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Método de pago</label>
            <select
              className="input"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Guardando…" : "Registrar venta"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar venta"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Eliminar esta venta por{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {toDelete ? formatMoney(toDelete.total, moneda) : ""}
          </span>
          ?
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setToDelete(null)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1">
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "green";
}) {
  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-base font-bold sm:text-lg ${tone === "green" ? "text-brand-600 dark:text-brand-400" : "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
    </Card>
  );
}
