/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/book-free-consultation', destination: '/es', permanent: true },
      { source: '/acerca-de-bonsight',     destination: '/es', permanent: true },
      { source: '/service-page/cro',       destination: '/es/services/cro', permanent: true },
    ];
  },
};

module.exports = nextConfig;
