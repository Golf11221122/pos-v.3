import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ===============================
// Supabase Configuration
// ===============================

export const SUPABASE_URL = 'https://fzijrnpoemivbthzghuz.supabase.co'

// ใส่ Publishable Key ของโปรเจกต์ Supabase ตรงนี้
export const SUPABASE_KEY = 'sb_publishable_macbRV6oHAwutZuOPgIBjQ_oRoO2eKo'

// ===============================
// Create Supabase Client
// ===============================

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
)

/*
 * Isolated Auth client
 * - does not replace the Admin's current browser session
 * - used only for controlled employee onboarding
 */
export function createIsolatedSupabaseClient() {
    return createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    )
}

