"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import CopilotKitPage from "./copilot-demo";

// Only mount CopilotKit after server-side Supabase authentication.
export function CopilotWorkspace() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" useSingleEndpoint={false}>
      <CopilotKitPage />
    </CopilotKit>
  );
}
