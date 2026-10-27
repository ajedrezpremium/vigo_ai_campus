import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  estimateEmbeddingTokens,
  getEmbeddingsConfig,
  isEmbeddingsConfigured,
  toVectorLiteral,
} from "../lib/embeddings";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key]);
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("la configuración por defecto usa 1536 dimensiones y OpenRouter", () => {
  withEnv(
    {
      EMBEDDINGS_MODEL: undefined,
      EMBEDDINGS_DIMENSIONS: undefined,
      EMBEDDINGS_BATCH_SIZE: undefined,
      EMBEDDINGS_DISABLED: undefined,
      EMBEDDINGS_API_KEY: undefined,
      LLM_API_KEY: undefined,
      OPENROUTER_API_KEY: undefined,
      EMBEDDINGS_BASE_URL: undefined,
    },
    () => {
      const config = getEmbeddingsConfig();
      assert.equal(config.model, DEFAULT_EMBEDDING_MODEL);
      assert.equal(config.dimensions, DEFAULT_EMBEDDING_DIMENSIONS);
      assert.equal(config.batchSize, 16);
      assert.equal(config.endpoint, "https://openrouter.ai/api/v1/embeddings");
      assert.equal(isEmbeddingsConfigured(), false);
    },
  );
});

test("la clave de embeddings cae a LLM_API_KEY y se puede desactivar", () => {
  withEnv({ EMBEDDINGS_API_KEY: undefined, LLM_API_KEY: "sk-prueba", EMBEDDINGS_DISABLED: undefined }, () => {
    assert.equal(getEmbeddingsConfig().apiKey, "sk-prueba");
    assert.equal(isEmbeddingsConfigured(), true);
  });

  withEnv({ EMBEDDINGS_DISABLED: "true" }, () => {
    assert.equal(isEmbeddingsConfigured(), false);
  });
});

test("el lote se acota entre 1 y 64", () => {
  withEnv({ EMBEDDINGS_BATCH_SIZE: "500" }, () => assert.equal(getEmbeddingsConfig().batchSize, 64));
  withEnv({ EMBEDDINGS_BATCH_SIZE: "0" }, () => assert.equal(getEmbeddingsConfig().batchSize, 1));
});

test("toVectorLiteral genera el formato que acepta pgvector", () => {
  assert.equal(toVectorLiteral([0.1, 2, -3]), "[0.10000000,2.00000000,-3.00000000]");
  assert.equal(toVectorLiteral([Number.NaN]), "[0.00000000]");
});

test("la estimación de tokens es conservadora y nunca cero con texto", () => {
  assert.equal(estimateEmbeddingTokens([]), 0);
  assert.equal(estimateEmbeddingTokens(["1234"]), 1);
  assert.equal(estimateEmbeddingTokens(["12345"]), 2);
});
