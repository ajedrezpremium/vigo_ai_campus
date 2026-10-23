export default function ImplantacionPage() {
  const steps = [
    "Preparar demo con datos ficticios y fuentes públicas autorizadas.",
    "Identificar un servicio o facultad colaboradora.",
    "Seleccionar un conjunto limitado de preguntas frecuentes.",
    "Validar respuestas con responsables del proceso.",
    "Medir calidad, derivación, satisfacción y costes.",
    "Proponer expansión solo si los resultados lo justifican.",
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Implantación</h1>
      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-sm">
            <span className="font-semibold text-primary">{i + 1}.</span>
            <span className="text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
