/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    AI_MODEL: process.env.AI_MODEL || 'openai/gpt-4.1',
    AI_ENDPOINT: process.env.AI_ENDPOINT || 'https://models.github.ai/inference',
  },
}

export default nextConfig
