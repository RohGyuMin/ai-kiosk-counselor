/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloud Run / Docker 배포용: 필요한 파일만 담긴 standalone 서버 빌드
  output: 'standalone',
};

export default nextConfig;
