"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function ContactoPage() {
  const { t } = useI18n();
  const copy = t.contact;
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
      setSent(copy.sent.replace("{id}", String(data.id ?? "")));
    } catch {
      setSent(copy.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">{copy.title}</h1>
      <p className="mt-2 text-muted-foreground">{copy.intro}</p>
      <Card className="mt-6">
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            {copy.categories.map((option) => (
              <Button
                key={option.value}
                variant={category === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Input placeholder={copy.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={copy.emailPlaceholder} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Textarea placeholder={copy.messagePlaceholder} value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button onClick={submit} disabled={loading || !message.trim()}>
            {t.common.send}
          </Button>
          {sent && <p className="text-sm text-emerald-700">{sent}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
