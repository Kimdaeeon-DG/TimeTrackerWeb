/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export', // Netlify 배포를 위해 정적 내보내기 활성화
  images: {
    unoptimized: true,
  },
  distDir: 'out', // Netlify가 이 디렉토리를 찾도록 설정
};

module.exports = nextConfig;
