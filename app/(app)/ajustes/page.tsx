"use client";

import { useEffect, useState } from "react";
import { Save, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/ui";
import { MONEDAS } from "@/lib/types";

export default function AjustesPage() {
  const { user, profile, loading } = useApp();
  const [nombre, setNombre] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [moneda, setMoneda] = useState("COP");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? "");
      setNombreNegocio(profile.nombre_negocio ?? "");
      setMoneda(profile.moneda ?? "COP");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ nombre, nombre_negocio: nombreNegocio, moneda })
      .eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ajustes</h1>
        <p className="text-sm text-slate-500">
          Personaliza tu perfil y tu negocio
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white">
                {(profile?.nombre?.[0] || user?.email?.[0] || "?").toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{profile?.nombre || "Usuario"}</p>
                <p className="text-sm text-slate-500">{profile?.email}</p>
              </div>
            </div>

            <div>
              <label className="label">Tu nombre</label>
              <input
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Nombre del negocio</label>
              <input
                className="input"
                value={nombreNegocio}
                onChange={(e) => setNombreNegocio(e.target.value)}
                placeholder="Mi Tienda"
              />
            </div>

            <div>
              <label className="label">Moneda</label>
              <select
                className="input"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
              >
                {MONEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-400">
                Se usará para mostrar todos los montos de la app.
              </p>
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" />
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            {saved && (
              <span className="ml-3 text-sm font-medium text-brand-600">
                ¡Cambios guardados!
              </span>
            )}
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-400">
            <User className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900">Cuenta</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Tu cuenta está protegida con autenticación segura. Para cambiar tu
            contraseña usa el enlace de recuperación en la pantalla de inicio de
            sesión.
          </p>
        </Card>
      </div>
    </div>
  );
}
