import { tokenize, type RetrievedChunk } from "@/lib/retrieval";

type ComposeInput = {
  query: string;
  chunks: RetrievedChunk[];
  agent: string;
  locale: "es" | "gl" | "en";
  reason: "quota" | "unavailable" | "no_evidence";
  quotaResetAt?: string;
};

const LABELS = {
  es: {
    summary: "## Resumen",
    key: "## Puntos clave",
    steps: "## Pasos siguientes",
    sources: "## Fuentes consultadas",
    limitations: "## Limitaciones",
    noEvidence:
      "No hay evidencia suficiente en las fuentes disponibles para responder con seguridad a esta consulta.",
    official: "Oficial",
    demo: "Demo no oficial",
    verify: "Verifica siempre el dato en la fuente oficial antes de tomar una decisión académica.",
    ask: "Si tu caso es particular, solicita derivación a la secretaría o al servicio responsable.",
    demoWarning: "Las fuentes disponibles son de demostración y no oficiales.",
  },
  gl: {
    summary: "## Resumo",
    key: "## Puntos clave",
    steps: "## Pasos seguintes",
    sources: "## Fontes consultadas",
    limitations: "## Limitacións",
    noEvidence:
      "Non hai evidencia suficiente nas fontes dispoñibles para responder con seguridade a esta consulta.",
    official: "Oficial",
    demo: "Demo non oficial",
    verify: "Verifica sempre o dato na fonte oficial antes de tomar unha decisión académica.",
    ask: "Se o teu caso é particular, solicita derivación á secretaría ou ao servizo responsable.",
    demoWarning: "As fontes dispoñibles son de demostración e non oficiais.",
  },
  en: {
    summary: "## Summary",
    key: "## Key points",
    steps: "## Next steps",
    sources: "## Sources",
    limitations: "## Limitations",
    noEvidence:
      "There is not enough evidence in the available sources to answer this question reliably.",
    official: "Official",
    demo: "Unofficial demo",
    verify: "Always verify the data on the official source before making an academic decision.",
    ask: "If your case is specific, request a referral to the registry or the responsible service.",
    demoWarning: "The available sources are demo sources and are not official.",
  },
} as const;

function tokens(text: string) {
  return new Set(tokenize(text));
}

function fingerprint(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanSentence(value: string) {
  return value
    .replace(/^[\s\-•·]+/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\.\.\.$/, "…")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function sentenceScore(sentence: string, queryTokens: Set<string>, official: boolean) {
  const sTokens = tokens(sentence);
  let overlap = 0;
  for (const token of queryTokens) if (sTokens.has(token)) overlap += 1;
  const lengthScore = sentence.length >= 90 && sentence.length <= 320 ? 1.5 : 0;
  const noisePenalty = /^(campus|modalidad|a ~ z|inicio|buscar)$/i.test(sentence) ? 6 : 0;
  return overlap * 2.2 + lengthScore + (official ? 0.8 : 0) - noisePenalty;
}

function splitCandidates(chunks: RetrievedChunk[], query: string) {
  const seen = new Set<string>();
  const candidates: { text: string; score: number; chunk: RetrievedChunk; order: number }[] = [];
  const queryTokens = tokens(query);
  let order = 0;

  for (const chunk of chunks) {
    const sentences = chunk.snippet
      .split(/\n+/)
      .flatMap((part) => part.split(/(?<=[.!?])\s+/))
      .map(cleanSentence)
      .filter((s) => s.length >= 35 && s.length <= 420);
    for (const sentence of sentences) {
      const key = sentence
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .slice(0, 110);
      if (seen.has(key)) continue;
      seen.add(key);
      order += 1;
      const meta = /^(a continuaci[oó]n|en esta secci[oó]n|te ofrecemos|en el men[uú]|m[aá]s informaci[oó]n|consulta |accede a)/i.test(sentence);
      if (meta) continue;
      const relevance = Math.min(chunk.score, 18) * 0.28;
      candidates.push({
        text: sentence,
        score: sentenceScore(sentence, queryTokens, chunk.sourceType === "official") + relevance,
        chunk,
        order,
      });
    }
  }
  return candidates.sort((a, b) => b.score - a.score);
}

function stepsFor(agent: string, locale: "es" | "gl" | "en", hasOfficial: boolean) {
  if (locale === "en") {
    const common = [
      hasOfficial ? "Open the official source linked below to confirm dates and requirements." : "Ask for a referral so a service can confirm the details.",
      "Have your student file or procedure identifier ready before contacting the service.",
      "Do not submit an official application from this demo: it only provides guidance.",
    ];
    if (agent === "admin-agent") return [common[0], "Check the procedure and required documents with the responsible service.", common[2]];
    if (agent === "support-agent") return ["Request a referral with a short summary of your case.", common[1], common[2]];
    return common;
  }

  if (locale === "gl") {
    const common = [
      hasOfficial ? "Abre a fonte oficial enlazada para confirmar prazos e requisitos." : "Solicita derivación para que un servizo confirme os detalles.",
      "Ten á man o teu expediente ou identificador do trámite antes de contactar.",
      "Non presentes solicitudes oficiais desde esta demo: só ofrece orientación.",
    ];
    if (agent === "admin-agent") return [common[0], "Consulta o procedemento e a documentación co servizo responsable.", common[2]];
    if (agent === "support-agent") return ["Solicita derivación cun resumo breve do teu caso.", common[1], common[2]];
    return common;
  }

  const common = [
    hasOfficial
      ? "Abre la fuente oficial enlazada para confirmar plazos y requisitos."
      : "Solicita derivación para que un servicio confirme los detalles.",
    "Ten a mano tu expediente o identificador del trámite antes de contactar.",
    "No presentes solicitudes oficiales desde esta demo: solo ofrece orientación.",
  ];
  if (agent === "admin-agent") {
    return [common[0], "Consulta el procedimiento y la documentación con el servicio responsable.", common[2]];
  }
  if (agent === "support-agent") {
    return ["Solicita derivación con un resumen breve de tu caso.", common[1], common[2]];
  }
  return common;
}

function noticeFor(reason: ComposeInput["reason"], locale: "es" | "gl" | "en", resetAt?: string) {
  const reset = resetAt ? new Date(resetAt) : null;
  const resetText = reset
    ? reset.toLocaleString(locale === "en" ? "en-GB" : locale === "gl" ? "gl-ES" : "es-ES", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      })
    : null;

  if (locale === "en") {
    if (reason === "quota") {
      return `OpenRouter's free-model daily quota is exhausted${resetText ? ` until ${resetText} UTC` : ""}. This answer was composed from official sources; the generative model will resume automatically.`;
    }
    if (reason === "unavailable") {
      return "The generative model is temporarily unavailable. This answer was composed from the retrieved official sources.";
    }
    return "No official source covers this question with enough confidence.";
  }
  if (locale === "gl") {
    if (reason === "quota") {
      return `A cota diaria de modelos gratuítos de OpenRouter está esgotada${resetText ? ` ata ${resetText} UTC` : ""}. Esta resposta compúxose con fontes oficiais; o modelo xenerativo retomará automaticamente.`;
    }
    if (reason === "unavailable") {
      return "O modelo xenerativo non está dispoñible agora. Esta resposta compúxose coas fontes oficiais recuperadas.";
    }
    return "Ningunha fonte oficial cobre esta consulta con suficiente confianza.";
  }
  if (reason === "quota") {
    return `La cuota diaria de modelos gratuitos de OpenRouter está agotada${resetText ? ` hasta ${resetText} UTC` : ""}. Esta respuesta se ha compuesto con fuentes oficiales; el modelo generativo se reactivará automáticamente.`;
  }
  if (reason === "unavailable") {
    return "El modelo generativo no está disponible ahora. Esta respuesta se ha compuesto con las fuentes oficiales recuperadas.";
  }
  return "Ninguna fuente oficial cubre esta consulta con suficiente confianza.";
}

export function composeGroundedAnswer(input: ComposeInput) {
  const labels = LABELS[input.locale];
  const officialChunks = input.chunks.filter((c) => c.sourceType === "official");
  const usableChunks = officialChunks.length ? officialChunks : input.chunks;
  const hasOfficial = officialChunks.length > 0;
  const candidates = splitCandidates(usableChunks, input.query);

  if (!candidates.length) {
    const answer = [
      labels.summary,
      labels.noEvidence,
      labels.steps,
      `- ${labels.ask}`,
      labels.limitations,
      labels.verify,
    ].join("\n");
    return { answer, notice: noticeFor("no_evidence", input.locale), usedOfficial: hasOfficial };
  }

  const primaryChunk = usableChunks[0];
  const primaryId = primaryChunk?.documentId;
  const primary = candidates.filter((c) => c.chunk.documentId === primaryId).sort((a, b) => a.order - b.order);
  const secondary = candidates.filter((c) => c.chunk.documentId !== primaryId);

  // Si el documento principal es una página de trámite con frases muy cortas,
  // sus propios fragmentos siguen siendo la fuente preferente.
  if (!primary.length && primaryChunk) {
    const fragments = primaryChunk.snippet
      .split(/\n+/)
      .map(cleanSentence)
      .filter((s) => s.length >= 25)
      .slice(0, 6)
      .map((text) => ({ text, score: 100, chunk: primaryChunk, order: primary.length }));
    primary.push(...fragments);
  }

  const introSentences = primaryChunk
    ? primaryChunk.documentIntro
        .split(/\n+/)
        .flatMap((part) => part.split(/(?<=[.!?])\s+/))
        .map(cleanSentence)
        .filter((s) => s.length >= 35 && s.length <= 420)
        .slice(0, 2)
    : [];
  const summarySentences = (introSentences.length ? introSentences : (primary.length ? primary : candidates).slice(0, 2).map((c) => c.text));
  const keyCandidates = [...(primary.length ? primary.slice(2) : []), ...secondary].slice(0, 4);
  const primaryOnly = primary.slice(2, 6);
  const finalKeyCandidates = primaryOnly.length >= 2 ? primaryOnly : keyCandidates;
  const summaryKeys = new Set(summarySentences.map(fingerprint));
  const keySource = (primaryChunk?.documentIntro ?? "")
    .split(/\n+/)
    .flatMap((part) => part.split(/(?<=[.!?])\s+/))
    .map(cleanSentence)
    .filter((s) => s.length >= 45 && s.length <= 420)
    .filter((s) => !summaryKeys.has(fingerprint(s)))
    .filter((s) => !s.endsWith(":"))
    .filter((s) => /[.!?…]$/.test(s))
    .slice(0, 4);
  const keyPoints = keySource.length
    ? keySource.map((text) => `- ${text}`)
    : finalKeyCandidates.map((c) => `- ${c.text}`);

  const steps = stepsFor(input.agent, input.locale, hasOfficial);
  const uniqueSources = usableChunks.filter((chunk, index, list) => list.findIndex((c) => c.documentId === chunk.documentId) === index).slice(0, 3);
  const sources = uniqueSources.map((chunk, index) => {
    const tag = chunk.sourceType === "official" ? labels.official : labels.demo;
    return `${index + 1}. [${chunk.title}](${chunk.sourceUrl}) — ${tag} · ${chunk.organization}`;
  });

  const answer = [
    labels.summary,
    summarySentences.join(" "),
    labels.key,
    keyPoints.join("\n"),
    labels.steps,
    steps.map((s) => `- ${s}`).join("\n"),
    labels.sources,
    sources.join("\n"),
    labels.limitations,
    `${labels.verify}${hasOfficial ? "" : ` ${labels.demoWarning}`}`.trim(),
  ]
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n");

  return {
    answer,
    notice: noticeFor(input.reason, input.locale, input.quotaResetAt),
    usedOfficial: hasOfficial,
  };
}
