"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/logo";

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          nombre_negocio: nombreNegocio,
        },
        emailRedirectTo: `${window.location.origin}/app/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      window.location.href = "/app/dashboard";
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <MailCheck className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Revisa tu correo</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          Te enviamos un enlace para confirmar tu cuenta. Ábrelo para empezar a
          usar ZariniProfit.
        </p>
        <Link href="/login" className="btn-primary mt-8 w-full">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 lg:hidden">
        <Logo />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Crear cuenta</h2>
      <p className="mt-1 text-sm text-slate-500">
        Empieza a controlar tu negocio hoy.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="nombre">
            Tu nombre
          </label>
          <input
            id="nombre"
            type="text"
            required
            className="input"
            placeholder="Juan Pérez"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="negocio">
            Nombre del negocio{" "}
            <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="negocio"
            type="text"
            className="input"
            placeholder="Mi Tienda"
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="input"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creando cuenta…
            </>
          ) : (
            "Crear cuenta"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-600 hover:text-brand-700"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
