import { createClient } from '@supabase/supabase-js'

const supabaseUrl =" https://jlznjylmntyzepvufkja.supabase.co"
const supabaseAnonKey ="sb_publishable_uIdLQY11_C-dSHBDQMx8NA_30_TLYGs"

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
