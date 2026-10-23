"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactoPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Contacto</h1>
      <p className="mt-2 text-muted-foreground">Formulario de demostración (no envía emails reales).</p>
      <Card className="mt-6">
        <CardContent className="space-y-3 p-6">
          <Input placeholder="Nombre" />
          <Input placeholder="Email" type="email" />
          <Textarea placeholder="Mensaje" />
          <Button onClick={() => setSent(true)}>Enviar</Button>
          {sent && <p className="text-sm text-emerald-700">Mensaje registrado en demo.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
