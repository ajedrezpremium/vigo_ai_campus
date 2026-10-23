import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppDashboard() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Espacio de trabajo del usuario (demo).</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Chat</CardTitle></CardHeader>
          <CardContent><Button render={<Link href="/app/chat" />}>Abrir superagente</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
          <CardContent><Button render={<Link href="/app/historial" />} variant="outline">Ver conversaciones</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Solicitudes</CardTitle></CardHeader>
          <CardContent><Button render={<Link href="/app/solicitudes" />} variant="outline">Ver derivaciones</Button></CardContent>
        </Card>
      </div>
    </div>
  );
}
