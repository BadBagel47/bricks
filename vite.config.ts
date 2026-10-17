import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs let the same build run under /bricks/ on GitHub Pages.
  base: './',
  plugins: [react()],
})
