import { defineConfig, configDefaults } from 'vitest/config';
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/browser/**'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
