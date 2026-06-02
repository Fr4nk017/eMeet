import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  outDir: 'dist',
  target: 'node20',
  clean: true,
})
