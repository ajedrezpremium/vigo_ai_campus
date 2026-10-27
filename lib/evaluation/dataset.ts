/**
 * Set de evaluación de referencia (30 preguntas).
 *
 * - `answer`: la respuesta debe apoyarse en los documentos indicados.
 * - `abstain`: la demo debe reconocer que no tiene evidencia suficiente.
 *
 * Las preguntas cubren las superficies del corpus oficial (matrícula, becas,
 * calendario, movilidad, biblioteca, servicios y datos institucionales) y
 * varios casos límite de fuera de alcance.
 */
export type EvalExpectation = "answer" | "abstain";

export type EvalQuestion = {
  id: string;
  question: string;
  locale: "es" | "gl" | "en";
  expectation: EvalExpectation;
  /** Documentos del corpus que deberían sostener la respuesta. */
  documents: string[];
  tags: string[];
};

export const EVAL_QUESTIONS: EvalQuestion[] = [
  {
    id: "matricula-grado",
    question: "¿Cómo me matriculo en un grado de la UVigo?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-matricula", "uvigo-matricula-grado"],
    tags: ["matricula"],
  },
  {
    id: "matricula-master",
    question: "¿Cuál es el procedimiento de matrícula de un máster?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-matricula-master"],
    tags: ["matricula"],
  },
  {
    id: "matricula-doctorado",
    question: "¿Cómo me matriculo en un programa de doctorado?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-matricula-doctorado"],
    tags: ["matricula"],
  },
  {
    id: "becas",
    question: "¿Qué becas y ayudas puedo solicitar como estudiante?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-becas"],
    tags: ["becas"],
  },
  {
    id: "calendario",
    question: "¿Dónde consulto el calendario académico?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-calendario", "uvigo-calendario-2026-27-pdf"],
    tags: ["calendario"],
  },
  {
    id: "curso-2026-27",
    question: "¿Cuándo empieza el curso 2026/2027?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-calendario-2026-27-pdf", "uvigo-cronograma-2026-27-pdf", "uvigo-calendario"],
    tags: ["calendario"],
  },
  {
    id: "acceso",
    question: "¿Cómo puedo acceder a la Universidade de Vigo?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-acceder"],
    tags: ["acceso"],
  },
  {
    id: "grados",
    question: "¿Qué estudios de grado ofrece la UVigo?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-grados"],
    tags: ["estudios"],
  },
  {
    id: "historia",
    question: "Historia de la Universidade de Vigo",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-vistazo", "uvigo-conocenos"],
    tags: ["institucional"],
  },
  {
    id: "biblioteca",
    question: "¿Qué servicios ofrece la Biblioteca universitaria?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-biblioteca"],
    tags: ["servicios"],
  },
  {
    id: "movilidad",
    question: "¿Cómo participo en un programa de movilidad internacional?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-movilidad"],
    tags: ["movilidad"],
  },
  {
    id: "tic",
    question: "¿Dónde consulto los servicios informáticos de la UVigo?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-tic"],
    tags: ["servicios"],
  },
  {
    id: "centros",
    question: "¿Qué centros tiene la UVigo?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-centros"],
    tags: ["institucional"],
  },
  {
    id: "campus",
    question: "¿Qué puedo hacer en la vida del campus?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-campus"],
    tags: ["campus"],
  },
  {
    id: "empleabilidad",
    question: "¿Qué servicios de empleabilidad y prácticas hay?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-empleabilidad"],
    tags: ["empleabilidad"],
  },
  {
    id: "normativa",
    question: "¿Dónde está el archivo de normativa académica?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-normativa"],
    tags: ["normativa"],
  },
  {
    id: "gestiones",
    question: "¿Qué gestiones puedo hacer como estudiante?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-gestiones"],
    tags: ["gestiones"],
  },
  {
    id: "perfil-estudiantes",
    question: "¿Dónde están los accesos rápidos para estudiantes?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-perfil-estudiantes"],
    tags: ["gestiones"],
  },
  {
    id: "asesoramiento",
    question: "¿Dónde puedo pedir asesoramiento?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-asesoramiento"],
    tags: ["servicios"],
  },
  {
    id: "conocenos",
    question: "¿Qué datos e historia presenta la UVigo en Conócenos?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-conocenos", "uvigo-vistazo"],
    tags: ["institucional"],
  },
  {
    id: "estudiar",
    question: "¿Por qué estudiar en la Universidade de Vigo?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-estudiar"],
    tags: ["estudios"],
  },
  {
    id: "cronograma",
    question: "¿Qué fechas marca el cronograma del curso 2026/2027?",
    locale: "es",
    expectation: "answer",
    documents: ["uvigo-cronograma-2026-27-pdf", "uvigo-calendario-2026-27-pdf"],
    tags: ["calendario"],
  },
  {
    id: "fuera-piscina",
    question: "¿Cuál es el horario de la piscina municipal de Vigo?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["fuera-de-alcance"],
  },
  {
    id: "fuera-comedor",
    question: "¿Cuánto cuesta el menú del comedor del campus de Ourense?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["fuera-de-alcance"],
  },
  {
    id: "fuera-notas",
    question: "¿Qué notas saqué en la asignatura de Física el curso pasado?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["datos-personales"],
  },
  {
    id: "fuera-santiago",
    question: "¿Cómo solicito una beca en la Universidad de Santiago?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["otra-universidad"],
  },
  {
    id: "fuera-rector",
    question: "¿Cuál es el número de teléfono personal del rector?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["datos-personales"],
  },
  {
    id: "fuera-sergas",
    question: "¿Puedes reservar una cita médica en el SERGAS?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["fuera-de-alcance"],
  },
  {
    id: "fuera-alquiler",
    question: "¿Cuánto cuesta alquilar un piso en Vigo?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["fuera-de-alcance"],
  },
  {
    id: "fuera-wifi",
    question: "¿Qué contraseña tiene el Wi-Fi de la cafetería?",
    locale: "es",
    expectation: "abstain",
    documents: [],
    tags: ["datos-personales"],
  },
];
