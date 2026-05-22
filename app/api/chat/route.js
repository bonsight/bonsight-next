import { BetaAnalyticsDataClient } from '@google-analytics/data';
import OpenAI from 'openai';

const GA_PROPERTY = '538471138';

let gaCache = null;
let gaCacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000;

async function getGAData() {
  if (gaCache && Date.now() - gaCacheTime < CACHE_TTL) return gaCache;

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const client = new BetaAnalyticsDataClient({ credentials });

  const dateRanges = [{ startDate: '30daysAgo', endDate: 'today' }];

  const [overview, topPages, sources, countries, devices] = await Promise.all([
    client.runReport({
      property: `properties/${GA_PROPERTY}`,
      dateRanges,
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    }),
    client.runReport({
      property: `properties/${GA_PROPERTY}`,
      dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property: `properties/${GA_PROPERTY}`,
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    client.runReport({
      property: `properties/${GA_PROPERTY}`,
      dateRanges,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    client.runReport({
      property: `properties/${GA_PROPERTY}`,
      dateRanges,
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
    }),
  ]);

  const fmt = (rows, dimKey, metKey) =>
    (rows || []).map((r) => ({
      [dimKey]: r.dimensionValues?.[0]?.value,
      [metKey]: r.metricValues?.[0]?.value,
    }));

  const ov = overview[0]?.rows?.[0];
  const seconds = Math.round(parseFloat(ov?.metricValues?.[4]?.value || 0));
  const duration = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const data = {
    period: 'last 30 days',
    overview: {
      sessions: ov?.metricValues?.[0]?.value,
      activeUsers: ov?.metricValues?.[1]?.value,
      pageViews: ov?.metricValues?.[2]?.value,
      bounceRate: (parseFloat(ov?.metricValues?.[3]?.value || 0) * 100).toFixed(1) + '%',
      avgSessionDuration: duration,
    },
    topPages: fmt(topPages[0]?.rows, 'page', 'views'),
    trafficSources: fmt(sources[0]?.rows, 'channel', 'sessions'),
    topCountries: fmt(countries[0]?.rows, 'country', 'sessions'),
    devices: fmt(devices[0]?.rows, 'device', 'sessions'),
  };

  gaCache = data;
  gaCacheTime = Date.now();
  return data;
}

const SYSTEM_PROMPT = (data, locale) => `
You are an analytics assistant for the Bonsight website. You have access to real Google Analytics 4 data.
Answer questions naturally, concisely, and helpfully. Keep responses short (2-4 sentences max).
Only share aggregated, anonymous data — never mention individual users.
If you don't have the data to answer something, say so clearly.
${locale === 'es' ? 'Responde siempre en español.' : 'Always respond in English.'}

Current website data (${data.period}):

OVERVIEW:
- Sessions: ${data.overview.sessions}
- Active users: ${data.overview.activeUsers}
- Page views: ${data.overview.pageViews}
- Bounce rate: ${data.overview.bounceRate}
- Avg session duration: ${data.overview.avgSessionDuration}

TOP PAGES (by views):
${data.topPages.map((p, i) => `${i + 1}. ${p.page} — ${p.views} views`).join('\n')}

TRAFFIC SOURCES:
${data.trafficSources.map((s) => `- ${s.channel}: ${s.sessions} sessions`).join('\n')}

TOP COUNTRIES:
${data.topCountries.map((c) => `- ${c.country}: ${c.sessions} sessions`).join('\n')}

DEVICES:
${data.devices.map((d) => `- ${d.device}: ${d.sessions} sessions`).join('\n')}
`.trim();

export async function POST(req) {
  try {
    const { messages, locale = 'en' } = await req.json();
    const gaData = await getGAData();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(gaData, locale) },
        ...messages,
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return Response.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('Chat API error:', err?.message || err);
    return Response.json({ reply: `Error: ${err?.message || 'Unknown error'}` }, { status: 500 });
  }
}
