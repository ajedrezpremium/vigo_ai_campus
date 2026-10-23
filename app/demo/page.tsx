import { ChatInterface } from "@/components/chat-interface";

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-primary">Demo conversacional</h1>
      <p className="mt-2 text-muted-foreground">
        Prueba el superagente con fuentes ficticias etiquetadas. No se presentan solicitudes oficiales.
      </p>
      <div className="mt-6">
        <ChatInterface showDemoBanner />
      </div>
    </div>
  );
}
