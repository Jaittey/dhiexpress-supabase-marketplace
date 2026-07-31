import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {
  appConfig,
  isSupabaseConfigured
} from "./config.js";

const supabase = isSupabaseConfigured
  ? createClient(
      appConfig.supabase.url,
      appConfig.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  : null;

export {
  supabase,
  isSupabaseConfigured
};
