import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { NextRequest } from "next/server";
import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { createLocalAgents } from "@/agent";
import { handle } from "hono/vercel";

const runtime = new CopilotRuntime({
  agents: createLocalAgents(),
  // --- copilotkit:intelligence (remove this block to opt out) ---
  ...(process.env.CPK_INTELLIGENCE_API_KEY
    ? {
        intelligence: new CopilotKitIntelligence({
          apiKey: process.env.CPK_INTELLIGENCE_API_KEY,
          ...(process.env.INTELLIGENCE_API_URL
            ? { apiUrl: process.env.INTELLIGENCE_API_URL }
            : {}),
          ...(process.env.INTELLIGENCE_GATEWAY_WS_URL
            ? { wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL }
            : {}),
        }),
        // The stable Supabase Auth user ID is the only trusted CopilotKit thread owner.
        // Never take a user ID from browser headers or request bodies.
        identifyUser: async () => {
          const supabase = await createClient();
          const { data, error } = await supabase.auth.getClaims();
          if (error || !data?.claims?.sub) throw new Error("Unauthorized");
          return { id: data.claims.sub, name: data.claims.sub };
        },
      }
    : { runner: new InMemoryAgentRunner() }),
  // --- /copilotkit:intelligence ---
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

const honoHandler = handle(app);

// Authenticate before entering the CopilotKit/Hono runtime on EVERY method.
// identifyUser alone is not an authorization boundary: some endpoints skip it.
async function authenticatedHandler(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase Auth not configured" }, { status: 503 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return honoHandler(request);
}

export const GET = authenticatedHandler;
export const POST = authenticatedHandler;
export const PATCH = authenticatedHandler;
export const DELETE = authenticatedHandler;
