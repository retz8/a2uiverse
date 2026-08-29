import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

/** Design-check harness only — never built or shipped. Tunnel row: 5174. */
export default defineConfig({
  plugins: [react()],
  server: {port: 5174, strictPort: true},
});
