import { BetaAnalyticsDataClient } from '@google-analytics/data';

const GA_PROPERTY = '538471138';
let cache = null;
let cacheTime = 0;
const TTL = 15 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cacheTime < TTL) return Response.json(cache);

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const client = new BetaAnalyticsDataClient({ credentials });

    const [res] = await client.runReport({
      property: `properties/${GA_PROPERTY}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViews' },
      ],
    });

    const row = res.rows?.[0];
    const seconds = Math.round(parseFloat(row?.metricValues?.[2]?.value || 0));

    cache = {
      sessions: parseInt(row?.metricValues?.[0]?.value || 0).toLocaleString(),
      users: parseInt(row?.metricValues?.[1]?.value || 0).toLocaleString(),
      duration: `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
      pageViews: parseInt(row?.metricValues?.[3]?.value || 0).toLocaleString(),
    };
    cacheTime = Date.now();

    return Response.json(cache);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
