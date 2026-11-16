import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
