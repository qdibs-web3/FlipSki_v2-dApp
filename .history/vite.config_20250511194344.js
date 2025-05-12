import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      exclude: [],
      protocolImports: true,
    }),
  ],
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
    },
  },
  server: {
    allowedHosts: ["5174-izi3fcuiokieokavkker0-9ac2d749.manus.computer"],
  },
});

