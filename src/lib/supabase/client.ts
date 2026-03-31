// src/lib/supabase/client.ts
// Singleton client para uso em Client Components

import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient<any>> | undefined

export function createClient() {
  if (client) return client
  client = createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}

// Exporta o singleton para uso direto nos services
export const supabase = createClient()
