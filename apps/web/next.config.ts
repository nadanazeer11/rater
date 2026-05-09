import type { NextConfig } from 'next';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

// Next.js only auto-loads .env from the app directory; load the monorepo-root
// .env so vars (DATABASE_URL, NEXT_PUBLIC_SUPABASE_*, etc.) are available here too.
loadEnv({ path: join(__dirname, '../../.env') });
loadEnv({ path: join(__dirname, '../../.env.local'), override: true });

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(__dirname, '../..'),
};

export default nextConfig;
