# Piloto del asistente académico en la web del departamento

> Documento de trabajo para la dirección del TFG · 27 de octubre de 2026
> Autor: estudiante del TFG · Destinatario: director/a del TFG y dirección del departamento

---

## 0. La petición, en una frase

**Autorizar un piloto de 8 semanas del asistente en la web del departamento, sin sustituir ningún canal existente, para medir con datos reales si reduce consultas repetitivas y mejora la experiencia del estudiantado.**

No se pide presupuesto, ni cambios de infraestructura, ni acceso a datos personales. Se pide un enlace y un periodo de prueba acotado, reversible y evaluable.

---

## 1. Resumen ejecutivo

El proyecto es un asistente académico que responde preguntas sobre matrícula, becas, calendario, movilidad y servicios **citando siempre la fuente oficial** y **absteniéndose cuando no tiene evidencia suficiente**. Ya está construido, desplegado y medido: 59 pruebas automatizadas, un set de evaluación de 30 preguntas y un benchmark específico de paráfrasis en español, gallego e inglés.

La pregunta que queda por responder no es técnica, sino empírica: **¿funciona con las preguntas reales del estudiantado, escritas como las escribe la gente?** El corpus actual es público y la evaluación es reproducible, pero las consultas del set las hemos escrito nosotros. Un piloto en la web del departamento sustituye esa simulación por uso real durante 8 semanas.

**Qué se propone**

| Elemento | Propuesta |
|---|---|
| Duración | 8 semanas lectivas (adaptable al calendario) |
| Superficie | Un botón flotante y una página `/asistente` en la web del departamento |
| Alcance | Preguntas sobre información pública del departamento y de la UVigo |
| Datos personales | Ninguno: sin expediente, sin notas, sin contraseñas, sin teléfono |
| Coste marginal | Menos de 15 € al mes con 5.000 consultas; 0 € en modo autoalojado |
| Reversibilidad | Interruptor de apagado en menos de un minuto; la web sigue igual |
| Evaluación | Panel con métricas semanales y criterios de éxito acordados antes de empezar |

**Qué se obtiene**

1. Datos reales para el TFG: consultas, reformulaciones, abstenciones, valoraciones y preguntas sin respuesta.
2. Un informe de resultados con recomendación go/no-go, entregable a la dirección del centro.
3. Una mejora concreta y de bajo riesgo para un servicio que hoy responde con correos y teléfono.

**La decisión que se pide**: autorizar el piloto y nombrar a una persona de contacto del departamento. Nada más.

---

## 2. El problema

### 2.1 El coste de responder siempre lo mismo

Las secretarías y las coordinaciones de grado reciben consultas que se repiten cada curso: plazos de matrícula, requisitos de beca, reconocimiento de créditos, calendario de exámenes, movilidad, acceso a la biblioteca. Gran parte de la información ya está publicada, pero está dispersa en varias páginas, PDF y normativas, y el estudiantado no siempre encuentra la respuesta.

El resultado es un doble coste:

- **Para el estudiantado**: tiempo, incertidumbre y riesgo de perderse un plazo.
- **Para el personal**: interrupciones repetitivas que no aportan valor y que se concentran en las semanas críticas del curso.

### 2.2 Por qué un buscador no basta

La web institucional funciona bien cuando la persona sabe qué palabra buscar. Falla cuando pregunta con sus propias palabras: «¿qué papeles tengo que llevar para empezar el curso?», «mi familia no puede pagar los estudios», «¿dónde saco libros en préstamo?». Son consultas que no comparten términos con el documento que contiene la respuesta.

Ese es exactamente el hueco que cubre la búsqueda híbrida: combina coincidencia de términos (BM25) con similitud semántica (embeddings), de modo que encuentra el documento aunque la pregunta use sinónimos, gallego o inglés.

### 2.3 Por qué ahora

El proyecto ya tiene lo difícil hecho: corpus versionado, recuperación híbrida, citas verificables, abstención ante falta de evidencia, evaluación reproducible y despliegue. Lo que falta es el paso que ningún conjunto sintético puede dar: **medir con preguntas reales**.

---

## 3. Qué hemos construido y qué evidencia hay

### 3.1 Arquitectura, en una imagen

```
Web del departamento
        │
        ▼
  Botón / página del asistente
        │
        ▼
  POST /api/chat  ──►  seguridad + rate limit + idioma
        │
        ▼
  Retrieval híbrido
   ├─ BM25 sobre el corpus versionado
   └─ pgvector sobre 131 fragmentos (embeddings 1.536 dims)
        │
        ▼
  Gate de evidencia ──► si no hay cobertura suficiente: ABSTENCIÓN
        │
        ▼
  LLM con prompt versionado ──► si falla: compositor extractivo
        │
        ▼
  Respuesta + citas oficiales + requestId + métricas
```

Cada respuesta que afirma algo incluye la fuente. Si no hay evidencia, el sistema lo dice y ofrece derivación humana; no rellena el hueco con texto plausible.

### 3.2 Resultados medidos (27/10/2026)

**Set principal: 30 preguntas (22 respondibles, 8 de abstención)**

| Métrica | Resultado | Umbral |
|---|---|---|
| Recall de recuperación | 1,000 | ≥ 0,85 |
| Cobertura de respuesta | 1,000 | ≥ 0,85 |
| Abstención correcta | 1,000 | ≥ 0,90 |
| Validez de citas | 1,000 | ≥ 0,95 |
| Cita esperada | 1,000 | ≥ 0,80 |
| *Faithfulness* operativa | 1,000 | ≥ 0,90 |
| Latencia p95 (retrieval + compositor) | 1.043 ms | < 4.000 ms |

**Benchmark de paráfrasis: 12 preguntas en ES/GL/EN**

| Métrica | Solo léxico | Híbrido |
|---|---|---|
| Recall@1 | 0,083 | **0,750** |
| Recall@5 | 0,333 | **1,000** |
| MRR | 0,144 | **0,825** |

Estas 12 preguntas se escribieron para que no compartieran vocabulario con el documento correcto. Son el mejor predictor disponible de lo que ocurrirá con consultas reales.

**Otros datos**

- Corpus: 40 documentos (26 fuentes oficiales de `uvigo.gal` y 14 fuentes de demostración), 131 fragmentos, ~70.000 caracteres.
- Coste de indexar todo el corpus: **0,000422 $**.
- Coste de una consulta: ~30 tokens de embedding (~0,0000006 $), despreciable frente al coste del LLM.
- Pruebas: **59/59** en verde; `lint`, `tsc` y `build` limpios.
- Migración `0003` aplicada: índice HNSW y función `match_document_chunks` activos en Supabase (`npm run semantic:status` → `Backend: pgvector`). La RPC tarda 85–250 ms y el *fallback* en memoria se conserva como red de seguridad.

### 3.3 Lo que todavía no está resuelto

La honestidad aquí es parte del argumento. Un piloto mal planteado genera datos que no sirven; uno bien planteado reconoce sus límites antes de empezar.

1. **Latencia del LLM real.** Con modelos gratuitos se han medido respuestas de 8–29 s. El retrieval y el compositor cumplen de sobra (p95 1.043 ms, dominado por la llamada de embeddings), pero la experiencia completa necesita un modelo de pago: 1–3 s típicos por respuesta. El piloto debe incluir una pequeña partida para eso (ver §7).
2. **Cobertura del corpus.** El corpus actual cubre la información pública general de la UVigo. La información específica del departamento (guías docentes, horarios, TFG, prácticas) habrá que añadirla en las dos primeras semanas.
3. **Datos de uso real.** No hay todavía un estudio de usabilidad con estudiantado real ni un registro de consultas reales. El piloto cubre ambas cosas: 5 sesiones moderadas en la semana 3 y 5 semanas de uso instrumentado.
4. **Adopción.** Un asistente correcto pero invisible no genera datos. Por eso el diseño incluye un botón en páginas de alta consulta, un QR en secretaría y un correo de presentación.

---

## 4. El piloto propuesto

### 4.1 Hipótesis

> **H1.** Al menos el 60 % de las consultas recibidas se resuelven sin derivación humana, con una cita oficial válida.
>
> **H2.** La satisfacción mediana del estudiantado es ≥ 4/5.
>
> **H3.** El sistema mantiene la abstención correcta ≥ 90 % y no produce ninguna respuesta con datos personales o fuentes fuera de dominio.
>
> **H4.** El personal del departamento percibe una reducción de consultas repetitivas o, como mínimo, no un aumento de trabajo.

Si H1–H3 se cumplen y H4 no empeora, el piloto se considera un éxito y se recomienda continuar. Si H1 o H3 fallan, se documenta por qué y se propone una segunda iteración o el cierre.

### 4.2 Alcance

**Dentro**

- Información pública del departamento: titulaciones, horarios, calendario de exámenes, TFG, prácticas, movilidad, becas, contacto y normativa.
- Información pública general de la UVigo ya indexada.
- Preguntas en español, gallego e inglés.
- Derivación a la persona o unidad correcta cuando no hay respuesta.

**Fuera**

- Expediente, notas, matrícula individual o cualquier dato personal.
- Contraseñas, datos de salud, teléfonos personales.
- Decisiones académicas vinculantes (admisiones, convalidaciones, sanciones).
- Sustituir los canales oficiales de atención o los plazos administrativos.
- Uso en exámenes o evaluación del alumnado.

### 4.3 Diseño en 8 semanas

| Semana | Qué se hace | Entregable |
|---|---|---|
| 1 | Acuerdo, revisión con el DPO, verificación del backend pgvector, alta del corpus del departamento | Checklist legal + corpus ampliado |
| 2 | Integración del botón y la página `/asistente`; analítica sin cookies; aviso de privacidad | URL de pruebas accesible |
| 3 | 5 sesiones de usabilidad (20–30 min) y corrección de los 5 problemas más graves | Informe de usabilidad |
| 4 | Lanzamiento controlado: enlace visible en 2 páginas de alta consulta | Primer panel semanal |
| 5 | Operación + revisión semanal de preguntas sin respuesta | Corpus actualizado |
| 6 | Operación + encuesta breve a quien use el asistente | Datos de satisfacción |
| 7 | Análisis intermedio; ajuste de umbrales y prompts si procede | Informe intermedio |
| 8 | Cierre, entrevistas al personal y informe final con go/no-go | Informe ejecutivo |

**Esfuerzo del departamento:** aproximadamente **4–6 horas en total** (una reunión de arranque, una revisión de contenidos y una entrevista final). El resto lo asume el estudiante.

### 4.4 Qué se integra exactamente en la web

Tres opciones, de menor a mayor intrusión. La recomendada es la A.

**A. Botón flotante + página propia (recomendada).** Un botón discreto en la esquina inferior derecha y una página `/asistente` enlazada desde el menú. No se toca el contenido existente. Se puede retirar con un cambio de configuración.

**B. Enlace en la sección de atención al estudiante.** Solo un enlace «¿Tienes una duda? Pregunta al asistente», sin botón flotante. Aún menos visible, pero también menos útil para medir.

**C. Iframe dentro de una página existente.** No recomendada: complica accesibilidad, analítica y soporte móvil.

**Requisitos técnicos para el departamento:** ninguno. La aplicación se despliega en la infraestructura actual (Vercel + Supabase), con un subdominio o una ruta acordada. Si el departamento prefiere que no salga de su dominio, se puede integrar como *widget* embebido; el coste es una revisión de accesibilidad adicional.

### 4.5 Qué NO se hará

- No se recogerán datos personales ni se pedirá inicio de sesión para usar el asistente.
- No se enviarán correos al estudiantado ni se hará *tracking* publicitario.
- No se tomarán decisiones automáticas ni se emitirán actos administrativos.
- No se publicará nada sin revisión del departamento.
- No se usará el contenido del departamento para entrenar modelos.

---

## 5. Métricas y criterios de éxito

### 5.1 Métricas primarias

| Métrica | Definición | Meta |
|---|---|---|
| Tasa de resolución | Consultas con respuesta y cita válida / consultas respondibles | ≥ 60 % |
| Satisfacción | Mediana de la encuesta de 5 puntos | ≥ 4,0 |
| Abstención correcta | Consultas sin evidencia que se abstienen / consultas sin evidencia | ≥ 90 % |
| Validez de citas | Citas que apuntan a una URL oficial existente / citas emitidas | ≥ 95 % |
| *Faithfulness* | Afirmaciones verificables en el contexto / afirmaciones | ≥ 90 % |
| Latencia p95 | Tiempo hasta el primer token y hasta el último | < 4 s / < 8 s |

### 5.2 Métricas de seguridad y calidad

| Métrica | Meta |
|---|---|
| Respuestas con datos personales | 0 |
| Respuestas con URL fuera de `uvigo.gal` | 0 |
| Incidentes de seguridad o fuga | 0 |
| Consultas con *prompt injection* bloqueadas | 100 % de las pruebas |
| Accesibilidad axe (critical/serious) | 0 |

### 5.3 Criterios go/no-go

Se recomienda continuar si, al cierre:

1. Resolución ≥ 60 % y satisfacción ≥ 4/5.
2. Abstención correcta ≥ 90 % y cero incidentes de datos personales.
3. El personal del departamento no reporta un aumento de trabajo.
4. El coste mensual se mantiene dentro del techo acordado.

Se recomienda no continuar (o repetir con cambios) si falla cualquiera de los puntos 1–2. En ese caso, el TFG documenta el resultado negativo, que también es un resultado válido y publicable.

### 5.4 Cómo se mide

- **Instrumentación propia**: cada respuesta guarda `requestId`, agente, confianza, citas, latencia y si se abstuvo. Los eventos se agregan en `audit_events` y se muestran en `/admin/analytics`.
- **Valoración 👍/👎** al final de cada respuesta, con comentario opcional.
- **Encuesta de 3 preguntas** a las 2 semanas de uso (voluntaria, anónima).
- **Entrevistas semiestructuradas** a 2–3 personas del personal y a 5 estudiantes.
- **Revisión manual** de una muestra aleatoria de 50 respuestas (precisión y tono).
- **Analítica sin cookies**: solo conteos agregados y `requestId`; no se usan identificadores persistentes.

El panel semanal se comparte con la persona de contacto del departamento. Nada se publica sin su visto bueno.

---

## 6. Protección de datos y seguridad

> Esta sección está escrita para ser revisada por el DPO. No sustituye su dictamen.

### 6.1 Principios

1. **Minimización**: el asistente no necesita saber quién pregunta para responder sobre información pública.
2. **Finalidad**: mejorar el servicio y evaluar el piloto; nada más.
3. **Transparencia**: aviso claro de que es un asistente de IA y de qué datos se guardan.
4. **Control**: interruptor de apagado y borrado de datos a petición.
5. **Seguridad desde el diseño**: RLS, secretos solo en servidor, *rate limiting*, auditoría y pruebas de inyección.

### 6.2 Datos que se tratan

| Dato | ¿Se guarda? | Detalle |
|---|---|---|
| Texto de la consulta | Sí, 30 días | Para mejorar el corpus y evaluar calidad |
| Respuesta y citas | Sí, 30 días | Junto al `requestId` |
| Valoración 👍/👎 | Sí, anonimizada | Sin identificador de usuario |
| Dirección IP | No en claro | Hash con sal si se necesita *rate limiting* |
| Correo o nombre | No | No hay registro para usar el asistente |
| Expediente, notas, contraseñas | No | Bloqueados por el *gate* de seguridad |
| Cookies de analítica | No | Solo métricas agregadas en servidor |

Retención: 30 días para consultas y respuestas; 12 meses para métricas agregadas sin datos personales. Borrado: automatizado por trabajo programado y manual a petición.

### 6.3 Base jurídica y transparencia

- **Base jurídica**: consentimiento del usuario (art. 6.1.a RGPD) para el tratamiento de su consulta, con aviso previo y posibilidad de no usarlo. Para las métricas agregadas, interés legítimo con datos disociados.
- **Aviso**: banner en la primera visita y enlace permanente a la política de privacidad del piloto.
- **Derechos**: información, acceso, rectificación, supresión y oposición, con un correo de contacto del responsable.
- **Menores**: el servicio se dirige a mayores de edad; si se detecta un uso por menores, se aplica la política general de la universidad.

### 6.4 Encargados y transferencias

El piloto contempla dos modos. La elección corresponde al DPO y a la dirección.

**Modo A — API alojada en la UE con DPA.** Proveedor con contrato de encargado del tratamiento, retención cero y servidores en la UE. Es el modo recomendado para el piloto si se quiere velocidad y coste bajo.

**Modo B — modelo autoalojado.** El modelo se ejecuta en un servidor del departamento o en una máquina con GPU cedida. No hay transferencia internacional y el coste marginal es 0 €, a cambio de más latencia o de una máquina dedicada. Es el modo recomendado si el DPO prefiere que ningún texto salga de la universidad.

En ambos casos: no se entrena con los datos, se documenta la cadena de encargados y se revisan las cláusulas contractuales tipo (SCC) si hay transferencia.

### 6.5 Seguridad técnica

- **Aislamiento multi-tenant** con RLS y filtro por `organization_id` en todas las consultas.
- **Secretos** solo en servidor; nunca en `NEXT_PUBLIC_*`.
- **Rate limiting** por IP+UA (8/min y límite diario), con Upstash si se quiere distribuido.
- **Sanitización** y detección de *prompt injection* en ES/GL/EN.
- **Citas verificables**: cada URL se valida contra el dominio oficial.
- **Abstención**: si la cobertura léxica es baja, no se responde.
- **Auditoría**: `requestId` en logs, `audit_events` y respuesta al cliente.
- **Pruebas**: 59 automatizadas, incluidas seguridad, aislamiento, inyección y evaluación de calidad.

### 6.6 Qué pasa si algo falla

| Fallo | Respuesta |
|---|---|
| El LLM no responde o agota cuota | Compositor extractivo con las mismas fuentes; nunca una página vacía |
| El retrieval semántico falla | Se usa BM25; el chat sigue funcionando |
| Una respuesta es incorrecta | El usuario valora 👎, se revisa en 48 h y se corrige el corpus |
| Se detecta un dato personal | Se activa el protocolo, se borra y se documenta el incidente |
| Riesgo reputacional o legal | Interruptor de apagado en menos de un minuto; la web sigue igual |

---

## 7. Costes

| Concepto | Coste estimado | Nota |
|---|---|---|
| LLM (modo A, 5.000 consultas/mes) | 5–15 €/mes | Modelo rápido tipo *flash*; el coste real se mide y se topa |
| Embeddings | < 0,01 €/mes | 131 fragmentos ya indexados; consultas ~30 tokens |
| Supabase | 0 € | Plan gratuito suficiente para el piloto |
| Vercel | 0 € | Plan gratuito o el que ya tenga el proyecto |
| Dominio / subdominio | 0 € | Se usa el existente |
| **Total** | **< 15 €/mes** | **0 € en modo autoalojado** |

**Techo de seguridad**: límite diario por IP y alerta al alcanzar el 80 % del presupuesto mensual. Si se supera, el sistema sigue respondiendo con el compositor extractivo.

No se solicita financiación. Si la dirección prefiere coste cero, el modo B (autoalojado) elimina la partida de LLM.

---

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Respuesta incorrecta con apariencia de seguridad | Media | Alto | Citas obligatorias, abstención, revisión de 50 respuestas, botón de reporte |
| Contenido desactualizado | Media | Medio | `checksum`, estado `stale`, alerta a los 90 días, revisión semanal |
| Baja adopción | Media | Medio | Botón en páginas de alta consulta, QR en secretaría, correo de presentación |
| Objeción de protección de datos | Media | Alto | Modo B autoalojado, retención 30 días, DPIA simplificada, revisión del DPO |
| Coste del LLM se dispara | Baja | Bajo | Techo mensual, límite por IP, *fallback* extractivo |
| Dependencia de un proveedor | Baja | Medio | Capa de abstracción; cambio de modelo por variable de entorno |
| Uso indebido (inyección, *spam*) | Media | Medio | Sanitización, *rate limit*, pruebas y auditoría |
| Expectativas exageradas | Media | Medio | Lenguaje claro: «asistente», no «sustituto»; alcance escrito |
| Pérdida de reputación si falla | Baja | Alto | Piloto acotado, aviso de IA, interruptor, revisión previa del departamento |

---

## 9. Roles y gobernanza

| Rol | Quién | Responsabilidad |
|---|---|---|
| Patrocinador | Dirección del departamento | Autoriza el piloto y lo representa |
| Dirección académica | Director/a del TFG | Valida el diseño, la evaluación y el informe |
| Contacto operativo | Una persona del departamento (PTGAS o coordinación) | Revisa contenidos y recibe el panel semanal |
| Responsable técnico | Estudiante del TFG | Integración, corpus, métricas e informes |
| Revisión legal | DPO / servicio jurídico | Dictamen sobre base jurídica y encargados |
| Revisión de accesibilidad | Unidad responsable o docente especializado | Valida WCAG 2.2 AA |

**Cadencia**: reunión de 20 minutos cada dos semanas; panel semanal por correo; informe final en la semana 8.

**Criterio de parada**: cualquier incidente de datos personales, una tasa de error grave superior al 5 % en la revisión manual o una instrucción de la dirección. La parada es inmediata y no requiere justificación.

---

## 10. Cronograma

```
Semana  1  2  3  4  5  6  7  8
Legal   ██
Corpus     ██
Web        ██
Usabilidad    ██
Operación        ███████████
Análisis                    ██
Informe                        ██
```

Hitos:

- **Fin de semana 1**: checklist legal y corpus del departamento cargado.
- **Fin de semana 2**: URL de pruebas y aviso de privacidad.
- **Fin de semana 3**: informe de usabilidad y correcciones.
- **Semana 4**: lanzamiento controlado.
- **Semana 6**: datos de satisfacción.
- **Semana 8**: informe final y recomendación.

Si el calendario académico lo exige, el piloto se puede comprimir a 6 semanas eliminando la semana de usabilidad y haciendo la revisión en la semana 2.

---

## 11. Objeciones y respuestas

**«No tenemos tiempo para otro proyecto.»**
El departamento aporta 4–6 horas en total. La integración, el corpus, la analítica y los informes los asume el estudiante. La reunión de arranque es de 30 minutos.

**«Esto es un TFG, no un producto.»**
Precisamente por eso el piloto es acotado: 8 semanas, un departamento, un enlace y un informe. No se pide adoptar nada de forma permanente. Y el TFG necesita datos reales para ser evaluable; sin piloto, la evaluación se queda en un conjunto sintético.

**«La IA inventa respuestas.»**
El sistema está diseñado para lo contrario: responde solo si hay evidencia, cita la fuente y se abstiene si no la hay. En la evaluación, la abstención correcta es 1,000 y el *faithfulness* 1,000. Además, cada respuesta se puede reportar y se revisa en 48 horas.

**«¿Y si el asistente da una información errónea sobre un plazo?»**
Toda respuesta con plazo incluye la URL oficial y la fecha de revisión. El asistente no sustituye la secretaría: deriva cuando la pregunta es individual o vinculante. En la revisión manual se comprueba una muestra de 50 respuestas.

**«No podemos enviar datos a un proveedor externo.»**
Hay dos modos. El modo B ejecuta el modelo en un servidor del departamento: ningún texto sale de la universidad. El modo A usa un proveedor europeo con contrato de encargado y retención cero. La elección es del DPO.

**«Ya tenemos la web y funciona.»**
No se sustituye nada. El asistente es una capa de consulta sobre la información que ya existe. Si el piloto no aporta valor, se retira y la web queda exactamente igual.

**«¿Quién mantiene el corpus?»**
El contenido ya existe. El sistema avisa cuando una fuente cambia o caduca (`stale`). La revisión mensual estimada es de 1 hora.

**«No hay presupuesto.»**
El coste es inferior a 15 €/mes y puede ser 0 € en modo autoalojado. No se pide financiación; solo autorización.

**«¿Por qué este departamento y no otro?»**
Porque tiene un volumen alto de consultas repetitivas, un corpus acotado y una dirección accesible. Es el candidato con mejor relación entre valor y riesgo. Si funciona, el piloto es replicable.

**«¿Qué pasa con la propiedad intelectual y la autoría?»**
El TFG es del estudiante y la dirección académica es la que corresponde. El departamento recibe el informe y puede usar los resultados; la autoría y la publicación se acuerdan por escrito antes de empezar.

**«¿Y si el estudiantado usa el asistente para copiar?»**
El alcance excluye exámenes y trabajos evaluables. El asistente responde sobre información administrativa, no resuelve ejercicios ni redacta trabajos.

---

## 12. Guion de 3 minutos

> **[0:00–0:20] El gancho**
> «Cada curso, la secretaría responde cientos de veces las mismas preguntas. La información está publicada, pero el estudiantado no la encuentra porque pregunta con sus palabras, no con las de la web.»

> **[0:20–0:50] Qué hemos hecho**
> «He construido un asistente que responde sobre información pública y cita siempre la fuente. Si no tiene evidencia, se calla y deriva. No inventa. Está desplegado, tiene 59 pruebas automatizadas y un sistema de evaluación con 30 preguntas y 12 paráfrasis en español, gallego e inglés.»

> **[0:50–1:30] La evidencia**
> «Con búsqueda por palabras, solo 3 de cada 10 paráfrasis encontraban el documento correcto. Con búsqueda híbrida, 10 de cada 10. En el set principal, todas las métricas de calidad están a 1,000, incluidas la abstención y la validez de las citas. El coste de indexar todo el corpus fue de cuatro diezmilésimas de dólar.»

> **[1:30–2:10] La pregunta abierta**
> «Lo que no puedo medir yo es el uso real. Mis preguntas las escribí yo. Necesito 8 semanas en la web del departamento para ver qué pregunta la gente de verdad, qué no encuentra y si el asistente reduce trabajo o lo aumenta.»

> **[2:10–2:40] La petición**
> «No pido presupuesto ni cambiar la web. Pido un botón, una página y ocho semanas. El coste máximo es de 15 euros al mes, se puede apagar en un minuto y el departamento solo tiene que aportar unas cuatro horas. A cambio, recibe un informe con datos y una recomendación clara.»

> **[2:40–3:00] El cierre**
> «Si los datos dicen que no aporta valor, lo retiramos y el TFG documenta por qué. Si dicen que sí, el departamento tendrá una herramienta probada y el estudiantado, una forma más rápida de resolver sus dudas. ¿Puedo contar con su autorización para el piloto?»

---

## 13. Qué necesito del director (la petición concreta)

1. **Autorización** para publicar el asistente en la web del departamento durante 8 semanas.
2. **Una persona de contacto** del departamento para revisar contenidos y recibir el panel semanal (≈4 horas en total).
3. **Presentación al DPO** o al servicio jurídico para validar el modo de tratamiento (A o B).
4. **Un espacio en la web**: un botón flotante y una página `/asistente`, o un enlace en la sección de atención al estudiante.

**Lo que no se pide**: presupuesto, personal, cambio de proveedor, acceso a datos personales ni modificación de la web existente.

**Fecha de inicio propuesta**: la primera semana lectiva del segundo cuatrimestre, o la que acuerde el departamento.

---

## 14. Plan B (si la respuesta es no)

El TFG no se bloquea. Alternativas, en orden de preferencia:

1. **Piloto controlado con 20 estudiantes** en una sesión de 1 hora, con consentimiento y sin publicación web. Genera datos de usabilidad y saturación, aunque no de uso sostenido.
2. **Piloto interno con el personal** del departamento como usuarios, con preguntas reales de su día a día.
3. **Evaluación con consultas reales anonimizadas** de un buzón o formulario existente, si el departamento puede cederlas sin datos personales.
4. **Demo pública con analítica agregada** y un informe de limitaciones, reconociendo que no sustituye a un piloto.

En cualquiera de los casos, el TFG entrega: sistema, evaluación reproducible, informe de resultados y una discusión honesta de lo que no se pudo medir.

---

## Anexo A. One-pager imprimible

```
┌──────────────────────────────────────────────────────────────────┐
│  PILOTO: ASISTENTE ACADÉMICO EN LA WEB DEL DEPARTAMENTO          │
│  8 semanas · sin coste para el departamento · reversible         │
├──────────────────────────────────────────────────────────────────┤
│  QUÉ ES                                                          │
│  Un asistente que responde dudas sobre información pública       │
│  (matrícula, becas, calendario, movilidad, servicios) citando    │
│  siempre la fuente oficial. Si no tiene evidencia, se abstiene.  │
│                                                                  │
│  POR QUÉ                                                         │
│  Las consultas repetitivas consumen tiempo del personal y el     │
│  estudiantado no encuentra la información con sus palabras.      │
│                                                                  │
│  EVIDENCIA                                                       │
│  · 59 pruebas automatizadas en verde                             │
│  · 30 preguntas de evaluación: 1,000 en abstención y citas       │
│  · Paráfrasis: recall@5 0,333 → 1,000 con búsqueda híbrida      │
│  · Coste de indexar el corpus: 0,0004 $                          │
│                                                                  │
│  QUÉ SE PIDE                                                     │
│  · Autorización para 8 semanas                                   │
│  · Un botón y una página /asistente                              │
│  · Una persona de contacto (≈4 horas)                            │
│                                                                  │
│  QUÉ SE OBTIENE                                                  │
│  · Datos reales de uso y satisfacción                            │
│  · Informe con recomendación go/no-go                            │
│  · Mejora medible del servicio, sin sustituir canales            │
│                                                                  │
│  RIESGO CONTROLADO                                               │
│  Sin datos personales · retención 30 días · modo autoalojado     │
│  disponible · interruptor de apagado en menos de 1 minuto        │
│                                                                  │
│  COSTE: < 15 €/mes (0 € autoalojado)                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Anexo B. Checklist para la reunión

Antes:

- [ ] Confirmar la duración y el formato de la reunión.
- [ ] Llevar el one-pager impreso y la demo abierta en el portátil.
- [ ] Tener preparados 3 ejemplos: una pregunta respondible, una paráfrasis y una abstención.
- [ ] Revisar la última versión del informe de evaluación.

Durante:

- [ ] Empezar por el problema, no por la tecnología.
- [ ] Mostrar una respuesta con cita y una abstención; son los dos extremos los que generan confianza.
- [ ] Decir el coste y el esfuerzo del departamento en la primera mitad.
- [ ] Pedir una decisión concreta: autorización + persona de contacto.
- [ ] Acordar fecha de inicio y canal de seguimiento.

Después:

- [ ] Enviar el one-pager y el enlace a la demo en 24 horas.
- [ ] Confirmar por escrito el alcance, la duración y los criterios de éxito.
- [ ] Pedir el contacto del DPO si aún no se tiene.
- [ ] Agendar la reunión de arranque.

---

## Anexo C. Glosario mínimo

- **RAG**: generación aumentada por recuperación; el modelo responde a partir de documentos recuperados, no solo de su memoria.
- **BM25**: algoritmo clásico de búsqueda por coincidencia de términos.
- **Embedding**: representación numérica de un texto que permite medir similitud semántica.
- **pgvector**: extensión de PostgreSQL para almacenar y buscar vectores.
- **HNSW**: índice aproximado que acelera la búsqueda de vecinos más cercanos.
- **RRF**: fusión por rangos recíprocos; combina dos rankings sin calibrar sus escalas.
- **Abstención**: decisión de no responder cuando no hay evidencia suficiente.
- **Faithfulness**: proporción de afirmaciones de la respuesta que se pueden verificar en el contexto recuperado.
- **DPA**: contrato de encargado del tratamiento.
- **DPO**: delegado de protección de datos.
