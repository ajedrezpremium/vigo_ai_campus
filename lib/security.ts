/**
 * Defensas de entrada para el chat.
 *
 * No sustituyen a un WAF ni a un clasificador dedicado: son una primera capa
 * determinista, testeable y barata. El contexto recuperado se trata siempre
 * como datos no confiables, nunca como instrucciones.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const INPUT_LIMITS = {
  maxChars: 2000,
  maxLines: 40,
  maxUrls: 5,
} as const;

const INJECTION_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "ignore-instructions", re: /\b(ignora|ignore|olvida|forget|disregard)\b.{0,40}\b(instrucciones|instructions|prompt|reglas|rules)\b/i },
  { id: "system-prompt", re: /\b(system prompt|prompt del sistema|mensaje del sistema|developer message)\b/i },
  { id: "reveal-prompt", re: /\b(revela|reveal|muestra|show|imprime|print|filtra|leak)\b.{0,30}\b(prompt|instrucciones|instructions|secret|secreto|api key|clave)\b/i },
  { id: "role-override", re: /\b(act[uú]a como|act as|you are now|ahora eres|jailbreak|dan mode|developer mode|modo desarrollador)\b/i },
  { id: "policy-bypass", re: /\b(bypass|salt[aá]te|elude|disable|desactiva)\b.{0,30}\b(seguridad|security|filtro|filter|restricci[oó]n|policy|pol[ií]tica)\b/i },
  { id: "prompt-exfiltration", re: /\b(repite|repeat|recita)\b.{0,25}\b(todo|all)\b.{0,25}\b(texto|text|anterior|above)\b/i },
  { id: "sql-injection", re: /\b(union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set)\b/i },
  { id: "script-injection", re: /<\s*script\b|javascript\s*:|on\w+\s*=\s*["']/i },
  { id: "encoded-payload", re: /\b(base64|rot13|hex encoded|payload codificado)\b/i },
];

const SUSPICIOUS_URL = /\b(?:https?:\/\/)(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)\b/i;

export type SecurityCheck = {
  ok: boolean;
  blocked: boolean;
  reasons: string[];
  sanitized: string;
  truncated: boolean;
};

export function sanitizeUserInput(input: string): { text: string; truncated: boolean } {
  const normalized = input
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = normalized.split("\n").slice(0, INPUT_LIMITS.maxLines);
  let text = lines.join("\n");
  const truncated = text.length > INPUT_LIMITS.maxChars || normalized.split("\n").length > INPUT_LIMITS.maxLines;
  if (text.length > INPUT_LIMITS.maxChars) text = text.slice(0, INPUT_LIMITS.maxChars).trim();
  return { text, truncated };
}

export function detectPromptInjection(input: string): string[] {
  const reasons: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.re.test(input)) reasons.push(pattern.id);
  }
  const urls = input.match(/https?:\/\/[^\s]+/g) ?? [];
  if (urls.length > INPUT_LIMITS.maxUrls) reasons.push("too-many-urls");
  if (SUSPICIOUS_URL.test(input)) reasons.push("private-network-url");
  // Intentos de cerrar el bloque de contexto y hablar como sistema.
  if (/<\/?(fuente|contexto|system|assistant)[^>]*>/i.test(input)) reasons.push("context-tag-injection");
  return [...new Set(reasons)];
}

export function inspectUserInput(input: string): SecurityCheck {
  const { text, truncated } = sanitizeUserInput(input);
  const reasons = detectPromptInjection(text);
  return {
    ok: reasons.length === 0 && text.length > 0,
    blocked: reasons.length > 0,
    reasons,
    sanitized: text,
    truncated,
  };
}

/** Envuelve texto recuperado para que el modelo lo trate como datos, no órdenes. */
export function wrapUntrustedContext(text: string): string {
  return text
    .replace(/<\/?fuente[^>]*>/gi, " ")
    .replace(/<\/?contexto[^>]*>/gi, " ")
    .replace(/\u0000/g, "");
}

/** Solo se permiten enlaces http(s) públicos en citas y webhooks. */
export function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (["localhost", "0.0.0.0", "127.0.0.1", "::1"].includes(host)) return false;
    if (/^(10|127)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function verifyHmacSignature(payload: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
    const received = signature.replace(/^sha256=/, "").trim().toLowerCase();
    if (expected.length !== received.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}
