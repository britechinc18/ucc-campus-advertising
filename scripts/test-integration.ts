import { spawnSync } from 'node:child_process';
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error(
    'Explicit TEST_DATABASE_URL with database name ending _test required. This suite truncates test data.',
  );
const migrated = spawnSync('npm', ['run', 'db:migrate'], {
  stdio: 'inherit',
  env: { ...process.env, MIGRATION_DATABASE_URL: url },
});
if (migrated.status !== 0) process.exit(migrated.status ?? 1);
const tested = spawnSync('npx', ['vitest', 'run'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(tested.status ?? 1);
