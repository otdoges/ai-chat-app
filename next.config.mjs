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
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-popover',
      'react-syntax-highlighter'
    ],
  },
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-syntax-highlighter/dist/esm/styles/prism': 'react-syntax-highlighter/dist/esm/styles/prism/oneDark',
    };

    return config;
  },
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    AI_MODEL: process.env.AI_MODEL || 'openai/gpt-4.1',
    AI_ENDPOINT: process.env.AI_ENDPOINT || 'https://models.github.ai/inference',
  },
}

export default nextConfig
