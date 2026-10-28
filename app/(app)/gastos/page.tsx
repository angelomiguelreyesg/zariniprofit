"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Wallet, Trash2, Pencil, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { Card, Modal, EmptyState, Spinner, Badge } from "@/components/ui";
import { formatMoney, formatDateTime, startOfDay } from "@/lib/utils";
import { CATEGORIAS_GASTO } from "@/lib/types";
import type { Gasto } from "@/lib/types";

type FormState = {
  descripcion: string;
  monto: string;
  categoria: string;
};

const EMPTY_FORM: FormState = { descripcion: "", monto: "", categoria: "Otro" };

export default function GastosPage() {
  const { user, profile } = useApp();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Gasto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const moneda = profile?.moneda || "COP";

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("gastos")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(300);
    setGastos((data as Gasto[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const hoy = startOfDay(new Date()).getTime();
    const mes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    let totalGeneral = 0;
    let totalHoy = 0;
    let totalMes = 0;
    for (const g of gastos) {
      totalGeneral += g.monto;
      const t = new Date(g.fecha).getTime();
      if (t >= hoy) totalHoy += g.monto;
      if (t >= mes) totalMes += g.monto;
    }
    return { totalGeneral, totalHoy, totalMes };
  }, [gastos]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(g: Gasto) {
    setEditing(g);
    setForm({
      descripcion: g.descripcion,
      monto: String(g.monto),
      categoria: g.categoria || "Otro",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!form.descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      user_id: user.id,
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto) || 0,
      categoria: form.categoria || null,
    };
    let err = null;
    if (editing) {
      const { error } = await supabase.from("gastos").update(payload).eq("id", editing.id);
      err = error;
    } else {
      const { error } = await supabase.from("gastos").insert(payload);
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
    await supabase.from("gastos").delete().eq("id", toDelete.id);
    setDeleting(false);
    setToDelete(null);
    await load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gastos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Lleva el control de tus egresos</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo gasto
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Gastos de hoy" value={formatMoney(stats.totalHoy, moneda)} tone="rose" />
        <MiniStat label="Gastos del mes" value={formatMoney(stats.totalMes, moneda)} />
        <MiniStat label="Gastos totales" value={formatMoney(stats.totalGeneral, moneda)} />
      </div>

      {gastos.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="Aún no hay gastos"
          description="Registra tus gastos para calcular tu ganancia real."
          action={
            <button onClick={openNew} className="btn-primary">
              <Plus className="h-4 w-4" /> Registrar gasto
            </button>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {gastos.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {g.descripcion}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDateTime(g.fecha)}
                  {g.categoria && (
                    <span className="ml-2">
                      <Badge tone="slate">{g.categoria}</Badge>
                    </span>
                  )}
                </p>
              </div>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                -{formatMoney(g.monto, moneda)}
              </p>
              <div className="ml-1 flex gap-1">
                <button
                  onClick={() => openEdit(g)}
                  className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(g)}
                  className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
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
        title={editing ? "Editar gasto" : "Nuevo gasto"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Descripción *</label>
            <input
              className="input"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej. Compra de insumos"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select
                className="input"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS_GASTO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar gasto"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar gasto"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Eliminar el gasto{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {toDelete?.descripcion}
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
  tone?: "slate" | "rose";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-base font-bold sm:text-lg ${tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
    </Card>
  );
}
