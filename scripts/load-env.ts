import fs from "node:fs";
import path from "node:path";

/**
 * Carga `.env.local` para los scripts de línea de comandos sin depender de
 * `--env-file` (y sin romperse con el BOM que añade PowerShell). No sobreescribe
 * variables que ya vengan del entorno: en CI se usan los secretos reales.
 */
export function loadLocalEnv(file = ".env.local") {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return false;

  const raw = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (process.env[name]) continue;
    process.env[name] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return true;
}

loadLocalEnv();
