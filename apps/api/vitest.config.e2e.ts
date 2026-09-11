import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // All e2e suites share the real development PostgreSQL. Running files
    // sequentially keeps each suite's data isolation from interfering.
    fileParallelism: false,
  },
});
