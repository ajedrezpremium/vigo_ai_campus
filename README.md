# VIGO AI CAMPUS

Superagente académico para la Universidade de Vigo: orientación sobre matrícula, becas, calendarios, movilidad y servicios con **fuentes oficiales citadas**, derivación humana y panel de administración multi-tenant.

> Demo académica independiente. No está afiliada ni respaldada por la Universidade de Vigo. Las fuentes oficiales se enlazan; las fuentes de demostración se etiquetan como no oficiales.

- Producción: <https://vigo-ai-campus.vercel.app/app>
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Supabase, OpenRouter.
- Corpus: 26 fuentes oficiales de `uvigo.gal` (23 HTML + 3 PDF), capturadas y versionadas.

## Arranque rápido

```bash
npm install
cp .env.example .env.local   # rellena las claves
npm run dev                  # http://localhost:3000
```

Comprobaciones:

```bash
npm test          # 18 tests de seguridad, roles, aislamiento multi-tenant, RAG y compositor
npm run lint
npm run build
```

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | sí | URL pública (OpenRouter `HTTP-Referer` y enlaces) |
| `NEXT_PUBLIC_SUPABASE_URL` | sí | Proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | Cliente y Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | Provisión de miembros, métricas y soporte (solo servidor) |
| `LLM_PROVIDER` | no | `openrouter` por defecto |
| `LLM_API_KEY` | sí | Clave de OpenRouter |
| `LLM_MODEL` | no | Primer modelo free; por defecto `google/gemma-4-31b-it:free` |
| `LLM_MODELS` | no | Lista separada por comas para fallback |
| `DEMO_ADMIN` | no | `true` solo en local: abre `/admin` sin Supabase. En producción el modo demo es estudiante. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | no | Rate limiting distribuido; si no se definen, se usa memoria por instancia. |
| `AI_MAX_OUTPUT_TOKENS` | no | 900 por defecto |
| `AI_DAILY_REQUEST_LIMIT` | no | 30 consultas/día por IP (además de 8/min) |
| `ADMIN_EMAILS` | no | Emails que se provisionan como administradores |
| `CRON_SECRET` | no | Protege `/api/cron/uvigo-sync` |
| `UVIGO_WEBHOOK_SECRET` | no | Firma HMAC del webhook UVigo |
| `UVIGO_SEDE_BASE_URL` / `_API_KEY` | no | Adaptador SEDE |
| `UVIGO_SECRETARIA_BASE_URL` / `_API_KEY` | no | Adaptador Secretaría |
| `UVIGO_CAMPUS_REMOTO_BASE_URL` / `_API_KEY` | no | Adaptador Campus Remoto |

## Cómo funciona el RAG

1. `scripts/ingest-uvigo.mjs` descarga páginas y PDFs públicos de `uvigo.gal`, extrae el contenido principal con `cheerio`/`pdf-parse` y genera `data/uvigo-corpus.ts` con URL, fecha, checksum y texto.
2. `lib/retrieval.ts` construye un índice de fragmentos, aplica stemming ligero ES/GL, BM25, prioridad de fuentes oficiales y bonus por título/intención.
3. `POST /api/chat` valida y sanea la entrada, aplica rate limiting, recupera 5 fragmentos, construye un prompt con fuentes delimitadas como datos y llama a OpenRouter.
4. Si OpenRouter no está disponible o se agota la cuota free, `lib/answer-composer.ts` compone una respuesta profesional **solo con las fuentes recuperadas**, sin inventar datos.
5. Cada respuesta devuelve citas con `type: official|demo`, URL, organización y fecha de captura.

### Actualizar el corpus

```bash
npm run ingest:uvigo
```

El script aborta si ingiere menos de 5 fuentes para no publicar un corpus vacío. El resultado se versiona: el despliegue es reproducible y no depende de la red en runtime.

## OpenRouter: cuota gratuita

La clave actual es `free_tier`. OpenRouter limita los modelos `:free` a **50 peticiones/día** con menos de 10 créditos comprados y **1.000/día** a partir de 10 créditos. El límite es por cuenta, no por modelo: cambiar de modelo no evita el 429.

- Consulta el estado en `/admin/ai`.
- Si la cuota está agotada, el chat sigue respondiendo con el compositor basado en fuentes y muestra un aviso con la hora de reinicio UTC.
- Para desbloquear 1.000/día: <https://openrouter.ai/settings/credits>.
- El orden de modelos se puede cambiar con `LLM_MODEL` y `LLM_MODELS`.

## Roles y multi-tenant

Roles de producto: `estudiante`, `pas`, `pdi`, `admin`.
Mapeo con la BD: `org_admin → admin`, `operator → PAS`, `user → estudiante`.

- `lib/roles.ts`: matriz de permisos.
- `lib/auth.ts`: viewer, provisión automática de organización/membresía y bootstrap del primer admin.
- `middleware.ts`: protección de `/app` y `/admin`.
- `app/admin/layout.tsx`: segundo control de rol en servidor.
- `supabase/migrations/0001_initial_schema.sql`: esquema y RLS base.
- `supabase/migrations/0002_roles_and_support.sql`: roles nativos, lectura de soporte, auditoría y vista `audit_logs`.

Aplicar migraciones:

```bash
supabase link --project-ref <ref>
supabase db push
```

## API

| Ruta | Método | Descripción |
|---|---|---|
| `/api/chat` | POST | Consulta RAG + LLM + persistencia + métricas |
| `/api/tickets` | POST/GET | Crear/listar derivaciones |
| `/api/feedback` | POST | Valoración de respuestas |
| `/api/metrics` | GET | KPIs, latencia, tokens, serie diaria y por agente |
| `/api/audit` | GET | Últimos eventos de auditoría |
| `/api/knowledge` | GET | Estadísticas y documentos del corpus |
| `/api/llm/status` | GET | Estado de OpenRouter, cuota y modelos |
| `/api/auth/provision` | POST | Crea organización/membresía idempotente |
| `/api/integrations/uvigo/health` | GET | Estado de adaptadores UVigo |
| `/api/webhooks/uvigo` | POST | Webhook con firma HMAC |
| `/api/cron/uvigo-sync` | GET | Comprueba disponibilidad de fuentes (Vercel Cron) |

## Accesibilidad e i18n

- Skip link, navegación con `aria-label`, menú móvil, foco visible y `prefers-reduced-motion`.
- Chat con `role="log"`, `aria-live`, etiquetas, contador de caracteres y estados de carga/error.
- Selector ES/GL/EN en cabecera. El idioma se guarda en la cookie `vigo-locale`, el layout raíz lo lee en servidor y renderiza `<html lang>`, metadatos y textos en el primer byte (sin parpadeo ni *hydration mismatch*).
- Todo el contenido público está traducido: portada, plataforma, agentes, demo, seguridad, precios, contacto, implantación, mapa del sitio, legal, login, dashboard, historial, solicitudes y páginas de error.
- Catálogo único en `lib/i18n/messages.ts` (ES es la referencia de tipos; GL y EN deben cubrir las mismas claves). Helpers: `lib/i18n/config.ts` (locales y cookie) y `lib/i18n/server.ts` (`getLocale()`).
- El chat mantiene su diccionario propio y envía `locale` al backend.
- El panel `/admin` y el agente flotante son superficies internas en español y se marcan con `lang="es"` para que el lector de pantalla no las pronuncie con el idioma de la página.
- Coste asumido: leer cookies en el layout raíz hace que **todas las rutas se rendericen dinámicamente** (`ƒ`). Para volver a caché estática o SEO por idioma habría que migrar a `app/[locale]/...` reutilizando el mismo catálogo.

## Despliegue

```bash
npx vercel link --project vigo-ai-campus
npx vercel --prod
```

CI/CD: `.github/workflows/deploy.yml` ejecuta lint, tests, build, migraciones Supabase y deploy a Vercel. Requiere los secretos `VERCEL_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` y `SUPABASE_DB_PASSWORD`.

## Documentación

- [Guía técnica](docs/GUIA_TECNICA.md)
- [Plan de mejora ejecutado](docs/PLAN_MEJORA_EJECUTADO.md)
- [Plan de mejora V2](docs/PLAN_MEJORA_V2.md)
- [Análisis de la web UVigo](docs/ANALISIS_WEB_UVIGO_PUNTOS_DEBILES.md)
- [Propuesta VIGO AI CAMPUS](docs/PROPUESTA_VIGO_AI_CAMPUS.md)

## Límites conocidos

- Los endpoints reales de SEDE, Secretaría y Campus Remoto requieren convenio y credenciales de la UVigo; los adaptadores devuelven `configured: false` y no inventan datos.
- El rate limiting usa Upstash Redis si `UPSTASH_REDIS_REST_URL` y `_TOKEN` están definidos; si no, cae a memoria por instancia.
- Las imágenes del campus son de `uvigo.gal` y se usan con atribución en un contexto académico. Para uso comercial hay que obtener licencia.
- El SSO institucional (SAML/OIDC) requiere configuración del proveedor UVigo; la app usa Supabase Auth con email/contraseña.
