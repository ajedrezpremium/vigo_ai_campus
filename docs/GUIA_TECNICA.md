# Guía técnica · VIGO AI CAMPUS

## 1. Arquitectura

```
Navegador
  │
  ├─ Next.js App Router (React 19)
  │    ├─ Marketing: /, /plataforma, /agentes, /demo, /seguridad...
  │    ├─ Producto: /app, /app/chat, /app/historial, /app/solicitudes
  │    └─ Administración: /admin, /admin/analytics, /admin/ai...
  │
  ├─ API Routes (Node.js)
  │    ├─ /api/chat ──► retrieval híbrido ──► OpenRouter ──► respuesta + citas
  │    ├─ /api/tickets, /api/feedback
  │    ├─ /api/metrics, /api/audit, /api/knowledge
  │    └─ /api/auth/provision, /api/llm/status
  │
  ├─ Supabase
  │    ├─ Auth (email/contraseña)
  │    ├─ Postgres + RLS (organizations, memberships, conversations...)
  │    ├─ pgvector (document_chunks.embedding, HNSW, match_document_chunks)
  │    └─ audit_events (métricas y auditoría)
  │
  └─ uvigo.gal
       ├─ Ingesta offline (cheerio + pdf-parse)
       └─ Adaptadores SEDE / Secretaría / Campus Remoto (env)
```

### Flujo de una consulta

1. El cliente envía `{ message, locale, conversationId, stream? }` a `/api/chat`.
2. `lib/security.ts` normaliza, limita a 2.000 caracteres y detecta prompt injection.
3. Rate limit: 8/min y `AI_DAILY_REQUEST_LIMIT`/día por IP+UA.
4. `lib/retrieval-hybrid.ts` recupera hasta 5 fragmentos combinando BM25 (`lib/retrieval.ts`) y similitud vectorial (`lib/semantic.ts`), fusionados con RRF adaptativa (`lib/hybrid.ts`). Las fuentes oficiales pesan 1,58× frente a 0,58× de las demo, y las `stale` se penalizan un 18 %. Si el tramo semántico falla, devuelve el resultado léxico sin romper el chat.
5. `lib/evidence.ts` comprueba alcance y cobertura. Si la consulta es de otra universidad, pide datos personales o la cobertura del mejor fragmento es < 0,6, se responde con abstención y `needsHuman: true`. La abstención es deliberadamente **léxica**: los datos muestran que un umbral de coseno no separa consultas fuera de alcance de preguntas válidas.
6. `lib/prompts/chat.ts` construye el prompt versionado (`CHAT_PROMPT_VERSION`) delimitando cada fuente con `<fuente>` como dato no ejecutable.
7. `lib/llm.ts` consulta OpenRouter con la lista de modelos free y fallback secuencial. Con `stream: true`, `callLLMStream()` emite deltas y `/api/chat` responde NDJSON.
8. Si hay 429 de cuota diaria o el modelo falla antes de emitir texto, `lib/answer-composer.ts` genera una respuesta extractiva profesional con las mismas fuentes.
9. Se persiste la conversación (si hay usuario y organización) y se registra una métrica en `audit_events`.
10. La respuesta incluye `citations`, `confidence`, `sourceSummary`, `promptVersion`, `notice` y `suggestedTicket`.

### Streaming

`POST /api/chat` con `{ "stream": true }` devuelve `application/x-ndjson`, una línea JSON por evento:

| Evento | Contenido |
|---|---|
| `meta` | agente, citas, confianza, `promptVersion`, `sourceSummary`, `requestId` |
| `notice` | aviso de cuota, error o ausencia de evidencia |
| `delta` | fragmento de texto de la respuesta |
| `done` | respuesta completa y metadatos finales (mismo cuerpo que el modo JSON) |
| `error` | fallo irrecuperable del stream |

Sin `stream: true` se mantiene la respuesta JSON original, de modo que clientes y pruebas antiguas siguen funcionando.

## 2. Modelo de datos

| Tabla | Propósito |
|---|---|
| `organizations` | Tenant (universidad, facultad, empresa) |
| `memberships` | Usuario ↔ organización ↔ rol |
| `agents` | Agentes configurables por organización |
| `knowledge_sources` / `documents` / `document_chunks` | Base de conocimiento multi-tenant; `embedding vector(1536)` con índice HNSW |
| `conversations` / `messages` | Historial y citas |
| `tickets` | Derivaciones humanas |
| `feedback` | Valoraciones |
| `usage_events` | Tokens y coste estimado |
| `audit_events` / `audit_logs` | Auditoría y métricas (la vista `audit_logs` es alias) |

### RLS

- `is_org_member(org)` y `is_org_admin(org)` son `SECURITY DEFINER` con `search_path` fijo.
- `has_org_role(org, roles[])` permite leer conversaciones/tickets a PAS y administración.
- Un usuario solo ve sus conversaciones, mensajes, tickets y feedback.
- Las escrituras de auditoría y uso se hacen con service role desde el servidor.

## 3. Seguridad

- **Prompt injection**: patrones ES/EN/GL, etiquetas de contexto, SQL/script injection, URLs a red privada.
- **Aislamiento**: todas las consultas de cliente llevan `organization_id`; las de soporte usan service role solo después de comprobar permiso.
- **Rate limiting**: ventana fija. Usa Upstash Redis (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) y, si no está configurado, cae a memoria por instancia. El contrato `checkRateLimitAsync` no cambia.
- **Aislamiento multi-tenant**: métricas y auditoría filtran siempre por `organization_id`; sin organización no se consulta con *service role*.
- **Modo demo**: el visitante es `estudiante`. Solo `DEMO_ADMIN=true` (local) abre `/admin`.
- **Webhooks**: HMAC SHA-256 con `timingSafeEqual`.
- **Secretos**: `SUPABASE_SERVICE_ROLE_KEY` y `LLM_API_KEY` solo en servidor; nunca en `NEXT_PUBLIC_*`.
- **Tests**: `tests/security.test.ts` cubre inyección, URLs, HMAC, rate limit, roles, RAG y compositor; `tests/observability.test.ts` cubre request ids, buffer, aislamiento por organización y DSN; `tests/prompts.test.ts` protege el formato del prompt, `tests/evaluation.test.ts` fija los umbrales de calidad, `tests/ingestion.test.ts` prueba la fusión incremental, `tests/feedback.test.ts` la agregación de valoraciones y `tests/hybrid.test.ts` + `tests/embeddings.test.ts` la fusión RRF y la configuración de embeddings. Total: 59.

## 4. Operación

### Ingesta

```bash
npm run ingest:uvigo
```

Fuentes en `scripts/ingest-uvigo.mjs`. Para añadir una página, añade un objeto `{ id, path, title }` y vuelve a ejecutar. El script escribe `data/uvigo-corpus.ts` y `.json`.

La ingesta es incremental y usa `checksum` para no reescribir contenido idéntico:

- `fetchedAt`: fecha en la que se capturó el contenido publicado.
- `lastReviewedAt`: última vez que ese contenido se dio por bueno.
- `lastCheckedAt`: última comprobación HTTP correcta.
- `status: "stale"`: la fuente falló en la última ejecución y se conserva la copia anterior; el `retrieval` la penaliza.
- `lastError`: motivo del último fallo.

Si una fuente nueva falla y no hay copia previa, queda en `missing` y no se inventa un documento. La fusión está en `mergeCorpus()` y se prueba sin red en `tests/ingestion.test.ts`.

### Búsqueda semántica con pgvector

```bash
npm run semantic:status
npm run embed:corpus
npm run embed:corpus -- --dry-run
```

| Pieza | Responsabilidad |
|---|---|
| `lib/embeddings.ts` | Cliente de OpenRouter; valida dimensiones, lotes, reintentos y caché de consultas. |
| `scripts/embed-corpus.ts` | Indexación idempotente: 40 documentos y 131 fragmentos en `documents`/`document_chunks`. |
| `lib/semantic.ts` | RPC `match_document_chunks` con HNSW o *fallback* en memoria (TTL 5 min). |
| `lib/hybrid.ts` | Coseno, parseo de vectores y fusión RRF con reserva de plazas semánticas. |
| `lib/retrieval-hybrid.ts` | `retrieveAsync()`: híbrido con degradación a BM25 si algo falla. |
| `supabase/migrations/0003_semantic_search.sql` | Índice HNSW, índice único `documents(organization_id, version_label)` y función RPC. |

Reglas de fusión:

- Ancla léxica fuerte (confianza ≥ 0,5): peso semántico 0,95 y 1 plaza reservada.
- Ancla media (0,5–0,75): peso 0,95 y 2 plazas.
- BM25 perdido (< 0,5): peso 1,15 y 3 plazas; el semántico puede liderar.
- Fuentes demo: el tramo semántico las penaliza al 55 % y `includeDemo: false` las excluye.
- Se garantiza el top-3 léxico para que una pregunta como «grados» no pierda `uvigo-grados`.

`npm run semantic:status` muestra el backend activo. En este proyecto es `rpc` (pgvector + HNSW); `cache` indica que la función no está disponible y que el coseno se calcula en el proceso. El *fallback* en memoria se mantiene como red de seguridad y es viable con 131 fragmentos, pero el índice HNSW es el camino recomendado al crecer.

### Evaluación de IA

```bash
npm run eval                # compositor determinista; sin red ni cuota
npm run eval -- --semantic  # compositor con retrieval híbrido
npm run eval:llm            # modelo real; requiere .env.local
npm run eval:paraphrase     # 12 paráfrasis ES/GL/EN, léxico vs. híbrido
```

El set vive en `lib/evaluation/dataset.ts` (30 preguntas: 22 respondibles y 8 de abstención). `lib/evaluation/run.ts` calcula *recall*, cobertura, abstención, citas, *faithfulness* operativa y latencia p50/p95/max. El p95 se compara con el umbral de 4 s. Los informes se escriben en `eval/results/` e incluyen `promptVersion`, modelo, tipo de retrieval y latencia por pregunta. El compositor determinista es el que se ejecuta en CI.

`lib/evaluation/paraphrases.ts` añade 12 consultas coloquiales y en gallego/inglés para aislar el retrieval. En el set de 30 el léxico ya era perfecto, así que no podía mostrar la mejora; las paráfrasis sí:

| Métrica | Léxico | Híbrido |
|---|---|---|
| Recall@1 | 0,083 | 0,750 |
| Recall@5 | 0,333 | 1,000 |
| MRR | 0,144 | 0,825 |

En el set principal el híbrido mantiene 1,000 en recall, cobertura, abstención, citas y *faithfulness*, con p95 de 1.043 ms. La llamada de embeddings (~600–750 ms por consulta) domina la latencia; la RPC de pgvector tarda 85–250 ms.

### Feedback y conocimiento

`POST /api/feedback` acepta `{ requestId, messageId?, conversationId?, agent?, rating, comment? }`.

- `recordFeedback()` guarda la valoración en memoria y, con service role, en `audit_events` con `action = "chat.feedback"` y `target_id = requestId`.
- Si hay sesión y el chat se persistió, también se inserta en la tabla `feedback` usando el `message_id` real que devuelve `/api/chat`.
- `getFeedbackSummary()` agrega total, porcentaje positivo, negativas por agente y las últimas respuestas a revisar. El panel `/admin/knowledge` y `GET /api/knowledge` lo consumen.
- El mismo panel avisa de fuentes `stale` y de capturas con más de 90 días, lo que cierra el ciclo valoración → revisión → refresco de fuentes.

### Métricas

`GET /api/metrics` agrega los últimos 7 días desde `audit_events` (`action = chat.completed`) filtrados por la organización del usuario. Si Supabase no está configurado, usa un buffer en memoria.

### Diagnóstico IA

`GET /api/llm/status` devuelve proveedor, etiqueta de clave, cuota free, modelos y último error. No devuelve secretos.

### Observabilidad

| Pieza | Responsabilidad |
|---|---|
| `proxy.ts` | Asigna `x-request-id` a toda petición (salvo assets) y lo devuelve en la respuesta. Solo consulta Supabase para `/admin`, `/solicitudes`, `/app` y `/login`. |
| `lib/observability/core.ts` | Logs JSON, buffer en memoria (200 eventos), `describeDsn`/`forwardToSentry` y `toErrorAuditRow`. No importa Supabase (apto para edge). |
| `lib/observability/server.ts` | `reportServerError()` persiste en `audit_events` (`action = "error.http"`) y `errorResponse()` devuelve 5xx con `requestId`. |
| `instrumentation.ts` | `onRequestError` de Next para errores no capturados en rutas, RSC y Server Actions. |

- Los 5xx de `/api/chat`, `/api/tickets` y `/api/auth/provision` llaman a `reportServerError()`; el cliente recibe un mensaje genérico, el `requestId` y la cabecera `X-Request-Id`.
- `SENTRY_DSN` activa el reenvío directo al endpoint de ingesta de Sentry, sin instalar el SDK; es *best-effort* y nunca bloquea la respuesta. `SENTRY_ENVIRONMENT` etiqueta el entorno.
- `getRecentAudit()` fusiona los errores del proceso con las filas de Supabase y deduplica por `target_id`; con organización solo muestra su tenant, y en modo demo solo los eventos sin organización.
- Para depurar: busca el `requestId` en los logs JSON del servidor, en `audit_events.metadata` o en Sentry.

### Cron

`vercel.json` programa `/api/cron/uvigo-sync` a las 03:00 UTC. Requiere `CRON_SECRET`. Hace HEAD a cada fuente y registra `uvigo.sync` en auditoría.

### Rollback

1. `git revert <commit>` y push a `main` (el workflow despliega).
2. O `vercel rollback <deployment-url>`.
3. Las migraciones son aditivas; para revertir 0002, eliminar políticas/vista y restaurar el CHECK anterior (ver archivo).

## 5. Accesibilidad

- Skip link, landmarks, `aria-label` en navegación, menú móvil con `aria-expanded`.
- Chat: `role="log"`, `aria-live="polite"`, `aria-busy`, etiquetas de formulario, contador y estados de error.
- Contraste: textos principales `slate-950` sobre fondos claros; badges con contraste AA.
- Movimiento: `prefers-reduced-motion` desactiva Ken Burns y transiciones largas.
- Teclado: todos los controles son `<button>`, `<a>`, `<select>` o `<textarea>` con foco visible.

Auditoría automatizada: `e2e/a11y.spec.ts` ejecuta axe (`@axe-core/playwright`) sobre portada, plataforma, precios, contacto, login y chat, y comprueba el renderizado en inglés. Solo bloquean las violaciones `critical` y `serious`; el job `npm run test:a11y` corre en CI después del build. Pendiente: revisión con lector de pantalla real.

## 6. i18n

- Catálogo único en `lib/i18n/messages.ts` con tres locales: `es` (referencia de tipos), `gl` y `en`. `Messages = typeof es`, así que **GL y EN deben cubrir exactamente las mismas claves, arrays y objetos**; si falta una clave, `tsc` falla.
- `lib/i18n/config.ts`: `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `LOCALE_COOKIE` (`vigo-locale`), `LOCALE_LABELS` e `isLocale()`.
- `lib/i18n/server.ts`: `getLocale()` lee la cookie con `cookies()` para componentes de servidor.
- `lib/i18n.tsx`: `I18nProvider` recibe `initialLocale` del layout raíz, expone `locale`, `setLocale` y `t`. Al cambiar de idioma escribe la cookie, actualiza `document.documentElement.lang` y llama a `router.refresh()` para re-renderizar los componentes de servidor.
- `app/layout.tsx`: `generateMetadata()` y `<html lang={locale}>` se resuelven en servidor. Al usar `cookies()` con Cache Components, el layout declara `export const instant = false`; por eso todas las rutas aparecen como dinámicas (`ƒ`) en el build.
- El chat tiene diccionario propio ES/GL/EN y envía `locale` al backend.
- Superficies deliberadamente monolingües: `/admin`, `/admin/*` y el agente flotante. Se marcan con `lang="es"`.
- Alternativa no elegida: rutas `/[locale]/...`. Da SEO por idioma y permite estático, pero exige mover las 20 rutas, el proxy de auth y todos los enlaces. Se documenta como siguiente paso si el producto deja de ser demo.

## 7. Integraciones UVigo

`lib/uvigo/client.ts` define:

- `getAcademicCalendar()` → SEDE
- `getProcedureStatus(id)` → Secretaría
- `getRemoteCourses()` → Campus Remoto

Sin `UVIGO_*_BASE_URL`, lanzan `IntegrationNotConfiguredError` y la UI muestra `configured: false`. No se inventan respuestas.

Webhook: `POST /api/webhooks/uvigo` con cabecera `x-uvigo-signature: sha256=<hmac>`.

## 8. Despliegue

- Vercel: `npx vercel --prod`.
- GitHub Actions: `.github/workflows/deploy.yml`.
- Variables sensibles en Vercel Project Settings → Environment Variables.
- `vercel.json` fija región `cdg1` y cron diario.

## 9. Limitaciones y siguientes pasos

1. Añadir 10 créditos en OpenRouter para 1.000 peticiones free/día (o usar un modelo de pago). Con modelos `:free` se han medido 8–29 s por respuesta; el p95 de 4 s exige un modelo con *streaming* rápido.
2. Configurar Upstash Redis para rate limiting distribuido (opcional; hay fallback a memoria).
3. Configurar SSO SAML/OIDC con la UVigo.
4. Firmar convenio para endpoints SEDE/Secretaría/Campus Remoto.
5. Revisión manual con lector de pantalla real (la auditoría axe ya está en CI).
6. Mantener el corpus del departamento actualizado y revisar semanalmente las preguntas sin respuesta.
7. Reindexar el corpus cuando cambie el modelo de embeddings (`npm run embed:corpus`) y fijar `EMBEDDINGS_DIMENSIONS` a la dimensión de la columna.
