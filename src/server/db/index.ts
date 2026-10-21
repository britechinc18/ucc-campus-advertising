import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
let database: ReturnType<typeof connect> | undefined;
function connect(){
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 return drizzle(new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000}),{schema});
}
export function db(){return database ??= connect();}
export type Executor = Pick<ReturnType<typeof db>, 'execute'>;
