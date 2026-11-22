import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      // rxjs is a peer dependency – never bundle it
      external: [/^rxjs($|\/)/],
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['src/**/*.ts'],
    },
  },
});
