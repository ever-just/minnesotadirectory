import { neon } from '@netlify/neon';

// Create a singleton database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

// Export a single SQL function that all functions can use
export const sql = neon(DATABASE_URL);

// Common database query helpers
export async function executeQuery<T = any>(query: any): Promise<T[]> {
  try {
    const result = await query;
    return result as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Type-safe query builder
export function buildQuery(template: TemplateStringsArray, ...values: any[]) {
  return sql(template, ...values);
}
