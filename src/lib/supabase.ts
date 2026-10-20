import { createClient } from '@supabase/supabase-js'

// The publishable key is safe to ship in the app: row-level security in the database
// limits every table to the signed-in owner on the allowed-users list.
export const SUPABASE_URL = 'https://jjfahgpuyujrgnfhjcrp.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_FJe0_bkdmVRgPS83dfCnzQ_ZcBAJs-9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

export const PHOTO_BUCKET = 'order-photos'
