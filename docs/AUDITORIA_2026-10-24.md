# Auditoría y Plan de Mejora — Vigo AI Campus

> **URL auditada:** https://vigo-ai-campus.vercel.app/
> **Fecha de auditoría:** 24 de octubre de 2026
> **Alcance:** Landing page, sección de agentes, modelo de confianza y encaje institucional
> **Autor:** Auditoría externa

---

## 📋 Resumen Ejecutivo

Vigo AI Campus presenta una **base conceptual sólida**: arquitectura multiagente clara, enfoque explícito en la verificabilidad de fuentes y un diseño que evita la invención de trámites. El principal reto no es tecnológico, sino **de demostración de valor y de integración institucional**. Este documento recoge los hallazgos y un plan de mejora priorizado en tres fases.

---

## 🔍 Auditoría: Fortalezas y Áreas de Mejora

### ✅ Fortalezas Actuales

- **Arquitectura multiagente bien definida**: Orchestrator, Student, Admin, Knowledge y Support Agent con responsabilidades delimitadas. Facilita el mantenimiento y la escalabilidad.
- **Enfoque en confianza y trazabilidad**: Se citan fuentes oficiales, se muestra la fecha de captura y se deriva a humanos cuando la confianza es baja. Diferenciador clave frente a chatbots genéricos.
- **Transparencia desde el inicio**: El aviso de "Demo independiente · No oficial" gestiona correctamente las expectativas.
- **Base de conocimiento cuantificada**: 26 fuentes oficiales, 69.732 caracteres indexados y 2 PDFs. Buen punto de partida para un corpus versionado.

### ⚠️ Áreas de Mejora Detectadas

1. **Profundidad funcional limitada en el modo demo**: No se detalla qué puede hacer realmente el usuario en la demo. La experiencia podría ser demasiado superficial para demostrar el valor del agente.
2. **Falta de personalización visible por perfil**: Aunque se mencionan "4 perfiles de acceso", no se explica cómo se adapta la interfaz o las respuestas para estudiantes, personal administrativo, docentes o futuros estudiantes.
3. **Ausencia de métricas de impacto en la landing**: No se muestran indicadores como tiempo de resolución, tasa de derivación exitosa o satisfacción. Datos fundamentales para convencer a stakeholders universitarios.
4. **Integración con el ecosistema UVigo no explicitada**: UVigo ya cuenta con MooVi (Moodle) y Campus Remoto, y está impulsando pilotos de IA generativa en 44 asignaturas. La plataforma no menciona posibles integraciones con estos sistemas.
5. **Experiencia de usuario (UX) mejorable**: La landing es informativa pero estática. No hay un flujo guiado que muestre "cómo sería" usar el agente en un caso real.
6. **Gobernanza y seguridad no detalladas**: Se menciona "Seguridad" en el menú, pero no se explica el modelo de control de acceso basado en roles (RBAC), la privacidad de datos o la auditoría de decisiones del agente.
7. **Escalabilidad del corpus**: 26 fuentes es un inicio, pero para cubrir "todos los servicios" se necesitará un pipeline de ingesta más robusto y una estrategia de actualización automática.

---

## 🗺️ Plan de Mejora Priorizado

### 🎯 Fase 1 — Corto Plazo (1–2 meses): Consolidar la Demo y la Confianza

**Objetivo**: Convertir la demo en una experiencia convincente y demostrar el valor diferencial.

1. **Demo interactiva guiada**
   - Implementa un "tour" con 3–4 casos de uso predefinidos (ej: consultar plazo de matrícula, solicitar beca, cambiar de grupo).
   - Muestra la conversación completa, las fuentes citadas y el flujo de derivación si la confianza es baja.

2. **Página de métricas de demo**
   - Añade una sección con métricas en tiempo real o simuladas: consultas resueltas, porcentaje de respuestas con fuente oficial, tiempo medio de respuesta y tasa de derivación.

3. **Explicitar la personalización por perfil**
   - Añade una sección que muestre cómo cambia la experiencia según el perfil (Student Agent, Admin Agent, etc.).

4. **Checklist de seguridad y gobernanza**
   - Publica un resumen del modelo RBAC, la política de privacidad y el proceso de auditoría.

---

### 🚀 Fase 2 — Medio Plazo (3–6 meses): Profundizar en Funcionalidad e Integración

**Objetivo**: Pasar de una demo a un prototipo funcional con valor operativo real.

5. **Integración con sistemas UVigo (piloto)**
   - Explora la conexión con MooVi (Moodle) para calendarios académicos o con el Campus Remoto para información de asignaturas.
   - Un piloto con una escuela de ingeniería sería un caso de éxito tangible.

6. **Enriquecimiento del corpus con knowledge graph**
   - Incorpora un grafo de conocimiento para modelar relaciones entre titulaciones, asignaturas, requisitos de becas y plazos.
   - Mejora la precisión en consultas complejas y la capacidad de razonamiento.

7. **Human-in-the-loop (HITL) formalizado**
   - Diseña un flujo donde las respuestas con baja confianza se enruten a un humano para revisión antes de enviarse.

8. **Panel de administración para gestores**
   - Interfaz donde el personal administrativo pueda revisar conversaciones, corregir respuestas erróneas, añadir fuentes y ver analíticas de uso.

---

### 🌐 Fase 3 — Largo Plazo (6–12 meses): Escalar a una Plataforma Comunitaria

**Objetivo**: Transformar el agente en un hub de información y gestión para toda la comunidad universitaria.

9. **Expansión a funcionalidades comunitarias**
   - Foro o chat grupal donde los estudiantes puedan discutir dudas y el agente intervenga como participante adicional.

10. **Motor de recomendación personalizado**
    - Basado en perfil e historial, sugerir becas, actividades o recursos académicos, y anticiparse a necesidades.

11. **Gobernanza de datos y cumplimiento normativo**
    - Formaliza un comité de ética y gobernanza de IA que supervise sesgo, privacidad y transparencia.

12. **API abierta para integraciones**
    - Publica una API para que otros servicios universitarios (biblioteca, deportes, etc.) integren el agente en sus canales.

---

## 📌 Recomendaciones Transversales

- **Narrativa de "capa de confianza"**: Refuerza el mensaje de que el agente no sustituye a la administración, sino que **filtra, verifica y deriva**.
- **Enfoque en casos de uso acotados**: No intentes cubrir "todos los servicios" de golpe. Empieza con 2–3 flujos críticos (matrícula, becas, calendario) e itera.
- **Medición continua**: Define KPIs desde el inicio:
  - Precisión de respuestas (validada por humanos)
  - Tasa de derivación
  - Tiempo de resolución
  - Satisfacción (CSAT)
  - Uso por perfil

---

## 📊 Matriz de Priorización (Resumen)

| # | Acción | Impacto | Esfuerzo | Fase |
|---|--------|---------|----------|------|
| 1 | Demo interactiva guiada | Alto | Medio | 1 |
| 2 | Métricas de demo visibles | Alto | Bajo | 1 |
| 3 | Personalización por perfil explícita | Medio | Bajo | 1 |
| 4 | Checklist de seguridad y gobernanza | Alto | Bajo | 1 |
| 5 | Integración piloto con UVigo (MooVi) | Alto | Alto | 2 |
| 6 | Knowledge graph del corpus | Medio | Alto | 2 |
| 7 | HITL formalizado | Alto | Medio | 2 |
| 8 | Panel de administración | Alto | Medio | 2 |
| 9 | Funcionalidades comunitarias | Medio | Alto | 3 |
| 10 | Motor de recomendación | Medio | Alto | 3 |
| 11 | Comité de gobernanza de IA | Alto | Medio | 3 |
| 12 | API abierta | Medio | Alto | 3 |

---

## 💎 Conclusión

Vigo AI Campus tiene una base conceptual excelente y una arquitectura técnica prometedora. Si logras que la demo sea más tangible, que las métricas sean visibles y que la plataforma dialogue con el ecosistema UVigo existente, estarás en una posición muy fuerte para pasar de proyecto académico a solución adoptada por la comunidad universitaria.

---

## 📎 Anexo: KPIs Sugeridos

| KPI | Descripción | Objetivo inicial |
|-----|-------------|------------------|
| Precisión de respuestas | % de respuestas validadas como correctas por humanos | ≥ 90% |
| Cobertura de fuentes | % de respuestas con al menos una fuente oficial citada | ≥ 95% |
| Tasa de derivación | % de consultas derivadas a humanos | 10–20% |
| Tiempo medio de respuesta | Segundos hasta la primera respuesta útil | < 5 s |
| CSAT | Satisfacción del usuario (escala 1–5) | ≥ 4.2 |
| Uso por perfil | Distribución de consultas por tipo de usuario | Equilibrado |

---

*Documento generado como parte de la auditoría de Vigo AI Campus.*