"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  User,
  Phone,
  CheckCircle2,
  Undo2,
  HandCoins,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { Card, Modal, EmptyState, Spinner, Badge } from "@/components/ui";
import BulkBar from "@/components/bulk-bar";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import ProductCart, {
  type CartItem,
  cartTotal,
  cartTotalUnits,
} from "@/components/product-cart";
import { formatMoney, formatDate, toLocalDateStr, toTimestamp } from "@/lib/utils";
import type { Deudor, Producto } from "@/lib/types";

type Filtro = "todos" | "pendiente" | "pagado";

export default function DeudoresPage() {
  const { user, profile } = useApp();
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Deudor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restaurarStock, setRestaurarStock] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState(toLocalDateStr(new Date()));
  const [items, setItems] = useState<CartItem[]>([]);

  const moneda = profile?.moneda || "COP";

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [d, p] = await Promise.all([
      supabase
        .from("deudores")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("productos").select("*").order("nombre"),
    ]);
    setDeudores((d.data as Deudor[]) ?? []);
    setProductos((p.data as Producto[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    let porCobrar = 0;
    let cobrado = 0;
    let pendientes = 0;
    for (const d of deudores) {
      if (d.estado === "pagado") cobrado += d.total;
      else {
        porCobrar += d.total;
        pendientes++;
      }
    }
    return { porCobrar, cobrado, pendientes };
  }, [deudores]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return deudores;
    return deudores.filter((d) => d.estado === filtro);
  }, [deudores, filtro]);

  const { selected, toggle, selectAll, clear, allSelected } = useBulkSelect(filtrados);

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const supabase = createClient();

    const { data: deudoresSel } = await supabase
      .from("deudores")
      .select("id, items, venta_id")
      .in("id", ids);

    if (restaurarStock) {
      const qtyByProduct = new Map<string, number>();
      for (const d of deudoresSel || []) {
        for (const it of d.items || []) {
          if (it.producto_id) {
            qtyByProduct.set(
              it.producto_id,
              (qtyByProduct.get(it.producto_id) || 0) + Number(it.cantidad),
            );
          }
        }
      }
      for (const [pid, qty] of qtyByProduct) {
        const { data: prod } = await supabase
          .from("productos")
          .select("stock")
          .eq("id", pid)
          .single();
        if (prod) {
          await supabase
            .from("productos")
            .update({ stock: Number(prod.stock) + qty })
            .eq("id", pid);
        }
      }
      const ventaIds = (deudoresSel || [])
        .map((d) => d.venta_id)
        .filter(Boolean) as string[];
      if (ventaIds.length) {
        await supabase.from("ventas").delete().in("id", ventaIds);
      }
    }

    await supabase.from("deudores").delete().in("id", ids);

    setBulkDeleting(false);
    clear();
    setBulkOpen(false);
    await load();
  }

  function openForm() {
    setNombre("");
    setTelefono("");
    setFecha(toLocalDateStr(new Date()));
    setItems([]);
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre del deudor es obligatorio.");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un producto o concepto.");
      return;
    }

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
      if (p && qty > Number(p.stock)) {
        setError(
          `Stock insuficiente de "${p.nombre}": disponible ${p.stock}, pides ${qty}.`,
        );
        return;
      }
    }

    const total = cartTotal(items);
    const descripcion = items
      .map((i) => `${i.descripcion}${i.cantidad > 1 ? ` x${i.cantidad}` : ""}`)
      .join(", ");

    setSaving(true);
    const supabase = createClient();
    const ts = toTimestamp(fecha, "12:00");

    const { error: deudorError } = await supabase.from("deudores").insert({
      user_id: user.id,
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      producto_id: null,
      descripcion,
      items: items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
      cantidad: cartTotalUnits(items),
      total,
      estado: "pendiente",
      fecha: ts,
    });

    if (deudorError) {
      setSaving(false);
      setError(deudorError.message);
      return;
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

    setSaving(false);
    setModalOpen(false);
    await load();
  }

  async function toggleEstado(d: Deudor) {
    if (!user) return;
    const supabase = createClient();
    const pagado = d.estado === "pagado";

    if (pagado) {
      if (d.venta_id) {
        await supabase.from("ventas").delete().eq("id", d.venta_id);
      }
      await supabase
        .from("deudores")
        .update({ estado: "pendiente", fecha_pago: null, venta_id: null })
        .eq("id", d.id);
    } else {
      const cantidad = Number(d.cantidad) || 1;
      const total = Number(d.total) || 0;
      const descripcion = `${d.nombre}${d.descripcion ? ` · ${d.descripcion}` : ""}`;

      const { data: ventaData, error: ventaError } = await supabase
        .from("ventas")
        .insert({
          user_id: user.id,
          producto_id: null,
          descripcion,
          cantidad,
          precio_unitario: total / cantidad,
          total,
          metodo_pago: "Crédito",
          fecha: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (ventaError || !ventaData) return;

      await supabase
        .from("deudores")
        .update({
          estado: "pagado",
          fecha_pago: new Date().toISOString(),
          venta_id: ventaData.id,
        })
        .eq("id", d.id);
    }

    await load();
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const supabase = createClient();

    if (restaurarStock) {
      const itemsData = (toDelete.items || []).filter((i) => i.producto_id);
      for (const it of itemsData) {
        const { data: prod } = await supabase
          .from("productos")
          .select("stock")
          .eq("id", it.producto_id)
          .single();
        if (prod) {
          await supabase
            .from("productos")
            .update({ stock: Number(prod.stock) + Number(it.cantidad) })
            .eq("id", it.producto_id);
        }
      }
    }

    if (restaurarStock && toDelete.venta_id) {
      await supabase.from("ventas").delete().eq("id", toDelete.venta_id);
    }

    await supabase.from("deudores").delete().eq("id", toDelete.id);
    setDeleting(false);
    setToDelete(null);
    await load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Deudores</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controla quién te debe y cuánto
          </p>
        </div>
        <button onClick={openForm} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo deudor
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Por cobrar" value={formatMoney(stats.porCobrar, moneda)} tone="amber" />
        <MiniStat label="Cobrado" value={formatMoney(stats.cobrado, moneda)} tone="green" />
        <MiniStat label="Pendientes" value={String(stats.pendientes)} />
      </div>

      <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        {(["todos", "pendiente", "pagado"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
              filtro === f
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {f === "todos" ? "Todos" : f === "pendiente" ? "Pendientes" : "Pagados"}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-6 w-6" />}
          title="No hay deudores"
          description={
            filtro === "todos"
              ? "Registra a la primera persona que te deba para llevar el control."
              : `No hay deudores en estado "${filtro}".`
          }
          action={
            <button onClick={openForm} className="btn-primary">
              <Plus className="h-4 w-4" /> Nuevo deudor
            </button>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
          <div className="flex items-center gap-3 px-5 py-2.5">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={selectAll}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Seleccionar todos
            </span>
          </div>
          {filtrados.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() => toggle(d.id)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
              />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {d.nombre}
                  </p>
                  <Badge tone={d.estado === "pagado" ? "green" : "amber"}>
                    {d.estado === "pagado" ? "Pagado" : "Pendiente"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                  {d.descripcion || "Crédito"}
                  {d.telefono ? ` · ${d.telefono}` : ""} · {formatDate(d.fecha)}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatMoney(d.total, moneda)}
              </p>
              <div className="ml-1 flex gap-1">
                <button
                  onClick={() => toggleEstado(d)}
                  title={d.estado === "pagado" ? "Marcar como pendiente" : "Marcar como pagado"}
                  className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10"
                >
                  {d.estado === "pagado" ? (
                    <Undo2 className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setRestaurarStock(true);
                    setToDelete(d);
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo deudor"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="label">Teléfono</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                className="input pl-9"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="300 123 4567"
              />
            </div>
          </div>

          <ProductCart
            productos={productos}
            moneda={moneda}
            items={items}
            onChange={setItems}
          />

          <div>
            <label className="label">Fecha</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                className="input pl-9"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Guardando…" : "Registrar deuda"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar deudor"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Eliminar a{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {toDelete?.nombre}
          </span>{" "}
          y su deuda de {toDelete ? formatMoney(toDelete.total, moneda) : ""}?
        </p>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600">
          <input
            type="checkbox"
            checked={restaurarStock}
            onChange={(e) => setRestaurarStock(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Devolver productos al inventario
          </span>
        </label>

        <div className="mt-6 flex gap-3">
          <button onClick={() => setToDelete(null)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1">
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Modal>

      {/* Confirmar eliminación en lote */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Eliminar deudores"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Eliminar {selected.size} deudor{selected.size !== 1 ? "es" : ""}?
        </p>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600">
          <input
            type="checkbox"
            checked={restaurarStock}
            onChange={(e) => setRestaurarStock(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Devolver productos al inventario
          </span>
        </label>

        <div className="mt-6 flex gap-3">
          <button onClick={() => setBulkOpen(false)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleBulkDelete} disabled={bulkDeleting} className="btn-danger flex-1">
            {bulkDeleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Modal>

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onClear={clear}
          onDelete={() => {
            setRestaurarStock(true);
            setBulkOpen(true);
          }}
          deleting={bulkDeleting}
        />
      )}
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
  tone?: "slate" | "green" | "amber";
}) {
  const tones = {
    slate: "text-slate-900 dark:text-white",
    green: "text-brand-600 dark:text-brand-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-base font-bold sm:text-lg ${tones[tone]}`}>
        {value}
      </p>
    </Card>
  );
}
