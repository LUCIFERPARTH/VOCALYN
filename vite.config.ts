import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all .env variables regardless of VITE_ prefix for the current mode
  const env = loadEnv(mode, '.', ''); 

  return {
    plugins: [react()],
    define: {
      // Expose specific environment variables to the client-side code
      // under process.env, similar to Create React App.
      // Vite by default only exposes VITE_ prefixed variables via import.meta.env.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
    },
    server: {
      port: 3000, 
      open: true,   
    }
  }
});