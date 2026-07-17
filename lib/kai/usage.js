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

export const FEATURE_LABELS = {
  chat:              'Discovery Chat',
  executive_summary: 'Executive Summary',
  diagnosis:         'Diagnóstico',
  summary:           'Resumen',
  insights:          'Insights',
  transversals:      'Patrones Transversales',
};

function calcCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] ?? { input: 3.00, output: 15.00 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function trackUsage({ tenant, product, feature, model, inputTokens, outputTokens }) {
  const cost = calcCost(model, inputTokens, outputTokens);
  const month = currentMonth();

  const keys = [
    `ai_usage:${month}:total`,
    `ai_usage:${month}:${product}`,
    `ai_usage:${month}:${product}:feature:${feature}`,  // cross-tenant feature aggregate
    `ai_usage:${month}:${product}:${tenant}`,
    `ai_usage:${month}:${product}:${tenant}:${feature}`,
  ];

  const event = JSON.stringify({
    tenant, product, feature, model,
    inputTokens, outputTokens, cost,
    createdAt: new Date().toISOString(),
  });

  const today = new Date().toISOString().slice(0, 10);
  const dayKey = `ai_usage_daily:${tenant}:${today}`;

  const pipeline = kv.pipeline();
  for (const key of keys) {
    pipeline.hincrbyfloat(key, 'cost', cost);
    pipeline.hincrby(key, 'input_tokens', inputTokens);
    pipeline.hincrby(key, 'output_tokens', outputTokens);
    pipeline.hincrby(key, 'calls', 1);
  }
  // Daily aggregate per tenant (permanent — used for spend chart)
  pipeline.hincrbyfloat(dayKey, 'cost', cost);
  pipeline.hincrby(dayKey, 'input_tokens', inputTokens);
  pipeline.hincrby(dayKey, 'output_tokens', outputTokens);
  pipeline.hincrby(dayKey, 'calls', 1);

  pipeline.lpush(`ai_usage_events:${tenant}`, event);
  pipeline.ltrim(`ai_usage_events:${tenant}`, 0, 999);

  await pipeline.exec().catch(() => null);
}

// ── Read functions ─────────────────────────────────────────────────────────

function parseHash(h) {
  if (!h) return { cost: 0, input_tokens: 0, output_tokens: 0, calls: 0 };
  return {
    cost:          parseFloat(h.cost ?? 0),
    input_tokens:  parseInt(h.input_tokens  ?? 0, 10),
    output_tokens: parseInt(h.output_tokens ?? 0, 10),
    calls:         parseInt(h.calls         ?? 0, 10),
  };
}

const PRODUCTS  = ['kai', 'aria'];
const FEATURES  = Object.keys(FEATURE_LABELS);

export async function getMonthlyUsageSummary(month) {
  const pipe = kv.pipeline();
  pipe.hgetall(`ai_usage:${month}:total`);
  for (const p of PRODUCTS) {
    pipe.hgetall(`ai_usage:${month}:${p}`);
    for (const f of FEATURES) {
      pipe.hgetall(`ai_usage:${month}:${p}:feature:${f}`);
    }
  }
  const results = await pipe.exec();

  const total = parseHash(results[0]);
  let idx = 1;
  const byProduct = {};
  const byFeature = [];

  for (const p of PRODUCTS) {
    byProduct[p] = parseHash(results[idx++]);
    for (const f of FEATURES) {
      const h = parseHash(results[idx++]);
      if (h.calls > 0) {
        byFeature.push({ product: p, feature: f, label: FEATURE_LABELS[f], ...h });
      }
    }
  }

  byFeature.sort((a, b) => b.cost - a.cost);
  return { total, byProduct, byFeature };
}

export async function getTenantMonthlyUsage(tenant, month) {
  const pipe = kv.pipeline();
  for (const p of PRODUCTS) {
    pipe.hgetall(`ai_usage:${month}:${p}:${tenant}`);
    for (const f of FEATURES) {
      pipe.hgetall(`ai_usage:${month}:${p}:${tenant}:${f}`);
    }
  }
  const results = await pipe.exec();

  let idx = 0;
  const byProduct = {};
  const byFeature = [];

  for (const p of PRODUCTS) {
    byProduct[p] = parseHash(results[idx++]);
    for (const f of FEATURES) {
      const h = parseHash(results[idx++]);
      if (h.calls > 0) {
        byFeature.push({ product: p, feature: f, label: FEATURE_LABELS[f], ...h });
      }
    }
  }

  byFeature.sort((a, b) => b.cost - a.cost);

  // Aggregate total across products
  const total = {
    cost:          byProduct.kai.cost          + byProduct.aria.cost,
    input_tokens:  byProduct.kai.input_tokens  + byProduct.aria.input_tokens,
    output_tokens: byProduct.kai.output_tokens + byProduct.aria.output_tokens,
    calls:         byProduct.kai.calls         + byProduct.aria.calls,
  };

  return { total, byProduct, byFeature };
}

export async function getAllTenantsMonthlyUsage(tenants, month) {
  // tenants: [{ slug, name }]
  if (!tenants.length) return [];

  const pipe = kv.pipeline();
  for (const t of tenants) {
    for (const p of PRODUCTS) {
      pipe.hgetall(`ai_usage:${month}:${p}:${t.slug}`);
    }
  }
  const results = await pipe.exec();

  let idx = 0;
  return tenants.map((t) => {
    const kai  = parseHash(results[idx++]);
    const aria = parseHash(results[idx++]);
    return {
      slug: t.slug,
      name: t.name,
      cost:          kai.cost          + aria.cost,
      input_tokens:  kai.input_tokens  + aria.input_tokens,
      output_tokens: kai.output_tokens + aria.output_tokens,
      calls:         kai.calls         + aria.calls,
    };
  }).filter((t) => t.calls > 0).sort((a, b) => b.cost - a.cost);
}

export async function getRecentEvents(tenant, limit = 50) {
  const raw = await kv.lrange(`ai_usage_events:${tenant}`, 0, limit - 1);
  return raw
    .map((e) => { try { return typeof e === 'string' ? JSON.parse(e) : e; } catch { return null; } })
    .filter(Boolean);
}

// Returns daily aggregates for a date range — [{date, cost, input_tokens, output_tokens, calls}]
export async function getTenantDailyUsage(tenant, fromDate, toDate) {
  const days = [];
  const from = new Date(fromDate);
  const to   = new Date(toDate);
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  if (!days.length) return [];

  const pipe = kv.pipeline();
  for (const day of days) {
    pipe.hgetall(`ai_usage_daily:${tenant}:${day}`);
  }
  const results = await pipe.exec();

  return days
    .map((date, i) => results[i] ? { date, ...parseHash(results[i]) } : null)
    .filter(Boolean);
}
