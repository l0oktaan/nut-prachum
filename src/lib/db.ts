import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Return DATE columns as plain "YYYY-MM-DD" strings instead of local-time Date objects.
types.setTypeParser(1082, (v) => v);
// DATE[] arrives as "{2026-11-03,2026-11-05}" — dates never contain commas or quotes.
const DATE_ARRAY_OID = 1182 as Parameters<typeof types.setTypeParser>[0]; // not in pg's builtin enum
types.setTypeParser(DATE_ARRAY_OID, (v: string) => (v === "{}" ? [] : v.slice(1, -1).split(",")));

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
