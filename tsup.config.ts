import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // Outputs CommonJS and ESM
  dts: true,              // Emits .d.ts files
  clean: true,            // Cleans output directory
});
