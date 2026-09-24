import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['test/**/*.{test,spec}.ts'],
    // colors on, so the help snapshot pins the CLI's styling too
    env: { FORCE_COLOR: '1' },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'test/coverage',
      include: ['src/**/*.ts'],
      // bin.ts is the two-line executable shim around cli.ts's main(); it only
      // runs as a real process, which the in-process coverage cannot see
      exclude: ['src/bin.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 100
      }
    }
  }
});
