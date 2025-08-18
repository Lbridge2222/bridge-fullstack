// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/styles/index.css'; // 🔥 FIXED PATH - styles/index.css not index.css

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'gray', value: '#f3f4f6' },
        { name: 'dark', value: '#1f2937' },
      ],
    },
  },
};

export default preview;
