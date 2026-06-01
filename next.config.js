/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Legacy URLs sitio anterior
      { source: '/book-free-consultation', destination: '/es',                permanent: true },
      { source: '/acerca-de-bonsight',     destination: '/es',                permanent: true },
      { source: '/service-page/cro',       destination: '/es/services/lumen', permanent: true },

      // Servicios sueltos sin locale → nuevos productos (ES por defecto)
      { source: '/services/cro',           destination: '/es/services/lumen', permanent: true },
      { source: '/services/growth',        destination: '/es/services/lumen', permanent: true },
      { source: '/services/data-strategy', destination: '/es/services/lumen', permanent: true },
      { source: '/services/mentoring',     destination: '/es/services/arke',  permanent: true },
      { source: '/services/procesos',      destination: '/es/services/arke',  permanent: true },
      { source: '/services/liderazgo',     destination: '/es/services/arke',  permanent: true },

      // Servicios con locale ES → nuevos productos
      { source: '/es/services/cro',           destination: '/es/services/lumen', permanent: true },
      { source: '/es/services/growth',        destination: '/es/services/lumen', permanent: true },
      { source: '/es/services/data-strategy', destination: '/es/services/lumen', permanent: true },
      { source: '/es/services/mentoring',     destination: '/es/services/arke',  permanent: true },
      { source: '/es/services/procesos',      destination: '/es/services/arke',  permanent: true },
      { source: '/es/services/liderazgo',     destination: '/es/services/arke',  permanent: true },

      // Servicios con locale EN → nuevos productos
      { source: '/en/services/cro',           destination: '/en/services/lumen', permanent: true },
      { source: '/en/services/growth',        destination: '/en/services/lumen', permanent: true },
      { source: '/en/services/data-strategy', destination: '/en/services/lumen', permanent: true },
      { source: '/en/services/mentoring',     destination: '/en/services/arke',  permanent: true },
      { source: '/en/services/procesos',      destination: '/en/services/arke',  permanent: true },
      { source: '/en/services/liderazgo',     destination: '/en/services/arke',  permanent: true },
    ];
  },
};

module.exports = nextConfig;
