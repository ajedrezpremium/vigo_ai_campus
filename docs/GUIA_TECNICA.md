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
  │    ├─ /api/chat ──► retrieval ──► OpenRouter ──► respuesta + citas
  │    ├─ /api/tickets, /api/feedback
  │    ├─ /api/metrics, /api/audit, /api/knowledge
  │    └─ /api/auth/provision, /api/llm/status
  │
  ├─ Supabase
  │    ├─ Auth (email/contraseña)
  │    ├─ Postgres + RLS (organizations, memberships, conversations...)
  │    └─ audit_events (métricas y auditoría)
  │
  └─ uvigo.gal
       ├─ Ingesta offline (cheerio + pdf-parse)
       └─ Adaptadores SEDE / Secretaría / Campus Remoto (env)
```

### Flujo de una consulta

1. El cliente envía `{ message, locale, conversationId }` a `/api/chat`.
2. `lib/security.ts` normaliza, limita a 2.000 caracteres y detecta prompt injection.
3. Rate limit: 8/min y `AI_DAILY_REQUEST_LIMIT`/día por IP+UA.
4. `lib/retrieval.ts` recupera hasta 5 fragmentos; las fuentes oficiales pesan 1,58× frente a 0,58× de las demo.
5. Se construye un prompt con fuentes delimitadas por `<fuente>` y la instrucción explícita de tratarlas como datos.
6. `lib/llm.ts` consulta OpenRouter con la lista de modelos free y fallback secuencial.
7. Si hay 429 de cuota diaria, `lib/answer-composer.ts` genera una respuesta extractiva profesional con las mismas fuentes.
8. Se persiste la conversación (si hay usuario y organización) y se registra una métrica en `audit_events`.
9. La respuesta incluye `citations`, `confidence`, `sourceSummary`, `notice` y `suggestedTicket`.

## 2. Modelo de datos

| Tabla | Propósito |
|---|---|
| `organizations` | Tenant (universidad, facultad, empresa) |
| `memberships` | Usuario ↔ organización ↔ rol |
| `agents` | Agentes configurables por organización |
| `knowledge_sources` / `documents` / `document_chunks` | Base de conocimiento multi-tenant con embeddings opcionales |
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
- **Tests**: `tests/security.test.ts` cubre inyección, URLs, HMAC, rate limit, roles, RAG y compositor.

## 4. Operación

### Ingesta

```bash
npm run ingest:uvigo
```

Fuentes en `scripts/ingest-uvigo.mjs`. Para añadir una página, añade un objeto `{ id, path, title }` y vuelve a ejecutar. El script escribe `data/uvigo-corpus.ts` y `.json`.

### Métricas

`GET /api/metrics` agrega los últimos 7 días desde `audit_events` (`action = chat.completed`) filtrados por la organización del usuario. Si Supabase no está configurado, usa un buffer en memoria.

### Diagnóstico IA

`GET /api/llm/status` devuelve proveedor, etiqueta de clave, cuota free, modelos y último error. No devuelve secretos.

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

Pendiente: auditoría automatizada con `@axe-core/playwright` y revisión con lector de pantalla real.

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

1. Añadir 10 créditos en OpenRouter para 1.000 peticiones free/día (o usar un modelo de pago).
2. Configurar Upstash Redis para rate limiting distribuido (opcional; hay fallback a memoria).
3. Configurar SSO SAML/OIDC con la UVigo.
4. Firmar convenio para endpoints SEDE/Secretaría/Campus Remoto.
5. Auditoría axe y revisión con lector de pantalla real (el i18n ya está completo).
6. Sustituir el corpus estático por `pgvector` cuando el volumen crezca.
