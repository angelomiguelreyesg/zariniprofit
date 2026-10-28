"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  PackageOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { Card, Modal, EmptyState, Spinner, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { Producto } from "@/lib/types";

const CATEGORIAS_SUGERIDAS = [
  "Bebidas",
  "Alimentos",
  "Limpieza",
  "Papelería",
  "Ferretería",
  "Tecnología",
  "Ropa",
  "Otro",
];

type FormState = {
  nombre: string;
  categoria: string;
  precio_venta: string;
  costo: string;
  stock: string;
  imagen_url: string;
};

const EMPTY_FORM: FormState = {
  nombre: "",
  categoria: "",
  precio_venta: "",
  costo: "",
  stock: "",
  imagen_url: "",
};

export default function ProductosPage() {
  const { user, profile } = useApp();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Producto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const moneda = profile?.moneda || "COP";

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("created_at", { ascending: false });
    setProductos((data as Producto[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const categorias = useMemo(() => {
    const set = new Set<string>(CATEGORIAS_SUGERIDAS);
    productos.forEach((p) => p.categoria && set.add(p.categoria));
    return [...set].sort();
  }, [productos]);

  const filtered = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return productos.filter((p) => {
      const matchQ =
        !q || p.nombre.toLowerCase().includes(q) || (p.categoria?.toLowerCase().includes(q) ?? false);
      const matchC = !categoriaFiltro || p.categoria === categoriaFiltro;
      return matchQ && matchC;
    });
  }, [productos, busqueda, categoriaFiltro]);

  const stats = useMemo(() => {
    const valorInventario = productos.reduce((a, p) => a + p.costo * p.stock, 0);
    const gananciaPotencial = productos.reduce(
      (a, p) => a + (p.precio_venta - p.costo) * p.stock,
      0,
    );
    const bajo = productos.filter((p) => p.stock <= 5).length;
    return { valorInventario, gananciaPotencial, bajo };
  }, [productos]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: Producto) {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria ?? "",
      precio_venta: String(p.precio_venta),
      costo: String(p.costo),
      stock: String(p.stock),
      imagen_url: p.imagen_url ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim() || null,
      precio_venta: Number(form.precio_venta) || 0,
      costo: Number(form.costo) || 0,
      stock: Number(form.stock) || 0,
      imagen_url: form.imagen_url.trim() || null,
    };

    let err = null;
    if (editing) {
      const { error } = await supabase
        .from("productos")
        .update(payload)
        .eq("id", editing.id);
      err = error;
    } else {
      const { error } = await supabase.from("productos").insert(payload);
      err = error;
    }
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("productos").delete().eq("id", toDelete.id);
    setDeleting(false);
    setToDelete(null);
    await load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Productos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {productos.length} producto{productos.length !== 1 && "s"} en inventario
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo producto
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Valor inventario" value={formatMoney(stats.valorInventario, moneda)} />
        <MiniStat label="Ganancia potencial" value={formatMoney(stats.gananciaPotencial, moneda)} tone="green" />
        <MiniStat label="Stock bajo" value={String(stats.bajo)} tone="amber" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-6 w-6" />}
          title={productos.length === 0 ? "Aún no tienes productos" : "Sin resultados"}
          description={
            productos.length === 0
              ? "Agrega tu primer producto para empezar a vender."
              : "Prueba con otra búsqueda o categoría."
          }
          action={
            productos.length === 0 ? (
              <button onClick={openNew} className="btn-primary">
                <Plus className="h-4 w-4" /> Agregar producto
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Tabla escritorio */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <th className="px-5 py-3 font-medium">Producto</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 text-right font-medium">Precio</th>
                  <th className="px-5 py-3 text-right font-medium">Costo</th>
                  <th className="px-5 py-3 text-right font-medium">Stock</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb p={p} size="sm" />
                        <span className="font-medium text-slate-900 dark:text-white">
                          {p.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {p.categoria ? <Badge tone="slate">{p.categoria}</Badge> : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900 dark:text-white">
                      {formatMoney(p.precio_venta, moneda)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">
                      {formatMoney(p.costo, moneda)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone={p.stock <= 0 ? "rose" : p.stock <= 5 ? "amber" : "green"}>
                        {p.stock} u.
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToDelete(p)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cards móvil */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb p={p} size="md" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{p.nombre}</p>
                      {p.categoria && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">{p.categoria}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(p)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatMoney(p.precio_venta, moneda)}
                  </span>
                  <Badge tone={p.stock <= 0 ? "rose" : p.stock <= 5 ? "amber" : "green"}>
                    {p.stock} u. en stock
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar producto" : "Nuevo producto"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej. Café grande"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Precio de venta</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.precio_venta}
                onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Costo</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.costo}
                onChange={(e) => setForm({ ...form, costo: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stock</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Categoría</label>
              <input
                className="input"
                list="categorias"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Bebidas"
              />
              <datalist id="categorias">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="label">
              URL de imagen{" "}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                (opcional)
              </span>
            </label>
            <input
              className="input"
              value={form.imagen_url}
              onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
              placeholder="https://…"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmar eliminación */}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar producto"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Seguro que quieres eliminar{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {toDelete?.nombre}
          </span>
          ? Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setToDelete(null)}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger flex-1"
          >
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

function ProductThumb({ p, size = "sm" }: { p: Producto; size?: "sm" | "md" }) {
  const sizes = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  if (p.imagen_url) {
    return (
      <img
        src={p.imagen_url}
        alt={p.nombre}
        className={`${sizes} shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className={`${sizes} flex shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400`}
    >
      <Package className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </div>
  );
}
