import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import agents from 'agents/vite'

export default defineConfig({
  plugins: [agents(), react(), cloudflare(), tailwindcss()],
})
