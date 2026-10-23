"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  { value: "profesor", label: "Profesorado" },
  { value: "alumno", label: "Alumnado" },
  { value: "pas", label: "Personal no docente" },
  { value: "proveedor", label: "Proveedores" },
  { value: "colaborador", label: "Colaboradores" },
];

export default function ContactoPage() {
  const [category, setCategory] = useState("alumno");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: `[${category}] ${name} <${email}>: ${message}`, category }),
      });
      const data = await res.json();
      setSent(`Solicitud registrada (demo) con id ${data.id}`);
    } catch {
      setSent("Error al registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Contacto</h1>
      <p className="mt-2 text-muted-foreground">Selecciona tu perfil y envía tu consulta.</p>
      <Card className="mt-6">
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Button
                key={c.value}
                variant={category === c.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Textarea placeholder="Mensaje" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button onClick={submit} disabled={loading || !message.trim()}>
            Enviar
          </Button>
          {sent && <p className="text-sm text-emerald-700">{sent}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
