/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@fullcalendar/react',
    '@fullcalendar/core',
    '@fullcalendar/daygrid',
    '@fullcalendar/timegrid',
    '@fullcalendar/interaction',
  ],
};

export default nextConfig;
