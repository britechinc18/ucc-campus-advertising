import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
if (!process.env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL required');
const pool=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL,max:1});
try { await migrate(drizzle(pool),{migrationsFolder:'drizzle'}); console.log('Migrations applied'); }
finally {await pool.end();}
