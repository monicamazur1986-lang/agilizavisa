/** @type {import('next').NextConfig} */
const nextConfig = {
  // Site estático: o portal não tem rota de API nem ação de servidor, então o build
  // gera HTML/JS puros, publicáveis no plano gratuito do Firebase Hosting.
  output: 'export',
  images: {
    // A otimização de imagens do Next exige servidor; no build estático ela é desligada.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' }
    ]
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  reactStrictMode: true
};

module.exports = nextConfig;
