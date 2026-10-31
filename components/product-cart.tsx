"use client";

import { useState } from "react";
import { Plus, Trash2, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Producto } from "@/lib/types";

export type CartItem = {
  key: string;
  productoId: string | null;
  descripcion: string;
  cantidad: number;
  precio: number;
};

function makeKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProductCart({
  productos,
  moneda,
  items,
  onChange,
}: {
  productos: Producto[];
  moneda: string;
  items: CartItem[];
  onChange: (items: CartItem[]) => void;
}) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [libreDesc, setLibreDesc] = useState("");
  const [librePrecio, setLibrePrecio] = useState("");

  function addProduct() {
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    onChange([
      ...items,
      {
        key: makeKey(),
        productoId: p.id,
        descripcion: p.nombre,
        cantidad: Number(cantidad) || 1,
        precio: p.precio_venta,
      },
    ]);
    setProductoId("");
    setCantidad("1");
  }

  function addLibre() {
    const precio = Number(librePrecio) || 0;
    if (!libreDesc.trim() && precio <= 0) return;
    onChange([
      ...items,
      {
        key: makeKey(),
        productoId: null,
        descripcion: libreDesc.trim() || "Concepto",
        cantidad: 1,
        precio,
      },
    ]);
    setLibreDesc("");
    setLibrePrecio("");
  }

  function remove(key: string) {
    onChange(items.filter((i) => i.key !== key));
  }

  const total = items.reduce((a, i) => a + i.cantidad * i.precio, 0);

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Agregar producto</label>
        <div className="flex gap-2">
          <select
            className="input flex-1"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          >
            <option value="">Selecciona un producto…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {formatMoney(p.precio_venta, moneda)}
              </option>
            ))}
          </select>
          <input
            className="input w-20"
            type="number"
            min="0"
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Cant."
          />
          <button
            type="button"
            onClick={addProduct}
            disabled={!productoId}
            className="btn-secondary shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="label">Agregar concepto libre</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={libreDesc}
            onChange={(e) => setLibreDesc(e.target.value)}
            placeholder="Descripción"
          />
          <input
            className="input w-24"
            type="number"
            min="0"
            step="0.01"
            value={librePrecio}
            onChange={(e) => setLibrePrecio(e.target.value)}
            placeholder="Precio"
          />
          <button
            type="button"
            onClick={addLibre}
            disabled={!libreDesc.trim() && !(Number(librePrecio) > 0)}
            className="btn-secondary shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 py-6 text-center dark:border-slate-700">
          <ShoppingBag className="mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Aún no agregas productos.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item.descripcion}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {item.cantidad} × {formatMoney(item.precio, moneda)}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatMoney(item.cantidad * item.precio, moneda)}
              </span>
              <button
                type="button"
                onClick={() => remove(item.key)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          <li className="flex items-center justify-between bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Total
            </span>
            <span className="text-base font-bold text-brand-600 dark:text-brand-400">
              {formatMoney(total, moneda)}
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((a, i) => a + i.cantidad * i.precio, 0);
}

export function cartTotalUnits(items: CartItem[]): number {
  return items.reduce((a, i) => a + i.cantidad, 0);
}
