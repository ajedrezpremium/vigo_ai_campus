import { classifyIntent } from "@/lib/agents";
import { composeGroundedAnswer } from "@/lib/answer-composer";
import { evidenceCoverage, shouldAbstain } from "@/lib/evidence";
import { callLLM } from "@/lib/llm";
import { buildChatSystemPrompt, buildChatUserPrompt, CHAT_PROMPT_VERSION } from "@/lib/prompts";
import { retrieve, retrievalConfidence, tokenize, topScore } from "@/lib/retrieval";
import { retrieveAsync } from "@/lib/retrieval-hybrid";
import { EVAL_QUESTIONS, type EvalQuestion } from "./dataset";

const OFFICIAL_HOST = "https://www.uvigo.gal/";

const THRESHOLDS = {
  retrievalRecall: 0.85,
  answerCoverage: 0.85,
  abstentionAccuracy: 0.9,
  citationValidity: 0.95,
  expectedCitationRate: 0.8,
  faithfulness: 0.9,
  latencyP95Ms: 4000,
} as const;

export type EvalItem = {
  id: string;
  question: string;
  expectation: EvalQuestion["expectation"];
  tags: string[];
  retrieved: string[];
  confidence: number;
  score: number;
  coverage: number;
  abstained: boolean;
  retrievalHit: boolean;
  abstentionCorrect: boolean | null;
  citationsValid: boolean;
  expectedCited: boolean | null;
  faithfulness: number | null;
  lexicalGrounding: number | null;
  model: string;
  latencyMs: number;
  answerChars: number;
  answerPreview: string;
  error?: string;
};

export type EvalSummary = {
  promptVersion: string;
  generatedAt: string;
  mode: "composer" | "llm";
  retrieval: "lexical" | "hybrid";
  partial: boolean;
  questions: number;
  answerable: number;
  unanswerable: number;
  retrievalRecall: number;
  answerCoverage: number;
  abstentionAccuracy: number;
  citationValidity: number;
  expectedCitationRate: number;
  faithfulness: number;
  lexicalGrounding: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMaxMs: number;
  thresholds: typeof THRESHOLDS;
  passed: boolean;
};

export type EvalReport = { summary: EvalSummary; items: EvalItem[] };

function extractContentText(answer: string) {
  const wanted = /^(resumen|summary|resumo|puntos clave|key points|pontos clave)$/i;
  const paragraphs: string[] = [];
  let collecting = false;

  for (const rawLine of answer.split("\n")) {
    const line = rawLine.trim();
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    if (heading) {
      collecting = wanted.test(heading[1].trim());
      continue;
    }
    if (!collecting || !line) continue;
    paragraphs.push(line.replace(/^[-*]\s+/, ""));
  }

  return paragraphs;
}

/**
 * Solapamiento léxico con el contexto. Es una señal barata, pero penaliza las
 * paráfrasis correctas: se guarda como diagnóstico, no como criterio de paso.
 */
export function lexicalGrounding(answer: string, chunks: ReturnType<typeof retrieve>) {
  const context = new Set<string>();
  for (const chunk of chunks) {
    for (const token of tokenize(`${chunk.title} ${chunk.documentIntro} ${chunk.snippet}`)) {
      context.add(token);
    }
  }

  let sentences = 0;
  let grounded = 0;
  for (const paragraph of extractContentText(answer)) {
    for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
      const terms = [...new Set(tokenize(sentence))].filter((term) => term.length >= 4);
      if (!terms.length) continue;
      sentences += 1;
      const hits = terms.filter((term) => context.has(term)).length;
      if (hits / terms.length >= 0.8) grounded += 1;
    }
  }

  return sentences ? grounded / sentences : 0;
}

const DATE_PATTERN =
  /\b(?:19|20)\d{2}\b|\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|xaneiro|febreiro|marzo|maio|xuño|xullo|setembro|outubro|novembro|decembro|january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi;

/**
 * Faithfulness operativa: una respuesta es fiel si no introduce fechas,
 * enlaces ni números de fuente que no estén en el contexto recuperado, y si
 * al menos incluye una cita o un enlace verificable. No pretende sustituir a
 * un juez semántico, pero detecta las alucinaciones que más importan aquí.
 */
export function answerFaithfulness(answer: string, chunks: ReturnType<typeof retrieve>) {
  const context = chunks
    .map((chunk) => `${chunk.title}\n${chunk.documentIntro}\n${chunk.snippet}\n${chunk.sourceUrl}`)
    .join("\n")
    .toLowerCase();
  const normalized = answer.toLowerCase();

  const urls = extractUrls(answer);
  const urlsOk = urls.every((url) => url.startsWith(OFFICIAL_HOST) && context.includes(url.toLowerCase()));

  const dates = answer.match(DATE_PATTERN) ?? [];
  const datesOk = dates.every((date) => context.includes(date.toLowerCase()));

  const citations = [...normalized.matchAll(/\[fuente\s+(\d+)\]/g)].map((match) => Number(match[1]));
  const citationsOk = citations.every((index) => index >= 1 && index <= chunks.length);

  const hasSupport = urls.length > 0 || citations.length > 0;
  const checks = [hasSupport, urlsOk, datesOk, citationsOk];
  return checks.filter(Boolean).length / checks.length;
}

export function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s)]+/g) ?? [];
}

async function answerQuestion(question: EvalQuestion, useLLM: boolean, useSemantic: boolean) {
  const startedAt = Date.now();
  const chunks = useSemantic
    ? await retrieveAsync(question.question, {
        topK: 5,
        locale: question.locale,
        includeDemo: false,
      })
    : retrieve(question.question, { topK: 5, locale: question.locale, includeDemo: false });
  const confidence = retrievalConfidence(chunks);
  const score = topScore(chunks);
  const coverage = evidenceCoverage(question.question, chunks);
  const abstained = shouldAbstain(question.question, chunks);
  const agent = classifyIntent(question.question);

  let answer = "";
  let model = "composer";
  let error: string | undefined;

  if (abstained) {
    const composed = composeGroundedAnswer({
      query: question.question,
      chunks: [],
      agent,
      locale: question.locale,
      reason: "no_evidence",
    });
    answer = composed.answer;
    model = "grounded-no-evidence";
  } else if (useLLM) {
    try {
      const result = await callLLM({
        system: buildChatSystemPrompt({ locale: question.locale, agent }),
        user: buildChatUserPrompt({ message: question.question, chunks }),
      });
      answer = result.content;
      model = result.model;
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 160) : "error desconocido";
      const composed = composeGroundedAnswer({
        query: question.question,
        chunks,
        agent,
        locale: question.locale,
        reason: "unavailable",
      });
      answer = composed.answer;
      model = "grounded-fallback";
    }
  } else {
    const composed = composeGroundedAnswer({
      query: question.question,
      chunks,
      agent,
      locale: question.locale,
      reason: "quota",
    });
    answer = composed.answer;
    model = "grounded-extractive-v1";
  }

  const urls = extractUrls(answer);
  const citationIndices = [...answer.matchAll(/\[Fuente\s+(\d+)\]/gi)].map((match) => Number(match[1]));
  const citationsValid =
    urls.every((url) => url.startsWith(OFFICIAL_HOST)) &&
    citationIndices.every((index) => index >= 1 && index <= chunks.length) &&
    (urls.length > 0 || citationIndices.length > 0);
  const expectedCited =
    question.expectation === "answer"
      ? question.documents.some((documentId) => {
          const index = chunks.findIndex((candidate) => candidate.documentId === documentId);
          if (index >= 0 && citationIndices.includes(index + 1)) return true;
          const chunk = index >= 0 ? chunks[index] : undefined;
          return chunk ? answer.includes(chunk.sourceUrl) : false;
        })
      : null;

  return {
    chunks,
    confidence,
    score,
    coverage,
    abstained,
    answer,
    model,
    error,
    citationsValid,
    expectedCited,
    latencyMs: Date.now() - startedAt,
  };
}

export async function runEvaluation(options: {
  useLLM?: boolean;
  useSemantic?: boolean;
  limit?: number;
  now?: Date;
} = {}): Promise<EvalReport> {
  const useLLM = options.useLLM ?? false;
  const useSemantic = options.useSemantic ?? false;
  const questions = EVAL_QUESTIONS.slice(0, options.limit ?? EVAL_QUESTIONS.length);
  const items: EvalItem[] = [];

  for (const question of questions) {
    const result = await answerQuestion(question, useLLM, useSemantic);
    const retrieved = result.chunks.map((chunk) => chunk.documentId);
    const retrievalHit =
      question.expectation === "answer" && question.documents.some((documentId) => retrieved.includes(documentId));

    items.push({
      id: question.id,
      question: question.question,
      expectation: question.expectation,
      tags: question.tags,
      retrieved,
      confidence: Math.round(result.confidence * 100) / 100,
      score: Math.round(result.score * 100) / 100,
      coverage: Math.round(result.coverage * 100) / 100,
      abstained: result.abstained,
      retrievalHit,
      abstentionCorrect:
        question.expectation === "abstain" ? result.abstained : result.abstained ? false : null,
      citationsValid: result.citationsValid,
      expectedCited: result.expectedCited,
      faithfulness:
        question.expectation === "answer" && !result.abstained
          ? Math.round(answerFaithfulness(result.answer, result.chunks) * 1000) / 1000
          : null,
      lexicalGrounding:
        question.expectation === "answer" && !result.abstained
          ? Math.round(lexicalGrounding(result.answer, result.chunks) * 1000) / 1000
          : null,
      model: result.model,
      latencyMs: result.latencyMs,
      answerChars: result.answer.length,
      answerPreview: result.answer.slice(0, 500),
      ...(result.error ? { error: result.error } : {}),
    });
  }

  const answerable = items.filter((item) => item.expectation === "answer");
  const unanswerable = items.filter((item) => item.expectation === "abstain");
  const answered = answerable.filter((item) => !item.abstained);
  const validCitations = answered.filter((item) => item.citationsValid);
  const withExpectedCitation = answered.filter((item) => item.expectedCited);
  const grounded = answered.filter((item) => item.faithfulness !== null);

  const latencies = items.map((item) => item.latencyMs).sort((a, b) => a - b);
  const percentile = (p: number) => {
    if (!latencies.length) return 0;
    const index = Math.min(latencies.length - 1, Math.max(0, Math.ceil((p / 100) * latencies.length) - 1));
    return Math.round(latencies[index]);
  };

  const ratio = (value: number, total: number) => (total ? Math.round((value / total) * 1000) / 1000 : 1);
  const summary: EvalSummary = {
    promptVersion: CHAT_PROMPT_VERSION,
    generatedAt: (options.now ?? new Date()).toISOString(),
    mode: useLLM ? "llm" : "composer",
    retrieval: useSemantic ? "hybrid" : "lexical",
    partial: items.length < EVAL_QUESTIONS.length,
    questions: items.length,
    answerable: answerable.length,
    unanswerable: unanswerable.length,
    retrievalRecall: ratio(answerable.filter((item) => item.retrievalHit).length, answerable.length),
    answerCoverage: ratio(answered.length, answerable.length),
    abstentionAccuracy: ratio(
      unanswerable.filter((item) => item.abstentionCorrect).length,
      unanswerable.length,
    ),
    citationValidity: ratio(validCitations.length, answered.length),
    expectedCitationRate: ratio(withExpectedCitation.length, answered.length),
    faithfulness: ratio(
      grounded.reduce((sum, item) => sum + (item.faithfulness ?? 0), 0),
      grounded.length,
    ),
    lexicalGrounding: ratio(
      grounded.reduce((sum, item) => sum + (item.lexicalGrounding ?? 0), 0),
      grounded.length,
    ),
    latencyP50Ms: percentile(50),
    latencyP95Ms: percentile(95),
    latencyMaxMs: latencies.length ? latencies[latencies.length - 1] : 0,
    thresholds: THRESHOLDS,
    passed: false,
  };

  summary.passed =
    summary.retrievalRecall >= THRESHOLDS.retrievalRecall &&
    summary.answerCoverage >= THRESHOLDS.answerCoverage &&
    summary.abstentionAccuracy >= THRESHOLDS.abstentionAccuracy &&
    summary.citationValidity >= THRESHOLDS.citationValidity &&
    summary.expectedCitationRate >= THRESHOLDS.expectedCitationRate &&
    summary.faithfulness >= THRESHOLDS.faithfulness &&
    summary.latencyP95Ms <= THRESHOLDS.latencyP95Ms;

  return { summary, items };
}
