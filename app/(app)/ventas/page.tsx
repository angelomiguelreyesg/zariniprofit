"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ShoppingCart, Trash2, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { Card, Modal, EmptyState, Spinner, Badge } from "@/components/ui";
import { formatMoney, formatDateTime, startOfDay } from "@/lib/utils";
import { METODOS_PAGO } from "@/lib/types";
import type { Venta, Producto } from "@/lib/types";

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

  const [productoId, setProductoId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  const moneda = profile?.moneda || "COP";

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [v, p] = await Promise.all([
      supabase
        .from("ventas")
        .select("*, producto:productos(nombre)")
        .order("fecha", { ascending: false })
        .limit(300),
      supabase.from("productos").select("*").order("nombre"),
    ]);
    setVentas((v.data as Venta[]) ?? []);
    setProductos((p.data as Producto[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const total = (Number(cantidad) || 0) * (Number(precio) || 0);

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

  function handleSelectProducto(id: string) {
    setProductoId(id);
    if (!id) {
      setPrecio("");
      return;
    }
    const p = productos.find((x) => x.id === id);
    if (p) setPrecio(String(p.precio_venta));
  }

  function resetForm() {
    setProductoId("");
    setDescripcion("");
    setCantidad("1");
    setPrecio("");
    setMetodoPago("Efectivo");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const cantidadNum = Number(cantidad);
    const precioNum = Number(precio);
    if (cantidadNum <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }
    if (precioNum < 0) {
      setError("El precio no puede ser negativo.");
      return;
    }
    const producto = productoId ? productos.find((p) => p.id === productoId) : null;
    if (!producto && !descripcion.trim()) {
      setError("Selecciona un producto o escribe una descripción.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("ventas").insert({
      user_id: user.id,
      producto_id: productoId || null,
      descripcion: producto ? producto.nombre : descripcion.trim(),
      cantidad: cantidadNum,
      precio_unitario: precioNum,
      total: cantidadNum * precioNum,
      metodo_pago: metodoPago,
    });

    if (!insertError && producto) {
      await supabase
        .from("productos")
        .update({ stock: Math.max(0, Number(producto.stock) - cantidadNum) })
        .eq("id", producto.id);
    }

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setFormOpen(false);
    resetForm();
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
          <p className="text-sm text-slate-500 dark:text-slate-400">Registra y revisa tus ventas</p>
        </div>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="btn-primary">
          <Plus className="h-4 w-4" /> Nueva venta
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Ventas de hoy" value={formatMoney(stats.totalHoy, moneda)} tone="green" />
        <MiniStat label="Ventas totales" value={formatMoney(stats.totalGeneral, moneda)} />
        <MiniStat label="Registros" value={String(ventas.length)} />
      </div>

      {ventas.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Aún no hay ventas"
          description="Registra tu primera venta para llevar el control de tu negocio."
          action={
            <button onClick={() => { resetForm(); setFormOpen(true); }} className="btn-primary">
              <Plus className="h-4 w-4" /> Registrar venta
            </button>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {ventas.map((v) => (
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
          <div>
            <label className="label">Producto</label>
            <select
              className="input"
              value={productoId}
              onChange={(e) => handleSelectProducto(e.target.value)}
            >
              <option value="">— Venta libre (sin producto) —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {formatMoney(p.precio_venta, moneda)}
                </option>
              ))}
            </select>
          </div>

          {!productoId && (
            <div>
              <label className="label">Descripción</label>
              <input
                className="input"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Venta de mostrador"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Precio unitario</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0"
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

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Total
            </span>
            <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
              {formatMoney(total, moneda)}
            </span>
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
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-base font-bold sm:text-lg ${tone === "green" ? "text-brand-600 dark:text-brand-400" : "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
    </Card>
  );
}
