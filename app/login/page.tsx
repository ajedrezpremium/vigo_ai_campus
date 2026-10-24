"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.includes("@") || password.length < 6) {
      setError("Introduce un email válido y una contraseña de al menos 6 caracteres.");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase no está configurado en este entorno. Puedes usar la demo sin cuenta.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Cuenta creada. Revisa tu email para confirmarla y después inicia sesión.");
          setMode("signin");
          return;
        }
      }

      const provision = await fetch("/api/auth/provision", { method: "POST" });
      const data = await provision.json().catch(() => ({}));
      const role = data?.role as string | undefined;
      router.push(role === "org_admin" || role === "admin" ? "/admin" : "/app");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="relative mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Acceso</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Tu campus,
            <br />
            <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">sin perder el hilo.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Con una cuenta guardas el historial, creas derivaciones y accedes al panel según tu rol:
            estudiante, PAS, PDI o administración.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            {["Historial persistente en Supabase", "Roles y permisos por organización", "Auditoría de accesos y consultas"].map((item) => (
              <li key={item} className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> {item}</li>
            ))}
          </ul>
        </div>

        <Card className="border-white/80 bg-white/90 shadow-xl backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-950">{mode === "signin" ? "Entrar" : "Crear cuenta"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signin" ? "Accede con tu email y contraseña." : "Te asignaremos la organización demo y un rol inicial."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@uvigo.gal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                  aria-describedby="email-help"
                />
                <p id="email-help" className="mt-1 text-xs text-slate-400">Usa el email con el que quieras identificarte.</p>
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Procesando…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setMessage(null);
              }}
            >
              {mode === "signin" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
            </Button>

            <p className="mt-4 text-center text-xs text-slate-500">
              ¿Solo quieres probar?{" "}
              <Link href="/app/chat" className="font-medium text-primary underline-offset-2 hover:underline">
                Usar la demo sin cuenta
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
