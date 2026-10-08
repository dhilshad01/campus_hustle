import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// In development the React app proxies /api and /uploads to the Express server, so login cookies work without CORS.
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' } } })
