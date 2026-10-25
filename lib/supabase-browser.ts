
"use client";

import { createBrowserClient } from "@supabase/ssr";

let browserClient:
  | ReturnType<typeof createBrowserClient>
  | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Missing public Supabase environment variables.");
    }

    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
