import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    coverage: {
      include: [
        'app/domain/**/*.ts',
        'app/persistence/**/*.ts',
        'app/stores/**/*.ts',
      ],
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
  },
})
