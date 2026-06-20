import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const PRICING = {
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-haiku-4-5':          { input: 0.80,  output: 4.00  },
  'claude-opus-4-8':           { input: 15.00, output: 75.00 },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60  },
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
};

function calcCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] ?? { input: 3.00, output: 15.00 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

function monthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Track an AI call.
 * @param {{ tenant: string, product: 'kai'|'aria', feature: string, model: string, inputTokens: number, outputTokens: number }} opts
 */
export async function trackUsage({ tenant, product, feature, model, inputTokens, outputTokens }) {
  const cost = calcCost(model, inputTokens, outputTokens);
  const month = monthKey();

  const keys = [
    `ai_usage:${month}:total`,
    `ai_usage:${month}:${product}`,
    `ai_usage:${month}:${product}:${tenant}`,
    `ai_usage:${month}:${product}:${tenant}:${feature}`,
  ];

  const event = JSON.stringify({
    tenant, product, feature, model,
    inputTokens, outputTokens, cost,
    createdAt: new Date().toISOString(),
  });

  const pipeline = kv.pipeline();
  for (const key of keys) {
    pipeline.hincrbyfloat(key, 'cost', cost);
    pipeline.hincrby(key, 'input_tokens', inputTokens);
    pipeline.hincrby(key, 'output_tokens', outputTokens);
    pipeline.hincrby(key, 'calls', 1);
  }
  pipeline.lpush(`ai_usage_events:${tenant}`, event);
  pipeline.ltrim(`ai_usage_events:${tenant}`, 0, 199);

  await pipeline.exec().catch(() => null);
}
