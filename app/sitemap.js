const BASE = 'https://bonsight.co';

const pages = [
  { path: '',                        freq: 'weekly',  priority: 1.0 },
  { path: '/services/data-strategy', freq: 'monthly', priority: 0.8 },
  { path: '/services/growth',        freq: 'monthly', priority: 0.8 },
  { path: '/services/cro',           freq: 'monthly', priority: 0.8 },
  { path: '/services/mentoring',     freq: 'monthly', priority: 0.8 },
  { path: '/services/procesos',      freq: 'monthly', priority: 0.8 },
  { path: '/services/liderazgo',     freq: 'monthly', priority: 0.8 },
  { path: '/cases/olaclick',         freq: 'monthly', priority: 0.7 },
  { path: '/cases/sesuveca',         freq: 'monthly', priority: 0.7 },
];

export default function sitemap() {
  return pages.flatMap(({ path, freq, priority }) =>
    ['es', 'en'].map(locale => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: freq,
      priority,
      alternates: {
        languages: {
          es: `${BASE}/es${path}`,
          en: `${BASE}/en${path}`,
        },
      },
    }))
  );
}
