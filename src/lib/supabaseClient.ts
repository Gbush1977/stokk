import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured — Supabase calls will fail until they're set.",
  );
}

// createClient throws synchronously on an empty/invalid URL, which would
// crash the whole app at import time before any caller's try/catch can run.
// Fall back to a syntactically valid placeholder so module load always
// succeeds — unconfigured calls then fail at the network layer instead,
// where AppShell's existing try/catch already falls back to mock data.
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder-anon-key");
