import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: '/CRC3CLJ/elpc/',
  plugins: [react()],
})