import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./interview.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node26',
  outDir: './interview-sea',
  unbundle: false,
  deps: {
    alwaysBundle: ['mitt', 'undici'],
  },
});
