import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  { name: "Demo", price: "Gratis", text: "Datos ficticios, sin soporte." },
  { name: "Campus Start", price: "300–600 €/mes", text: "Hipótesis orientativa para validación." },
  { name: "Campus Pro", price: "900–1.800 €/mes", text: "Hipótesis orientativa para validación." },
  { name: "Enterprise", price: "Desde 2.500 €/mes", text: "Implantación y seguridad a medida." },
];

export default function PreciosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Precios</h1>
      <p className="mt-2 text-muted-foreground">
        Valores orientativos para validación, no ofertas contractuales.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <CardTitle className="text-base">{p.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-primary">{p.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
