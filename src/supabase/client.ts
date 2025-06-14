import type { Database } from '@/types/database.types'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

export const supabase = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_KEY)
