// Supabase client — stubbed for Phase 1, ready for Phase 2 integration
// Replace the placeholder values with your actual Supabase project credentials

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

// Phase 1: Mock client interface — swap with real @supabase/supabase-js when ready
export const supabase = {
  _url: SUPABASE_URL,
  _key: SUPABASE_ANON_KEY,
  isConfigured: SUPABASE_URL !== 'https://placeholder.supabase.co',

  // Stub methods (replace with real Supabase calls in Phase 2)
  from: (_table: string) => ({
    select: (_columns?: string) => Promise.resolve({ data: [], error: null }),
    insert: (_data: unknown) => Promise.resolve({ data: null, error: null }),
    update: (_data: unknown) => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),

  auth: {
    signIn: (_email: string, _password: string) => Promise.resolve({ user: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getUser: () => Promise.resolve({ user: null, error: null }),
  },
}

// To enable Supabase:
// 1. npm install @supabase/supabase-js
// 2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local
// 3. Replace this file with:
//    import { createClient } from '@supabase/supabase-js'
//    export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
