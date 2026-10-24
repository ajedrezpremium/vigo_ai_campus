# Plan de mejora · estado de ejecución

Fecha: 2026-10-24 · Versión desplegada: producción `vigo-ai-campus.vercel.app`

| # | Mejora | Estado | Evidencia / archivos |
|---|---|---|---|
| 1 | RAG con fuentes oficiales | ✅ Ejecutado | `scripts/ingest-uvigo.mjs`, `data/uvigo-corpus.ts`, `lib/retrieval.ts`. 26 fuentes oficiales, 23 HTML + 3 PDF, 64.887 caracteres. |
| 2 | Persistencia multi-tenant | ✅ Base ejecutada | `supabase/migrations/0001_initial_schema.sql`, `0002_roles_and_support.sql`, persistencia en `/api/chat`, `tickets`, `messages`, `audit_events`. RLS activo. |
| 3 | Autenticación y roles | ✅ Ejecutado | Supabase Auth email/password, `lib/roles.ts`, `lib/auth.ts`, `middleware.ts`, `app/admin/layout.tsx`, provisión automática. SSO institucional pendiente de convenio. |
| 4 | Métricas y observabilidad | ✅ Ejecutado | `/api/metrics`, `/admin/analytics` con React Query + Recharts, latencia p50/p95, tokens, resueltas, derivadas, serie diaria y por agente. |
| 5 | Pruebas de seguridad | ✅ Ejecutado | `tests/security.test.ts`: 11 tests (inyección, URLs, HMAC, rate limit, roles, RAG, compositor). `npm test`. |
| 6 | Accesibilidad WCAG 2.1 AA | 🟡 Parcial | Skip link, `aria-label`, menú móvil, foco visible, `aria-live`, `prefers-reduced-motion`, contraste. Falta auditoría axe automatizada y lector de pantalla. |
| 7 | Internacionalización real | 🟡 Parcial | ES/GL/EN en cabecera, footer y chat; respuestas en el idioma elegido. Páginas corporativas siguen en español; siguiente fase `next-i18next` con rutas por locale. |
| 8 | Integración con sistemas UVigo | 🟡 Adaptadores listos | `lib/uvigo/client.ts`, `/api/integrations/uvigo/health`, `/api/webhooks/uvigo`, `/api/cron/uvigo-sync`. Sin endpoints/credenciales reales de la UVigo. |
| 9 | CI/CD y despliegue reproducible | ✅ Ejecutado | `.github/workflows/deploy.yml`, `vercel.json`, build verificado, deploy a producción. |
| 10 | Documentación TFG | ✅ Ejecutado | `README.md`, `docs/GUIA_TECNICA.md`, este documento, análisis y propuesta previos. |
| 11 | OpenRouter free + respuesta pro | ✅ Ejecutado con límite externo | `lib/llm.ts` con modelos free reales, fallback secuencial, detección de cuota, `/admin/ai`. Cuota actual 59/50: requiere esperar reinicio UTC o añadir 10 créditos. Mientras tanto, `lib/answer-composer.ts` responde con fuentes oficiales. |
| 12 | Portada luminosa con 4 imágenes reales | ✅ Ejecutado | `components/home-hero.tsx`, `public/campus/*.jpg` (UVigo, atribución), rotación 6,2 s, pausa, reduced motion, responsive. |

## Incidencias corregidas

- Codificación UTF-8 de títulos y rutas (se detectó mojibake `Ã¡` y se reparó; el corpus se regeneró).
- `STORAGE_KEY` del chat estaba truncado; ahora `vigo-conversations-v2`.
- `pdf-parse` 1.1.1 fallaba en ESM; import corregido a `pdf-parse/lib/pdf-parse.js`.
- Next 16 `cacheComponents` no permite `runtime/dynamic` en Route Handlers; se eliminaron y se usó `connection()` en páginas admin.
- El prompt de sistema y el compositor evitan mostrar errores técnicos o URLs inventadas al usuario.

## Pendiente recomendado

1. Añadir 10 créditos en OpenRouter o esperar el reinicio UTC para recuperar 1.000 free/día.
2. Aplicar `0002_roles_and_support.sql` en Supabase (`supabase db push`).
3. Configurar `CRON_SECRET`, `UVIGO_WEBHOOK_SECRET` y variables `UVIGO_*` en Vercel.
4. Migrar rate limiting a Upstash Redis para producción multinstancia.
5. Completar i18n de páginas corporativas y auditoría axe.
6. Obtener licencia/permiso para las imágenes del campus si el sitio deja de ser académico.
