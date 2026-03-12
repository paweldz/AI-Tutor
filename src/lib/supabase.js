import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Supabase client — null when env vars are not configured */
export const supabase = url && key ? createClient(url, key) : null;
