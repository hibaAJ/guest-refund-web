import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.local.example to .env.local and fill in your values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type RefundRequest = {
  id: string
  full_name: string
  email: string
  booking_ref: string
  booking_date: string
  refund_reason: string
  details: string | null
  file_url: string | null
  created_at: string
}

export type MaintenanceIssue = {
  id: string
  ticket_id: string
  property: string
  category: string
  urgency: 'low' | 'medium' | 'high'
  description: string
  photo_url: string | null
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  last_updated_at: string
}
