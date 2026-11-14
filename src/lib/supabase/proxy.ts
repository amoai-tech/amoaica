import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv, isSupabaseConfigured } from "./env";

function copyAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(name);
    if (value) to.headers.set(name, value);
  }
  return to;
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    const path = request.nextUrl.pathname;
    if (path === "/api/copilotkit" || path.startsWith("/api/copilotkit/")) {
      return NextResponse.json({ error: "Supabase Auth not configured" }, { status: 503 });
    }
    return NextResponse.next({ request });
  }
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  // Verified JWT claims, never trust unverified cookie values/getSession().
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? undefined : data?.claims?.sub;
  const path = request.nextUrl.pathname;
  const aiApi = path === "/api/copilotkit" || path.startsWith("/api/copilotkit/");

  if (!userId && aiApi) {
    return copyAuthCookies(
      response,
      NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    );
  }
  if (!userId && path === "/") {
    return copyAuthCookies(
      response,
      NextResponse.redirect(new URL("/sign-in", request.url)),
    );
  }
  return response;
}
