# Comparativa: America.gov (dinámico) vs USA.gov (estático)
## Ejemplo de referencia para la presentación de VIGO AI CAMPUS

> Fuente de inspiración: la eficiencia de una web dinámica que integra miles de fuentes en un único punto de entrada, frente a un portal estático tradicional.

---

## 1. Resumen ejecutivo

| Aspecto | America.gov (dinámico) | USA.gov (estático) |
|---|---|---|
| Enfoque | Un único punto de entrada conversacional | Directorio y páginas informativas |
| Fuentes | Integra más de 29.000 webs oficiales | Contenido propio y enlaces a agencias |
| Interacción | Chat en lenguaje natural + acciones | Navegación por menús y búsqueda |
| Actualización | Casi en tiempo real (minutos) | Ciclos editoriales y publicación manual |
| Transacciones | Inicio de trámites y seguimiento (roadmap) | Enlaces a sistemas de cada agencia |
| Identidad | Una marca unificada | Marca institucional compartida |

---

## 2. Qué es America.gov

- Portal lanzado el 29/09/2026 por la GSA y el National Design Studio.
- Utiliza IA (Grok y Gemini) para responder preguntas en lenguaje natural.
- Integra información de más de 29.000 sitios web federales (≈800 millones de páginas).
- Cada respuesta incluye enlaces a las fuentes oficiales.
- Privacidad por diseño: no guarda conversaciones ni datos personales; no requiere login.
- Roadmap 2027: completar formularios, seguimiento de trámites y organización de casos.

## 3. Qué es USA.gov

- Portal tradicional de información gubernamental (FirstGov → USA.gov, 2007).
- Organiza contenidos por temas, beneficios y agencias.
- Incluye herramientas como el localizador de beneficios por eventos vitales.
- Human-centered design y mejoras continuas (autocompletado en directorio de agencias, metadatos, FAQ schema).
- Satisfacción y finalización de tareas medidas y mejoradas (3,7 → 3,87 en USA.gov).
- Mantiene canales humanos: teléfono, correo, presencial.

---

## 4. Comparativa funcional

### 4.1 Descubrimiento de información
- **America.gov:** pregunta en lenguaje natural; la IA sintetiza y cita fuentes oficiales.
- **USA.gov:** navegación por categorías, buscador y directorio de agencias.

### 4.2 Cobertura y escala
- **America.gov:** 29.000 webs, 800M+ páginas, actualización en minutos.
- **USA.gov:** contenido curado y validado; menor escala pero mayor control editorial.

### 4.3 Acciones y trámites
- **America.gov:** previsto completar formularios y seguimiento dentro de la plataforma.
- **USA.gov:** redirige a los sistemas de cada agencia para ejecutar trámites.

### 4.4 Accesibilidad y privacidad
- **America.gov:** sin login obligatorio, sin tracking, conversación efímera.
- **USA.gov:** accesible y multicanal; formularios y datos según cada agencia.

### 4.5 Riesgos
- **America.gov:** respuestas generadas por IA pueden requerir verificación; no sustituye decisiones de agencias.
- **USA.gov:** menor riesgo de alucinación, pero mayor fricción y dispersión.

---

## 5. Lecciones para VIGO AI CAMPUS

1. **Un único punto de entrada** reduce la fricción: un superagente coordina servicios y fuentes.
2. **Citas verificables** son obligatorias: cada respuesta debe enlazar a la fuente oficial.
3. **Privacidad por diseño** aumenta la confianza: minimizar datos y no guardar conversaciones en demo.
4. **Actualización rápida** de fuentes es clave para evitar información desactualizada.
5. **Human-in-the-loop:** derivar casos no resueltos a servicios humanos, como hace USA.gov con sus agentes.
6. **No sustituir decisiones oficiales:** el agente informa y deriva, no aprueba ni modifica expedientes.
7. **Multicanal:** mantener teléfono, correo y presencial además del chat.

---

## 6. Aplicación al MVP de VIGO AI CAMPUS

- Demo con corpus ficticio etiquetado y citas verificables.
- Superagente que clasifica, recupera fuentes y deriva casos sin evidencia.
- Panel de administración para fuentes, agentes, métricas y auditoría.
- Multi-tenancy para escalar a otras universidades sin mezclar datos.
- Roadmap: integraciones autorizadas, trámites asistidos y métricas de calidad.

---

## 7. Fuentes

- GSA, "GSA Joins the White House’s National Design Studio in Unveiling America.gov" (29/09/2026).
- Executive Order, "Streamlining Access to Government Services Through America.gov" (2026).
- GovFacts, "What Is America.gov?".
- Axios, "Everything to know about America.gov" (29/09/2026).
- Federal News Network, "How the Trump administration has been building toward the America.gov launch".
- AP News, "Trump touts America.gov, but its government-sourced AI...".
- USAGov, "One year with the new USAGov" (14/05/2024).
- America.gov (sitio oficial).
