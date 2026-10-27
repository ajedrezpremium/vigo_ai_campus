# Plan de mejora V2 — VIGO AI CAMPUS

> Fecha: 2026-10-27 · Base: `47920f0` + cambios sin commitear · Alcance: producto, seguridad, calidad y IA.
>
> Este plan sustituye como hoja de ruta a `docs/PLAN_MEJORA_EJECUTADO.md` (que queda como histórico de lo ya entregado).

## 0. Estado de ejecución

Actualizado: 2026-10-27.

| Fase | Estado | Evidencia |
|---|---|---|
| **Fase 0** — desbloquear CI y regresiones | ✅ Completada | `next.config.ts` sin loader inexistente; `language-switcher` tipado; rutas de historial/solicitudes enlazadas; `proxy.ts` sustituye a `middleware.ts`; 500 sin detalle interno; 0 warnings de lint; `tsc` limpio; `build` verde. |
| **Fase 1** — seguridad y multi-tenant | ✅ Completada | Modo demo *fail-closed* (`lib/tenant.ts`), filtro `organization_id` en métricas/auditoría, `organization_id` en `recordMetric`, bootstrap de admin solo con `ADMIN_EMAILS`, rate limit con Upstash opcional, 7 tests nuevos (18 en total). |
| **Fase 2** — producto y calidad | ✅ Completada | Feedback 👍/👎 ya existía en el chat; añadidos `error.tsx`, `not-found.tsx` y `loading.tsx`. i18n completo ES/GL/EN con cookie y renderizado en servidor (#14). Auditoría axe en 6 páginas + locale (#15): 7/7 en verde. Observabilidad con `requestId`, logs JSON, persistencia en `audit_events` y Sentry opcional (#16): 12 tests nuevos (30 en total) y smoke test E2E verificado. |
| **Fase 3** — IA y datos | ✅ Completada | Prompts versionados (`lib/prompts/chat.ts`, `2026-10-27.1`), arnés de evaluación con 30 preguntas y umbrales (`lib/evaluation`, `npm run eval`), *gate* de evidencia/abstención (`lib/evidence.ts`), streaming NDJSON real con *fallback* extractivo, ingesta incremental con `checksum`/`stale`, bucle de feedback (`/api/feedback` → `chat.feedback` → panel de conocimiento) y búsqueda híbrida BM25 + pgvector (#17): 131 fragmentos con embeddings de 1.536 dims, fusión RRF adaptativa, `npm run eval:paraphrase` con recall@5 0,333 → 1,000 y MRR 0,144 → 0,825. Migración `0003` aplicada y backend `pgvector (match_document_chunks)` verificado; p95 del retrieval híbrido 1.043 ms. |

Decisión de rutas: se mantuvieron `/historial` y `/solicitudes` en la raíz (trabajo ya iniciado) y se actualizaron el dashboard y el proxy, en lugar de devolverlas a `/app`. `/solicitudes` exige sesión; `/historial` es local al navegador.

Decisión de i18n: se implementó **cookie + renderizado en servidor** (`vigo-locale`) en lugar de `/[locale]/...`. Motivo: el catálogo ya existía, la migración a segmentos de ruta obligaba a tocar 20 rutas, el proxy de auth y todos los enlaces internos, con riesgo alto para una demo. Consecuencia asumida: al leer cookies en el layout raíz, **todas las rutas pasan a dinámicas** (`ƒ`) y se pierde el render estático. El layout declara `export const instant = false` para que Cache Components permita el bloqueo, tal como documenta Next.js. Si en el futuro se necesita caché estática o SEO por idioma, el paso natural es mover el árbol a `app/[locale]/...` manteniendo el mismo catálogo `lib/i18n/messages.ts`.

Verificación de i18n con `next start` (cookie `vigo-locale` = `es` | `gl` | `en`):

```
/plataforma   es: "Plataforma"  gl: "Plataforma"  en: "Platform"       lang correcto
/agentes      es: "Agentes"     gl: "Axentes"     en: "Agents"
/seguridad    es: "Seguridad y privacidad"  gl: "Seguridade e privacidade"  en: "Security and privacy"
/precios      es: "Precios"     gl: "Prezos"      en: "Pricing"
/demo         es: "Demo conversacional"  gl: "Demo conversacional"  en: "Conversational demo"
<nav>         es: "Navegación principal"  en: "Main navigation"   (traducido en el HTML del servidor)
<title>       cambia por idioma; sin parpadeo al recargar
```

Verificación de la fase 0+1: `lint`, `tsc`, `test` (18/18) y `build` en verde; smoke test con `next start`:

```
/           200      /admin          307 → /login
/app        200      /solicitudes    307 → /login
/historial  200      /api/metrics    403
/app/chat   200      /api/audit      403
```

Verificación de la fase 2 (`npm run test:a11y` sobre `next start`, 7/7 en verde):

```
/            portada       0 violaciones critical/serious
/plataforma  plataforma    0
/precios     precios       0
/contacto    contacto      0
/login       login         0
/demo        chat          0
/plataforma  locale=en     html lang="en", H1 "Platform"
```

Correcciones aplicadas en lugar de exclusiones: contraste de las tarjetas de agentes (`opacity-80` retirado), `emerald-600` → `700`, `slate-400` → `500`; se quitó el `aria-label` redundante del logo y el botón flotante usa el icono `Sparkles` con su texto visible en el nombre accesible.

Smoke test de observabilidad con un 5xx real (`/api/dev-boom`, ruta temporal ya eliminada):

```
GET /api/dev-boom  x-request-id: smoke-observability-3  → 500
GET /api/audit                                         → 200
evento: action=error.http, target_id=smoke-observability-3,
        metadata.request_id=smoke-observability-3, status=500, route=/api/dev-boom (route)

Sin sesión y con Supabase configurado, /api/audit sigue devolviendo 403 (fail-closed).
```

## 1. Diagnóstico verificado

Comandos ejecutados sobre el árbol de trabajo actual:

| Comprobación | Resultado |
|---|---|
| `npm test` | ✅ 11/11 |
| `npm run lint` | ⚠️ 0 errores, 5 warnings |
| `npx tsc --noEmit` | ❌ 1 error |
| `npm run build` | ❌ falla en `app/globals.css` |

### Hallazgos por severidad

| # | Hallazgo | Sev. | Evidencia | Impacto |
|---|---|---|---|---|
| 1 | El build de producción no compila: `next.config.ts` declara el loader `@tailwindcss/turbopack`, que no existe ni está instalado. | **P0** | `next.config.ts` + `Cannot find module '@tailwindcss/turbopack'` | CI y deploy en rojo; no se puede publicar. |
| 2 | Error de TypeScript en `components/language-switcher.tsx`: se indexa `Record<Locale, string>` con `string`. | **P0** | `TS7053` en `tsc --noEmit` | El build fallará también al corregir el #1. |
| 3 | Navegación rota: el dashboard enlaza a `/app/historial` y `/app/solicitudes`, pero las páginas se movieron a `/historial` y `/solicitudes` (las antiguas están borradas). | **P0** | `git status`, `app/app/page.tsx` | 404 en dos accesos del producto. |
| 4 | `getViewer()` devuelve rol **admin** cuando Supabase no está configurado (`DEMO_VIEWER`). | **P0** | `lib/auth.ts` | *Fail-open*: si faltan variables en producción, `/admin`, `/api/metrics`, `/api/audit` y `GET /api/tickets` quedan abiertos como admin. |
| 5 | Fuga multi-tenant en métricas y auditoría: se consulta con *service role* sin filtrar `organization_id`. | **P0** | `lib/metrics.ts` (`getMetricsSummary`, `getRecentAudit`) + `/api/metrics`, `/api/audit` | Un PAS de una organización ve tickets, conversaciones y eventos de todas. |
| 6 | `/solicitudes` espera un array pero `GET /api/tickets` devuelve `{ tickets, persisted }`. | **P1** | `app/solicitudes/page.tsx` vs `app/api/tickets/route.ts` | `list.map is not a function`: la página revienta. |
| 7 | `/historial` lee la clave `vigo-demo-conversations`, pero el chat guarda en `vigo-conversations-v2`. | **P1** | `app/historial/page.tsx` vs `components/chat-interface.tsx` | El historial aparece siempre vacío. |
| 8 | `middleware.ts` está deprecado en Next 16 (se renombra a `proxy.ts`) y su `matcher` sigue apuntando a las rutas antiguas. | **P1** | Aviso de `next build` + `middleware.ts` | Deuda técnica con fecha; protección de auth incoherente. |
| 9 | Rate limiting en memoria por instancia. | **P1** | `lib/rate-limit.ts` | En Vercel el límite real se multiplica por instancia. |
| 10 | Sin tests de API, de RLS ni E2E; `playwright` está instalado pero sin usar. | **P1** | `tests/security.test.ts` es el único archivo | Los bugs #3–#7 no los detecta ninguna prueba. |
| 11 | El 500 de `/api/chat` devuelve `detail` con el mensaje interno. | **P1** | `app/api/chat/route.ts` | Filtra información de implementación al cliente. |
| 12 | CI no ejecuta `tsc --noEmit` y su build está roto. | **P1** | `.github/workflows/deploy.yml` | El pipeline no protege la rama `main`. |
| 13 | Bootstrap de admin: el primer usuario registrado en una BD vacía pasa a `org_admin`. | **P1** | `provisionMembership()` | Si se abre el registro antes de sembrar la BD, cualquiera toma la organización. |
| 14 | i18n parcial: solo cabecera/footer/chat; el resto en español y `html lang` fijo. | **P2** | `lib/i18n.tsx`, `app/layout.tsx` | Incoherencia para usuario gallego/inglés. |
| 15 | Accesibilidad sin auditoría automatizada. | **P2** | No hay `@axe-core/playwright` | Riesgo de regresiones WCAG. |
| 16 | Sin observabilidad: solo `console.warn`, sin trazas ni alertas. | **P2** | `lib/metrics.ts`, rutas API | Los fallos en producción se detectan tarde. |
| 17 | Corpus duplicado (`data/uvigo-corpus.ts` + `.json`, ~152 KB) y búsqueda en memoria. | **P2** | `data/`, `lib/retrieval.ts` | Infla el repo; no escala a más documentos. |
| 18 | Documentación desactualizada y ruido en la raíz (`deepseek_markdown_*.md`, PNG de arquitectura). | **P2** | `README.md`, raíz del repo | Confunde a quien evalúe el TFG. |

## 2. Objetivos y métricas de éxito

| Objetivo | KPI | Meta |
|---|---|---|
| Build reproducible | `lint` + `tsc` + `test` + `build` | 4/4 en verde, 0 warnings |
| Seguridad multi-tenant | Tests de aislamiento entre 2 organizaciones | 100% pasan |
| Cobertura de flujos críticos | Smoke E2E: chat, cita, ticket, login, admin | 5/5 |
| Calidad de respuesta | Consultas con ≥1 cita oficial | ≥ 90% |
| Latencia | p95 de `/api/chat` | < 4 s con LLM; < 300 ms con compositor |
| Accesibilidad | axe en páginas públicas + chat | 0 violaciones críticas |
| Operación | Errores 5xx con traza correlacionada | 100% |

## 3. Fases

### Fase 0 — Desbloquear CI y arreglar regresiones (S, 1 día)

Objetivo: volver a un estado desplegable.

- [ ] **#1** Quitar el bloque `turbopack.rules` de `next.config.ts`. Tailwind 4 se resuelve con `postcss.config.mjs` (`@tailwindcss/postcss`); no requiere loader de Turbopack.
- [ ] **#2** En `language-switcher.tsx`, tipar la lista: `(["es","gl","en"] as const).map(...)`.
- [ ] **#3** Decidir una sola ubicación para historial y solicitudes. Recomendado: devolverlas a `app/app/historial` y `app/app/solicitudes` (coherente con `/app/chat` y con el `matcher`), o bien actualizar enlaces y proxy si se quedan en la raíz.
- [ ] **#6** En `/solicitudes`, leer `data.tickets` y manejar `403`, carga y vacío.
- [ ] **#7** En `/historial`, reutilizar el mismo `STORAGE_KEY` (extraerlo a `lib/chat-storage.ts`).
- [ ] **#8** Migrar `middleware.ts` → `proxy.ts` (`npx @next/codemod@canary middleware-to-proxy .`) y ampliar el `matcher`.
- [ ] **#11** Devolver un mensaje genérico en el 500 y registrar el detalle solo en servidor.
- [ ] Limpiar los 5 warnings de lint (imports muertos en `home-hero.tsx`, `locale/setLocale` en `site-header.tsx`, `postcss.config.mjs`).
- [ ] Añadir `typecheck` al CI y ejecutarlo antes del build.

**Criterio de aceptación:** `npm run lint && npx tsc --noEmit && npm test && npm run build` en verde; ningún enlace del dashboard da 404; historial y solicitudes muestran datos reales.

### Fase 1 — Seguridad y aislamiento multi-tenant (M, 2–3 días)

Objetivo: que el modo demo no sea una puerta trasera y que cada organización vea solo lo suyo.

- [ ] **#4** *Fail-closed*: `DEMO_VIEWER.role = "estudiante"`. El acceso admin en demo requiere un flag explícito (`DEMO_ADMIN=true`) y, si no está, `/admin` muestra el estado restringido.
- [ ] **#5** Pasar `organizationId` a `getMetricsSummary(days, orgId)` y `getRecentAudit(limit, orgId)`; añadir `.eq("organization_id", orgId)` en `audit_events`, `tickets` y `conversations`.
- [ ] Propagar `organization_id` en `recordMetric()` desde `/api/chat` (hoy se guarda `null`).
- [ ] **#13** Sembrar la organización/admin por script (`ADMIN_EMAILS` obligatorio) y bloquear el bootstrap automático si ya existe cualquier miembro.
- [ ] **#10** Tests nuevos: `tests/api.test.ts` con 401/403, aislamiento entre organizaciones, validación Zod, rate limit y webhook. Añadir un test que fije el rol demo a `estudiante`.
- [ ] **#9** Adaptador de rate limit: `MemoryStore` por defecto + `UpstashStore` si existen `UPSTASH_REDIS_REST_URL/TOKEN` (misma interfaz `checkRateLimit`).
- [ ] Revisar políticas RLS de `audit_events` y `usage_events` con un test SQL o documento de verificación.

**Criterio de aceptación:** un PAS de la organización A recibe 0 filas de B; sin Supabase, `/api/metrics` responde 403; los tests de aislamiento pasan en CI.

### Fase 2 — Producto y calidad percibida (M/L, 4–5 días)

- [ ] Historial y solicitudes contra Supabase (paginación, estados de carga/error/vacío) con *fallback* a localStorage en demo.
- [ ] Persistencia real de conversaciones: recuperar mensajes al abrir una conversación, no solo el título.
- [ ] Feedback en la UI (hoy `/api/feedback` existe pero no se usa).
- [x] **#14** i18n: diccionario único por página + cookie `vigo-locale`, `html lang` correcto en servidor y metadatos traducidos. Se descartaron las rutas `/[locale]/...` para no reestructurar 20 rutas (ver nota de decisión). Textos legales revisados.
- [x] **#15** `@axe-core/playwright` en 6 páginas + chat + comprobación de locale; violaciones críticas corregidas (7/7 en verde, job en CI).
- [x] **#16** Observabilidad: logs JSON con `requestId`, buffer en memoria, persistencia best-effort en `audit_events` y reenvío opcional a Sentry vía `SENTRY_DSN` (sin SDK); `onRequestError` de Next cubre los errores no capturados.
- [ ] Estados vacíos y *skeletons* en admin y chat; `error.tsx` y `not-found.tsx` propios.
- [ ] Rendimiento: revisar peso de imágenes del hero, `next/font` local y presupuesto de JS.

**Criterio de aceptación:** flujo completo registro → chat → cita → ticket → admin sin recargar; axe sin violaciones críticas; un 5xx de prueba aparece con `requestId` en el panel.

### Fase 3 — IA, datos y evaluación (L, 1–2 semanas)

- [x] **#17** Mover el corpus a Supabase + `pgvector`; el `retrieval` actual queda como *fallback* offline. Implementado con `lib/embeddings.ts` (OpenRouter, `text-embedding-3-small`, 1.536 dims), `lib/semantic.ts` (RPC `match_document_chunks` o caché en memoria), `lib/hybrid.ts` (fusión RRF adaptativa), `scripts/embed-corpus.ts` (40 documentos / 131 fragmentos, coste real 0,000422 $) y `supabase/migrations/0003_semantic_search.sql`. **Migración aplicada en la BD remota** y backend verificado con `npm run semantic:status` (`rpc`); el *fallback* en memoria se conserva como red de seguridad.
- [x] Pipeline de ingesta incremental: `checksum`, `lastReviewedAt`/`lastCheckedAt`, estados `official/stale` y conservación de la última copia válida cuando una fuente falla. No reindexa todo el corpus.
- [x] **Evaluación**: 30 preguntas (22 respondibles, 8 de abstención) con documento esperado; mide *recall*, cobertura, abstención, citas y *faithfulness* operativa (fechas/URLs/citas dentro del contexto). Resultados por versión de prompt en `eval/results/`.
- [x] Streaming de respuesta (`ReadableStream`, NDJSON `meta`/`notice`/`delta`/`done`/`error`) manteniendo el compositor como *fallback* y la respuesta JSON para clientes antiguos.
- [x] Versionado de prompts en `lib/prompts/` y pruebas de regresión de formato.
- [x] Cerrar el bucle de feedback: 👍/👎 → `audit_events` (`chat.feedback`) → panel de conocimiento con valoraciones negativas, comentarios y alerta de fuentes `stale` o capturas de más de 90 días.

**Criterio de aceptación:** *faithfulness* ≥ 0,9 en el set de evaluación; ninguna respuesta con URL fuera de `uvigo.gal`; p95 < 4 s en streaming. **Estado:** 1,000 con compositor y en la muestra real; 0 URLs externas; p95 del compositor inferior a 10 ms y umbral incorporado al informe (`latencyP95Ms`). Con retrieval híbrido el set de 30 mantiene 1,000 en recall, cobertura, abstención, citas y *faithfulness*, con p95 de 1.043 ms. Pendiente una prueba de carga real del streaming con un modelo de pago: con modelos `:free` se han medido 8–29 s por respuesta.

### Fase 4 — Opcional / negocio (solo si el TFG lo pide)

- SSO SAML/OIDC con la UVigo (requiere convenio).
- Adaptadores SEDE/Secretaría/Campus Remoto reales.
- Panel de conocimiento con edición y aprobación de fuentes.
- Analítica de producto y facturación multi-tenant.

> No empezar por aquí: sin Fase 0–1, añadir integraciones multiplica la superficie de fallo.

## 4. Backlog priorizado (resumen ejecutable)

| ID | Tarea | Fase | Esfuerzo | Archivos |
|---|---|---|---|---|
| B1 | Quitar loader de Turbopack | 0 | XS | `next.config.ts` |
| B2 | Tipar `LanguageSwitcher` | 0 | XS | `components/language-switcher.tsx` |
| B3 | Unificar rutas historial/solicitudes | 0 | S | `app/app/*`, `proxy.ts` |
| B4 | Arreglar respuesta de `/solicitudes` | 0 | XS | `app/solicitudes/page.tsx` |
| B5 | Clave única de almacenamiento | 0 | S | `lib/chat-storage.ts`, chat e historial |
| B6 | Migrar middleware → proxy | 0 | S | `proxy.ts` |
| B7 | Ocultar detalle en 500 | 0 | XS | `app/api/chat/route.ts` |
| B8 | `tsc` en CI | 0 | XS | `.github/workflows/deploy.yml` |
| B9 | Demo sin rol admin | 1 | S | `lib/auth.ts`, `/admin` |
| B10 | Filtro por organización en métricas/auditoría | 1 | M | `lib/metrics.ts`, APIs |
| B11 | `organization_id` en `recordMetric` | 1 | S | `app/api/chat`, `lib/metrics.ts` |
| B12 | Bootstrap admin seguro | 1 | S | `lib/auth.ts` |
| B13 | Tests de API y aislamiento | 1 | M | `tests/api.test.ts` |
| B14 | Rate limit con Redis | 1 | M | `lib/rate-limit.ts` |
| B15 | Historial/solicitudes con Supabase | 2 | M | páginas + APIs |
| B16 | Feedback en UI | 2 | S | `chat-interface.tsx` |
| B17 | i18n por rutas | 2 | L | `app/[locale]`, `lib/i18n.tsx` |
| B18 | axe + correcciones | 2 | M | `tests/e2e`, componentes |
| B19 | Sentry + logs con `requestId` | 2 | M | `next.config.ts`, rutas |
| B20 | pgvector e ingesta incremental | 3 | L | `supabase/migrations`, `lib/retrieval.ts`, `lib/semantic.ts`, `lib/hybrid.ts`, `scripts/embed-corpus.ts` (✅; migración `0003` aplicada y backend verificado) |
| B21 | Set de evaluación y métricas de IA | 3 | L | `tests/eval`, `scripts` |
| B22 | Streaming de respuestas | 3 | M | `app/api/chat`, `chat-interface.tsx` |

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cuota free de OpenRouter (50/día) | Composer ya cubre el fallback; añadir aviso en `/admin/ai` y *cache* de respuestas frecuentes. |
| Build depende de fuentes de Google | Fuentes locales o `next/font` con fallback; el build de CI ya descarga. |
| Migraciones RLS sin probar | Tests de aislamiento antes de tocar políticas; migraciones aditivas. |
| Cambios de rutas rompen enlaces | Un único mapa de navegación (`lib/navigation.ts`) y test E2E de enlaces. |
| El modo demo se confunde con producción | Banner visible + rol no privilegiado + `/api/health` que exponga `mode`. |

## 6. Definición de hecho (DoD)

Una tarea se considera terminada cuando:

1. Tiene test o comprobación reproducible (unitario, API o E2E).
2. `lint`, `tsc`, `test` y `build` pasan en local y en CI.
3. No introduce warnings nuevos.
4. Actualiza `README.md` o `docs/GUIA_TECNICA.md` si cambia comportamiento, rutas o variables.
5. No expone secretos ni datos de otra organización.

## 7. Próximos tres pasos

1. **Hecho:** Fases 0, 1, 2 y 3 completas (build, tipos, rutas, proxy, i18n, axe, observabilidad, prompts, evaluación, streaming, feedback y búsqueda híbrida).
2. **Hecho:** pgvector (#17) implementado y validado con 131 fragmentos; recall@5 de paráfrasis 0,333 → 1,000 y MRR 0,144 → 0,825.
3. **Siguiente:** medir con `npm run eval:llm` usando un modelo de pago y hacer una prueba de carga del streaming para fijar el p95 de extremo a extremo; después, preparar el piloto del departamento (`docs/PILOTO_DEPARTAMENTO.md`).

### Anexo — Verificación rápida

```bash
npm run lint
npx tsc --noEmit
npm test
npm run eval          # compositor determinista, apto para CI
npm run eval -- --semantic  # retrieval híbrido
npm run eval:paraphrase     # léxico vs. híbrido (requiere embeddings)
npm run eval:llm      # modelo real; requiere .env.local y cuota
npm run semantic:status     # backend pgvector o memoria
npm run build
npm run test:a11y     # requiere build previo y chromium
```

Estado actual: `lint` 0 errores / 0 warnings · `tsc` limpio · `test` 59/59 · `build` verde · `test:a11y` 7/7 · `eval` 30/30 con todas las métricas a 1,000 y p95 del compositor inferior a 10 ms · `eval --semantic` 30/30 con p95 de 1.043 ms · `eval:paraphrase` recall@5 1,000 y MRR 0,825.
