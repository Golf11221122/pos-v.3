import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ===============================
// Supabase Configuration
// ===============================

const SUPABASE_URL = 'https://fzijrnpoemivbthzghuz.supabase.co'

// ใส่ Publishable Key ของโปรเจกต์ Supabase ตรงนี้
const SUPABASE_KEY = 'sb_publishable_macbRV6oHAwutZuOPgIBjQ_oRoO2eKo'

// ===============================
// Create Supabase Client
// ===============================

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
)
