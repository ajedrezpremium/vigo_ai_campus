export default function SeguridadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Seguridad y privacidad</h1>
      <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
        <li>RLS y aislamiento por organización en el esquema Supabase incluido.</li>
        <li>Las claves privadas solo se usan en backend; no se exponen en el cliente.</li>
        <li>Minimización de datos personales enviados al proveedor de IA.</li>
        <li>Contenido de documentos tratado como datos no confiables, nunca como instrucciones.</li>
        <li>Esta demo almacena conversaciones en el navegador; no es apta para datos personales reales.</li>
      </ul>
    </div>
  );
}
