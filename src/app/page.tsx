import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopilotWorkspace } from "./workspace";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// Verify a signed-in Supabase user on the server before rendering AI tools.
export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return (
      <main style={{ maxWidth: 620, margin: "10vh auto", padding: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700 }}>AMO AI Dashboard</h1>
        <p style={{ marginTop: 14 }}>The application is ready. Connect your new Supabase project to enable sign-in and AI conversations.</p>
        <p style={{ marginTop: 14 }}>Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your private environment.</p>
      </main>
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/sign-in");
  return <CopilotWorkspace />;
}
