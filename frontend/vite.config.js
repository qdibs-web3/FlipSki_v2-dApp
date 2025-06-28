// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      exclude: [],
      protocolImports: true,
      // Add specific polyfills for the missing modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    // Fix process.env access issues
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': 'process.env',
    global: 'globalThis',
    // Add process as a global
    'process': 'process',
  },
  esbuild: {
    loader: "jsx",
    include: [/src\/.*\.jsx$/, /src\/.*\.js$/],
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
      define: {
        global: 'globalThis',
      },
    },
    include: [
      '@thirdweb-dev/react', 
      '@thirdweb-dev/chains',
      'process',
      'process/browser',
      'util',
      'buffer'
    ],
  },
  build: {
    sourcemap: true, // Enable source maps for debugging
    rollupOptions: {
      // Ensure external dependencies are properly handled
      external: [],
      output: {
        manualChunks: {
          'thirdweb': ['@thirdweb-dev/react', '@thirdweb-dev/chains'],
          'viem': ['viem'],
        }
      }
    }
  }
});

