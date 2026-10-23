"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setMessage("Supabase no configurado. Modo demo.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "signin") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push("/app");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Acceso</h1>
      <p className="mt-2 text-muted-foreground">
        Autenticación con Supabase. La demo usa datos ficticios.
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-3 p-6">
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" onClick={submit} disabled={loading}>
            {mode === "signin" ? "Entrar" : "Crear cuenta"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
