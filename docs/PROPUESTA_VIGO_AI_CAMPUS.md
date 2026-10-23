# VIGO AI CAMPUS
## Propuesta profesional de producto SaaS

**Eslogan:** Un campus. Un superagente. Todos los servicios.

**Estado:** propuesta de producto independiente para una posible demo y piloto. No implica respaldo ni colaboración oficial de la Universidade de Vigo.

## 1. Resumen ejecutivo
VIGO AI CAMPUS es una plataforma web SaaS que coordina servicios universitarios mediante un superagente de IA y agentes especializados. Ofrece un único punto de entrada para consultar información, encontrar procedimientos, preparar borradores y derivar casos a los servicios adecuados. El producto se diseña inicialmente con un contexto de uso universitario gallego y una arquitectura multiuniversidad para su comercialización posterior.

## 2. Propuesta de valor
- Atención informativa 24/7.
- Menos esfuerzo para encontrar el departamento correcto.
- Respuestas con fuentes autorizadas y control de vigencia.
- Orientación paso a paso sobre procedimientos.
- Derivación de casos no resueltos.
- Panel de métricas para detectar necesidades recurrentes.
- Configuración por organización, idioma, agente y permisos.

No se promete ahorro ni mejora académica sin medición previa.

## 3. Usuarios
- Estudiantes y futuros estudiantes.
- Personal docente e investigador.
- Personal administrativo.
- Responsables de servicios y dirección.
- Administradores SaaS y organizaciones cliente.

## 4. Módulos
1. Superagente Campus AI.
2. Student Services.
3. Trámites e incidencias.
4. Panel administrativo SaaS.
5. Profesorado e investigación (fase posterior).
6. Analítica institucional (fase posterior).
7. Atención multilingüe.
8. Integraciones autorizadas (fase posterior).

## 5. Agentes del MVP
- Campus Orchestrator: clasifica y coordina.
- Student Agent: consultas académicas y servicios.
- Admin Agent: explica procesos y prepara borradores.
- Knowledge Agent: busca y cita fuentes.
- Support Agent: detecta preguntas sin resolver y prepara derivaciones.

Los agentes tendrán herramientas y permisos limitados. No tomarán decisiones académicas o administrativas oficiales ni modificarán expedientes.

## 6. Mapa web
Público: Inicio, Plataforma, Agentes, Demo, Seguridad, Implantación, Precios, Contacto y Acceso.
Aplicación: Dashboard, Chat, Historial y Solicitudes.
Administración: Organizaciones, Miembros, Agentes, Conocimiento, Conversaciones autorizadas, Tickets, Analítica y Auditoría.

## 7. Arquitectura
- Next.js + TypeScript + Tailwind CSS.
- GitHub para repositorio, revisiones y CI.
- Vercel para hosting y backend.
- Supabase PostgreSQL, Auth, Storage y RLS.
- pgvector para búsqueda semántica cuando esté configurado.
- Proveedor LLM intercambiable mediante una capa backend.
- RAG con fuentes autorizadas, referencias y control de vigencia.

## 8. MVP
### Demo inicial
- Landing comercial.
- Chat funcional con corpus ficticio claramente etiquetado.
- Respuestas con referencias.
- ES/GL/EN.
- Feedback y derivación simulada.

### MVP SaaS
- Autenticación.
- Organizaciones y roles.
- Gestión de documentos.
- RAG y citas.
- Panel de administración.
- Cuotas, uso, costes y auditoría.
- Pruebas de aislamiento multi-tenant.

### Piloto
- Fuentes institucionales aprobadas.
- Un servicio o facultad participante.
- Métricas acordadas antes de empezar.
- Integraciones solo después de autorización y evaluación de seguridad.

## 9. Indicadores
- Precisión de respuestas fundamentadas.
- Porcentaje de consultas resueltas.
- Derivaciones adecuadas.
- Satisfacción.
- Tiempo de respuesta.
- Coste por consulta.
- Vigencia de fuentes.
- Incidencias y errores.

Definir metas después de medir una línea base.

## 10. Modelo comercial orientativo
Hipótesis iniciales para validación, no tarifas de mercado verificadas:
- Demo: gratuita.
- Campus Start: 300–600 €/mes.
- Campus Pro: 900–1.800 €/mes.
- Enterprise: desde 2.500 €/mes.
- Implantación: 1.500–15.000 € o más según el alcance.

Los contratos deben cubrir soporte, consumo IA, alojamiento, seguridad, personalización y contratación pública.

## 11. Implantación
1. Preparar demo con datos ficticios y fuentes públicas autorizadas.
2. Identificar un servicio o facultad colaboradora.
3. Seleccionar un conjunto limitado de preguntas frecuentes.
4. Validar las respuestas con responsables del proceso.
5. Medir calidad, derivación, satisfacción y costes.
6. Proponer expansión solo si los resultados justifican el siguiente paso.

## 12. Riesgos y controles
- Información desactualizada: versionado y revisión de fuentes.
- Alucinaciones: RAG, citas y reconocimiento de incertidumbre.
- Acceso indebido: RLS, autorización backend y pruebas negativas.
- Costes IA: cuotas, límites y monitorización.
- Privacidad: minimización, retención definida y evaluación legal.
- Dependencia de proveedor: capa LLM intercambiable.
- Uso de marca institucional: no aparentar respaldo sin autorización.

## 13. Hoja de ruta orientativa
- Semanas 1–2: diseño y demo.
- Semanas 3–8: MVP SaaS con autenticación, RAG y administración.
- Meses 2–4 o más: preparación y ejecución de piloto, según acuerdos y accesos.

Las estimaciones dependen del estado del repositorio, disponibilidad del equipo, integraciones y requisitos de seguridad.
