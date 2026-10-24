export const instant = false;

import { AGENTS } from "@/lib/agents";
export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">Configuracion de agentes (demo)</h1>
      <ul className="mt-4 space-y-2">
        {AGENTS.map((a) => (
          <li key={a.slug} className="rounded border p-3">
            {a.name} â€” {a.slug}
          </li>
        ))}
      </ul>
    </div>
  );
}

