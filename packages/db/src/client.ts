import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy-loaded database connection to prevent build-time errors
let _db: NeonHttpDatabase<typeof schema> | null = null;
let _sql: NeonQueryFunction<boolean, boolean> | null = null;

function getConnection() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(process.env.DATABASE_URL) as NeonQueryFunction<boolean, boolean>;
  }
  return _sql;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getConnection(), { schema });
  }
  return _db;
}

// For backwards compatibility - creates a proxy that lazily initializes
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

// Export sql getter for transactions
export function getSql() {
  return getConnection();
}
