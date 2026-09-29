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

// Cluster SEO nuevo — arranca solo en español (todavía no tienen versión en inglés,
// a diferencia del resto que vive en ambos locales desde siempre).
const esOnlyPages = [
  { path: '/servicios/automatizacion-reportes-ai', freq: 'monthly', priority: 0.9 },
  { path: '/blog/que-ia-puede-generar-reportes',    freq: 'monthly', priority: 0.6 },
];

export default function sitemap() {
  const localized = pages.flatMap(({ path, freq, priority }) =>
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

  const esOnly = esOnlyPages.map(({ path, freq, priority }) => ({
    url: `${BASE}/es${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }));

  return [...localized, ...esOnly];
}
