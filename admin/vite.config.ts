import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The admin app is self-contained: it reads admin/.env (see .env.example).
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
});
