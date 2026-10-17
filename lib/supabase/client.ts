import { createBrowserClient } from "@supabase/ssr";

// Browser client: publishable key only. RLS decides what the user can see.
// createBrowserClient returns a singleton in the browser.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

let sessionPromise: Promise<void> | null = null;

// Makes sure the visitor has a session, signing in anonymously on first visit.
// Shared across components so we only ever sign in once per page load.
export function ensureSession(): Promise<void> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    })().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}
