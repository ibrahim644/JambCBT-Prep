
import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-ssr";
import { supabase } from "@/lib/supabase";

export async function getAdminUser() {
  const authClient = await createSupabaseServerClient();

  // Verify the session with Supabase Auth.
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Check the verified user's ID against the server-only admin allowlist.
  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return null;
  }

  return user;
}
