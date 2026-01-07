import * as dotenv from 'dotenv';
import * as path from 'path';

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../.env.test');
  dotenv.config({ path: envPath });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL not found in environment. Make sure .env.test exists or environment variable is set.',
  );
}

const safeUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
console.log('✓ E2E test environment verified');
console.log(`✓ DATABASE_URL: ${safeUrl}`);
