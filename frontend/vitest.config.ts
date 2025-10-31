import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',  // Use node environment for simple logic tests
      globals: true,
      setupFiles: [],
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      exclude: ['node_modules', 'dist', '.storybook'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/**/*.stories.{js,jsx,ts,tsx}',
          'dist/',
          '.storybook/',
        ]
      }
    }
  })
);
