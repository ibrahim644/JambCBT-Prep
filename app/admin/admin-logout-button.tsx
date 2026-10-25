
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign-out failed:", error.message);
        setLoading(false);
        return;
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Unable to sign out:", error);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          d="M10 17l5-5-5-5m5 5H3m9-9h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
