import { readMigrationFiles } from 'drizzle-orm/migrator';
// Read-only export for a freshly provisioned database reached through Neon MCP.
// Apply only after confirming its application schema and migration ledger are empty.
// Uses the same SQL, hashes and folder timestamps as Drizzle's PostgreSQL migrator.
const migrations = readMigrationFiles({ migrationsFolder: 'drizzle' });
const statements = [
  'CREATE SCHEMA IF NOT EXISTS drizzle',
  'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
];
for (const migration of migrations) {
  if (!/^[a-f0-9]{64}$/.test(migration.hash) || !Number.isSafeInteger(migration.folderMillis)) {
    throw new Error('Invalid migration metadata');
  }
  statements.push(...migration.sql.filter((statement) => statement.trim().length > 0));
  statements.push(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('${migration.hash}', ${migration.folderMillis})`,
  );
}
console.log(
  JSON.stringify({
    statements,
    migrations: migrations.map((migration) => ({
      hash: migration.hash,
      createdAt: migration.folderMillis,
    })),
  }),
);
