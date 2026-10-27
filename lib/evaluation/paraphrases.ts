/**
 * Set de paráfrasis para medir el valor real de la búsqueda semántica.
 *
 * No sustituye al set de 30 preguntas (que mide el sistema completo), sino que
 * aísla el retrieval: consultas coloquiales, en gallego o en inglés cuyos
 * términos no coinciden con los del documento. BM25 suele fallar aquí; un
 * embedding multilingüe sí encuentra el documento.
 */
export type ParaphraseQuestion = {
  id: string;
  question: string;
  locale: "es" | "gl" | "en";
  documents: string[];
  rationale: string;
};

export const PARAPHRASE_QUESTIONS: ParaphraseQuestion[] = [
  {
    id: "papeles-curso",
    question: "¿Qué papeles tengo que llevar para empezar el curso en una titulación?",
    locale: "es",
    documents: ["uvigo-matricula-grado", "uvigo-matricula"],
    rationale: "Evita la palabra «matrícula» y usa «papeles».",
  },
  {
    id: "coste-estudios",
    question: "Mi familia no puede asumir el coste de los estudios, ¿qué ayudas hay?",
    locale: "es",
    documents: ["uvigo-becas"],
    rationale: "Habla de coste y ayudas sin decir «beca».",
  },
  {
    id: "carrera-otro-pais",
    question: "Quiero cursar una parte de la carrera en otro país, ¿qué opciones tengo?",
    locale: "es",
    documents: ["uvigo-movilidad"],
    rationale: "«Cursar en otro país» en lugar de «movilidad internacional».",
  },
  {
    id: "sacar-libros",
    question: "¿Dónde puedo sacar libros en préstamo?",
    locale: "es",
    documents: ["uvigo-biblioteca"],
    rationale: "No menciona la biblioteca ni el préstamo universitario.",
  },
  {
    id: "portatil-wifi",
    question: "¿A quién aviso si mi portátil no se conecta a la red del campus?",
    locale: "es",
    documents: ["uvigo-tic"],
    rationale: "Describe el problema sin decir «servicios informáticos».",
  },
  {
    id: "orientacion",
    question: "¿Hay algún servicio donde me orienten sobre qué estudiar?",
    locale: "es",
    documents: ["uvigo-asesoramiento"],
    rationale: "Paráfrasis de «te asesoramos».",
  },
  {
    id: "axuda-economica",
    question: "Onde podo pedir axuda económica para pagar a matrícula?",
    locale: "gl",
    documents: ["uvigo-becas", "uvigo-matricula"],
    rationale: "Gallego: «axuda» no coincide con «ayuda».",
  },
  {
    id: "praza-mestrado",
    question: "Como consigo unha praza nun mestrado?",
    locale: "gl",
    documents: ["uvigo-matricula-master"],
    rationale: "Gallego: «mestrado» no coincide con «máster».",
  },
  {
    id: "register-degree",
    question: "How do I register for a bachelor's degree?",
    locale: "en",
    documents: ["uvigo-matricula-grado", "uvigo-matricula"],
    rationale: "Inglés: el corpus está en español/gallego.",
  },
  {
    id: "borrow-books",
    question: "Where can I borrow books?",
    locale: "en",
    documents: ["uvigo-biblioteca"],
    rationale: "Inglés sin términos del título.",
  },
  {
    id: "financial-aid",
    question: "I need financial aid to pay my tuition",
    locale: "en",
    documents: ["uvigo-becas"],
    rationale: "Inglés: «tuition» y «financial aid» no aparecen en el corpus.",
  },
  {
    id: "laptop-wifi",
    question: "Who should I contact if my laptop cannot connect to the campus Wi-Fi?",
    locale: "en",
    documents: ["uvigo-tic"],
    rationale: "Inglés: problema descrito sin vocabulario administrativo.",
  },
];
