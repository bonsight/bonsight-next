const BASE = 'https://bonsight.co';

const pages = [
  { path: '',                freq: 'weekly',  priority: 1.0 },
  { path: '/services/kairo', freq: 'monthly', priority: 0.9 },
  { path: '/services/lumen', freq: 'monthly', priority: 0.9 },
  { path: '/services/arke',  freq: 'monthly', priority: 0.9 },
  { path: '/cases',               freq: 'monthly', priority: 0.8 },
  { path: '/cases/olaclick',      freq: 'monthly', priority: 0.7 },
  { path: '/cases/sesuveca',      freq: 'monthly', priority: 0.7 },
  { path: '/cases/af-solutions',  freq: 'monthly', priority: 0.7 },
  { path: '/cases/activo-100x100',freq: 'monthly', priority: 0.7 },
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
