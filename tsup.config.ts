import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/di/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-native', 'rxjs', 'tsyringe', 'reflect-metadata'],
});