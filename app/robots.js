const BASE = 'https://bonsight.co';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/es/consulta', '/en/consulta', '/proposals/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
