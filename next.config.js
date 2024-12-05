/** @type {import('next').NextConfig} */
const nextConfig = {
  // Отключаем строгий режим для совместимости с некоторыми компонентами
  reactStrictMode: false,
  
  // Настройка CORS для API routes
  async headers() {
    return [
      {
        // Применяем эти заголовки ко всем маршрутам
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Конфигурация для работы с внешним API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://ofd-converter.vercel.app/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
