import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// GitHub Pages deployment uses repo subpath /sharefile/ when building for production on GitHub Actions
// or '/' for custom domain / local dev.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS ? '/sharefile/' : '/'),
  server: {
    port: 5173,
    host: true
  }
})
