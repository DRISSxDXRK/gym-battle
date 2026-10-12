import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    // Ship Preact (React-compatible API) instead of React for a tiny bundle
    // that fits GitHub Pages nicely. App code stays 100% React.
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': path.resolve(__dirname, 'src/preact-root.js'),
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
})
