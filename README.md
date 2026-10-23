# VIGO AI CAMPUS — paquete inicial

Este paquete contiene los documentos de arranque para desarrollar una plataforma SaaS de agentes IA para servicios universitarios.

## Archivos
- `MEGAPROMPT_VIGO_AI_CAMPUS.md`: prompt principal para el agente de programación.
- `docs/PROPUESTA_VIGO_AI_CAMPUS.md`: propuesta de producto y estrategia.
- `supabase/migrations/0001_initial_schema.sql`: esquema inicial ilustrativo para revisar antes de producción.
- `.env.example`: variables de entorno de ejemplo sin secretos.

## Uso recomendado
1. Crea un repositorio privado en GitHub.
2. Abre el proyecto en tu IDE de desarrollo.
3. Pega el contenido de `MEGAPROMPT_VIGO_AI_CAMPUS.md` en el agente de programación.
4. Pide que inspeccione primero el repositorio y proponga un plan antes de modificar archivos.
5. Crea un proyecto Supabase de desarrollo y aplica las migraciones solo después de revisarlas.
6. Configura variables de entorno en local y en Vercel.
7. Despliega una demo con datos ficticios y etiqueta claramente que no es un servicio oficial de la Universidade de Vigo.

## Desarrollo local
1. `npm install`
2. Copia `.env.example` a `.env.local` y completa las variables.
3. `npm run dev`
4. Abre `http://localhost:3000`.

## Despliegue
- Vercel: conecta el repositorio y configura las variables de entorno.
- Supabase: aplica `supabase/migrations/0001_initial_schema.sql` y crea un usuario de prueba.

## Importante
El SQL es una base inicial de referencia, no una solución certificada para producción. Requiere revisión técnica, pruebas de seguridad, definición de roles y adaptación al modelo de datos final. No añadas secretos al repositorio. No cargues datos personales reales de estudiantes o empleados en la demo.
