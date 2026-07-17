'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export function LoginForm() {
  const supabase = createBrowserSupabaseClient()

  const handleLogin = async (provider: 'google' | 'apple') => {
    await supabase.auth.signInWithOAuth({ provider })
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Virtual Concierge</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your intercoms</p>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => handleLogin('google')}
            className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Sign in with Google
          </button>
          <button
            onClick={() => handleLogin('apple')}
            className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Sign in with Apple
          </button>
        </div>
      </div>
    </div>
  )
}
