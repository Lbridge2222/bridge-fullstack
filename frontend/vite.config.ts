import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@ui": path.resolve(__dirname, "components/src/components"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            return 'vendor';
          }
          
          // Feature chunks
          if (id.includes('/ai/') || id.includes('AILeadInsights') || id.includes('ForecastingDashboard')) {
            return 'ai-features';
          }
          if (id.includes('/crm/') || id.includes('LeadsManagement') || id.includes('PersonPropertiesPanel')) {
            return 'crm-features';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    proxy: {
      // Proxy API calls to backend (only specific API endpoints)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ai/leads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ai/advanced-ml': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/people': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/applications': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/rag': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/calls': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/meetings': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});