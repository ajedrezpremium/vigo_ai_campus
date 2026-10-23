import { DEMO_DOCUMENTS } from "@/data/demo-corpus";
export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">Fuentes y documentos (demo)</h1>
      <ul className="mt-4 space-y-2">
        {DEMO_DOCUMENTS.map((d) => (
          <li key={d.id} className="rounded border p-3 text-sm">
            <p className="font-medium">{d.title}</p>
            <p className="text-muted-foreground">
              {d.status} · {d.reviewedAt} · {d.sourceUrl}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
