import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/di/index.ts'],
  format: ['cjs', 'esm'],
  // Downlevel ES2022 `static {}` initializer blocks and class fields so the
  // shipped bundle parses on every Hermes in the supported `react-native >=0.71`
  // range. Metro does not run Babel over node_modules, so this raw syntax would
  // otherwise reach Hermes untranspiled and can fail to parse (white-screen
  // crash on launch) on older in-range Hermes builds.
  target: 'es2019',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-native', 'rxjs', 'tsyringe', 'reflect-metadata'],
});