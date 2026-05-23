const BASE = 'https://bonsight.co';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/es/consulta', '/en/consulta'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
