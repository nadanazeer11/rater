import type { NextConfig } from 'next';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

// Next.js only auto-loads .env from the app directory; load the monorepo-root
// .env so vars (DATABASE_URL, NEXT_PUBLIC_SUPABASE_*, etc.) are available here too.
loadEnv({ path: join(__dirname, '../../.env') });
loadEnv({ path: join(__dirname, '../../.env.local'), override: true });

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(__dirname, '../..'),
  // Next 15 defaults dynamic routes' router-cache to 0, which means revisiting a
  // tab fetches its RSC payload from the server every time — wasted round-trip
  // when TanStack Query already has the data client-side. Match useQuery's
  // 5-min default so warm revisits skip the server entirely.
  experimental: {
    staleTimes: { dynamic: 300, static: 300 },
  },
};

export default nextConfig;
