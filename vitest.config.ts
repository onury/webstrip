import { configDefaults, defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig(_configEnv => {

  return {
    test: {
      // if true, add "vitest/globals" to
      // compilerOptions.types in tsconfig.json
      globals: true,
      environment: 'node',
      // include: [...configDefaults.include],
      exclude: [...configDefaults.exclude, '**/lib/**'],
      coverage: {
        // provider: 'v8',
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: [
          ...configDefaults.coverage.exclude ?? [],
          'test/**'
        ],
        reportsDirectory: 'test/.coverage',
        reporter: [
          'text',
          // ['lcov', { projectRoot: './src', directory: 'test/.coverage/lcov' }],
          ['json', { file: 'coverage.json' }],
          ['html', { directory: 'test/.coverage/html' }]
        ],
        thresholds: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        }
      }
    }
  };

});
