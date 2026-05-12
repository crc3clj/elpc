import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/elpc/',
  plugins: [react()],
  server: {
    open: true
  }
}))