import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' → relative asset paths so it works under any GitHub Pages repo path.
export default defineConfig({
  base: './',
  plugins: [react()],
})
