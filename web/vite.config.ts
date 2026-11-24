import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Gauß API (server/) — same-origin in production via vercel.json rewrite
    proxy: {'/api': 'http://127.0.0.1:3010'},
  },
})
