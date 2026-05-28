import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) console.warn('[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant — client désactivé')

export const supabase = url && key ? createClient(url, key) : null
