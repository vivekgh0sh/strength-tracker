import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Using './' for the base path makes assets paths relative,
  // which is robust for deploying to GitHub Pages.
  base: './',
})
