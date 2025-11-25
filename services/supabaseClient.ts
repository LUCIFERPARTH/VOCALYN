import { createClient } from '@supabase/supabase-js';

// Access environment variables using import.meta.env for Vite compatibility,
// with a fallback to process.env if a different bundler is used.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing. Please check your .env.local file and ensure variables start with VITE_");
}

export const supabase = createClient(supabaseUrl, supabaseKey);