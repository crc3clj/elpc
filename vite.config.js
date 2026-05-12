import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/CRC3CLJ/elpc/',
  plugins: [react()],
  server: {
    open: true
  }
}))