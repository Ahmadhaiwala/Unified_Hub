import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://jlznjylmntyzepvufkja.supabase.co"

//const supabaseUrl = "https://ovlslclsnkqrehprtzyw.supabase.co"
const supabaseAnonKey = "sb_publishable_uIdLQY11_C-dSHBDQMx8NA_30_TLYGs"
//const supabaseAnonKey= "sb_publishable_jnvNmrvRp4YzgOY-NaWpGg_sXK1LUuR"

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
