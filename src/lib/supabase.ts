import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Browser singleton with the anon key. RLS is the only security boundary
// (CLAUDE.md §2): never import a service_role key into frontend code.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured && typeof window !== "undefined") {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi (lihat .env.example).",
  );
}

// Placeholders keep the static build working without env; every call then
// fails at request time instead of at import time.
export const supabase = createClient<Database>(
  url || "https://not-configured.supabase.co",
  anonKey || "not-configured",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
