import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy para API em desenvolvimento (resolve CORS)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Link de entrada dos grupos (F6): a página vem inteira do backend
      // (roteia o grupo, grava o clique, dispara o pixel e redireciona).
      '/g': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Conexão externa (item 18): a página de pareamento também vem inteira do
      // backend. O polling do QR passa pelo proxy de '/api' logo acima.
      '/conectar': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@feature-flags": path.resolve(__dirname, "./feature-flags.json"),
    },
  },
}));
