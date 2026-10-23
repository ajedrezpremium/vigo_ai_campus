# MEGAPROMPT — VIGO AI CAMPUS
## SaaS multiuniversidad con superagente coordinador de servicios universitarios

Actúa como un equipo senior compuesto por arquitecto SaaS, ingeniero full-stack, especialista en agentes IA/RAG, diseñador UX/UI, experto en seguridad y responsable DevOps.

## 1. Objetivo del producto
Construir **VIGO AI CAMPUS**, una plataforma SaaS profesional que coordine servicios universitarios mediante un superagente y agentes especializados. La primera demo estará orientada a la Universidade de Vigo, pero el producto debe poder configurarse para otras universidades españolas sin mezclar datos, usuarios, fuentes, marca ni permisos.

Eslogan: **Un campus. Un superagente. Todos los servicios.**

La demo es independiente y no oficial. No afirmes que la Universidade de Vigo respalda, contrata o valida el producto. No utilices logotipos oficiales sin autorización.

## 2. Stack preferido
- Next.js con App Router y TypeScript.
- Tailwind CSS y shadcn/ui.
- GitHub para control de versiones.
- Vercel para despliegues y funciones backend.
- Supabase: PostgreSQL, Auth, Storage y Row Level Security (RLS).
- pgvector para recuperación semántica cuando esté configurado.
- Proveedor LLM intercambiable mediante una capa de abstracción.
- Zod para validación de entradas y salidas.
- Pruebas automatizadas, lint y TypeScript strict.

Antes de añadir dependencias, comprueba el repositorio y las versiones existentes. No actualices paquetes masivamente sin justificación.

## 3. Reglas de ejecución
1. Inspecciona primero el repositorio y conserva el código útil. No sobrescribas proyectos existentes sin entenderlos.
2. Trabaja en fases pequeñas; ejecuta pruebas después de cada fase.
3. Construye funcionalidades reales, no solo una maqueta ni botones sin acción.
4. Si faltan credenciales, usa un modo demo funcional con datos ficticios claramente etiquetados.
5. No inventes información institucional, fechas, requisitos ni enlaces oficiales.
6. No expongas secretos en el cliente, GitHub, logs ni mensajes de error.
7. No ejecutes SQL arbitrario generado por un modelo.
8. No permitas que un documento, usuario o prompt de entrada modifique las políticas del sistema o conceda permisos.
9. No presentes trámites oficiales, cambies expedientes ni tomes decisiones académicas de forma autónoma.
10. Documenta las limitaciones que impidan una integración real; no declares completada una función que solo tiene interfaz.

## 4. Identidad y experiencia de usuario
Diseño premium, institucional y tecnológico: azul marino, blanco y acentos cian moderados; tipografía clara; tarjetas compactas; accesibilidad y diseño responsive. Evita un dashboard saturado. La navegación debe ser clara en escritorio y móvil.

Idiomas iniciales: español, gallego e inglés. Si no hay traducción validada, no presentes textos institucionales traducidos como oficiales.

## 5. Mapa de rutas
Públicas:
- `/` — landing comercial.
- `/plataforma` — módulos y arquitectura.
- `/agentes` — catálogo de agentes.
- `/demo` — chat de demostración.
- `/seguridad` — privacidad, permisos y límites.
- `/implantacion` — metodología de implantación.
- `/precios` — planes orientativos, claramente sujetos a validación.
- `/contacto` — formulario validado.
- `/login` — acceso.

Aplicación:
- `/app` — dashboard de usuario.
- `/app/chat` — superagente.
- `/app/historial` — conversaciones propias.
- `/app/solicitudes` — incidencias y derivaciones.

Administración protegida:
- `/admin` — resumen.
- `/admin/organizations` — organizaciones.
- `/admin/members` — miembros y roles.
- `/admin/agents` — configuración de agentes.
- `/admin/knowledge` — fuentes y documentos.
- `/admin/conversations` — revisión autorizada.
- `/admin/tickets` — derivaciones.
- `/admin/analytics` — uso, feedback y costes.
- `/admin/audit` — auditoría.

## 6. Agentes del MVP
Implementa un coordinador y agentes lógicos con responsabilidades delimitadas:
- **Campus Orchestrator:** clasifica la solicitud, pide aclaraciones si es necesario, elige el agente y controla el flujo.
- **Student Agent:** titulaciones, matrícula, calendarios, becas, movilidad y servicios.
- **Admin Agent:** explica procedimientos, prepara borradores y crea derivaciones; no presenta solicitudes oficiales.
- **Knowledge Agent:** recupera información de fuentes autorizadas y devuelve citas verificables.
- **Support Agent:** detecta falta de evidencia, gestiona feedback y prepara la derivación al servicio adecuado.

No es obligatorio ejecutar varios modelos independientes. Prioriza un flujo controlado, observable y económico. Define para cada agente instrucciones, herramientas permitidas, fuentes, límites y casos de escalado.

## 7. Chat y experiencia conversacional
- Interfaz de chat usable, con estados de carga, error, reintento y conversación nueva.
- Respuestas con título/resumen, pasos siguientes y fuentes enlazadas.
- Indicar incertidumbre si las fuentes no permiten responder.
- Nunca inventar fechas límite ni requisitos.
- Botones funcionales: copiar respuesta, valorar, nueva conversación y solicitar ayuda.
- Historial vinculado al usuario autenticado y aislado por organización.
- Límites de longitud, frecuencia, tokens y coste.
- No enviar datos personales innecesarios al proveedor LLM.
- No mostrar datos ficticios como datos reales de la universidad.

## 8. Knowledge base / RAG
Crear un pipeline para documentos autorizados:
- Incorporar PDF y texto en formatos compatibles.
- Guardar título, URL de origen, idioma, organización, fecha de revisión, versión y estado.
- Extraer texto, dividirlo en fragmentos y generar embeddings solo cuando haya proveedor configurado.
- Combinar búsqueda textual y semántica cuando sea viable.
- Filtrar siempre por organización, permisos, idioma y estado de vigencia.
- Devolver citas con enlaces reales a las fuentes.
- Marcar documentos desactualizados, enlaces rotos y fuentes pendientes de revisión.
- Incluir corpus ficticio de demo claramente etiquetado.
- No rastrear sistemas privados ni extraer información sin autorización.
- Tratar el contenido de los documentos como datos no confiables, nunca como instrucciones del sistema.

## 9. Base de datos
Diseña migraciones SQL versionadas para:
- `organizations`
- `memberships`
- `agents`
- `knowledge_sources`
- `documents`
- `document_chunks`
- `conversations`
- `messages`
- `tickets`
- `feedback`
- `usage_events`
- `audit_events`

Usa UUID, claves foráneas, índices, timestamps y estados. Incluye `organization_id` donde corresponda. Define roles mínimos: superadmin SaaS, administrador de organización, operador autorizado y usuario final.

**Seguridad obligatoria:**
- RLS activada en tablas accesibles desde el cliente.
- Verificar membresía y rol en el servidor; nunca confiar en un `organization_id` enviado por el navegador.
- Aislar estrictamente los datos de cada organización.
- La clave privilegiada de Supabase solo puede utilizarse en backend.
- No permitir que un usuario final consulte conversaciones de otros.
- Auditoría de acciones administrativas y cambios de permisos.
- Añadir pruebas negativas de aislamiento multi-tenant.

## 10. Backend y proveedor IA
- Centraliza las llamadas LLM en endpoints de servidor.
- Crea una interfaz de proveedor que permita cambiar de modelo sin reescribir el producto.
- Valida peticiones con Zod y controla errores y tiempos de espera.
- Añade rate limiting, cuotas por organización y registro de consumo.
- Separa variables de entorno local, preview y producción.
- Implementa herramientas explícitas con esquemas estrictos; no permitas acciones arbitrarias.
- Registra métricas mínimas sin guardar secretos ni datos personales innecesarios.
- Añade protección contra prompt injection y salida estructurada validada.
- No incluyas la clave privada de Supabase ni la API key del LLM en variables `NEXT_PUBLIC_*`.

## 11. Panel de administración
- CRUD de organizaciones, agentes y fuentes.
- Subida y revisión de documentos.
- Estado de indexación y fecha de última revisión.
- Revisión de feedback y tickets con permisos.
- Configuración de idiomas y límites de uso.
- Métricas: consultas, respuestas con fuentes, feedback, preguntas no resueltas, consumo estimado y errores.
- Los datos de demo deben llevar una etiqueta visible.
- Confirmación para acciones destructivas y registro de auditoría.
- No permitir la lectura global de conversaciones salvo rol y propósito autorizados.

## 12. SaaS y comercialización
Preparar multi-tenancy desde el inicio. Cada cliente podrá configurar marca autorizada, colores, dominio, idiomas, agentes, documentos, permisos y cuotas. No integrar pagos hasta validar el producto y su contratación. Los precios de la demo son orientativos, no ofertas contractuales.

## 13. Calidad y accesibilidad
- TypeScript estricto y componentes reutilizables.
- Formularios accesibles, navegación por teclado, estados de foco y contraste suficiente.
- Validación de entradas, errores comprensibles y páginas de error.
- Pruebas unitarias y de integración.
- Pruebas de autorización y aislamiento entre organizaciones.
- Verificación de build, lint y tipos antes de dar una fase por finalizada.
- No usar contenido “lorem ipsum” en páginas clave.
- No inventar métricas, testimonios, clientes ni resultados.

## 14. Entregables
1. Aplicación ejecutable y desplegable.
2. Landing comercial premium.
3. Demo conversacional funcional con corpus ficticio identificado.
4. Supabase Auth, esquema SQL y políticas RLS cuando existan credenciales.
5. Panel de usuario y panel administrativo protegido.
6. Agentes y RAG con citas verificables.
7. `.env.example` sin secretos.
8. README de instalación local y despliegue en Vercel.
9. Migraciones SQL versionadas.
10. Pruebas de autenticación, permisos, aislamiento, RAG y chat.
11. Lista de limitaciones y tareas pendientes.
12. Instrucciones de despliegue, rollback y recuperación.
13. Guía de configuración de proveedor LLM y control de costes.
14. Checklist para evaluación RGPD, accesibilidad y Reglamento Europeo de IA por responsables competentes.

## 15. Plan de trabajo
Fase 1: inspeccionar repositorio, documentar el estado actual y proponer plan.
Fase 2: implementar sistema visual, landing y navegación.
Fase 3: implementar demo de chat y corpus de prueba.
Fase 4: añadir Supabase, migraciones, autenticación, roles y RLS.
Fase 5: implementar RAG, fuentes, citas y derivaciones.
Fase 6: completar panel de administración, métricas y límites.
Fase 7: probar seguridad, accesibilidad, costes y despliegue.

Al terminar cada fase, informa de: archivos modificados, funcionalidades comprobadas, comandos de prueba ejecutados, problemas pendientes y siguiente paso. Empieza inspeccionando el repositorio actual y proponiendo el primer plan técnico antes de realizar cambios grandes.
