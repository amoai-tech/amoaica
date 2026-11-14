"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error) {
        setError("Unable to sign in. Check your email and password.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Sign-in is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    setSubmitting(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError("Google sign-in could not start. Please try again.");
    } catch {
      setError("Google sign-in is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return <main style={{ maxWidth: 500, margin: "10vh auto", padding: 24 }}>
      <h1>AMO AI — Supabase setup pending</h1>
      <p>Sign-in will be enabled after your new Supabase project is connected.</p>
    </main>;
  }

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Sign in to AMO AI</h1>
      <p style={{ margin: "12px 0 24px" }}>Use your Supabase account to access your private AI workspace.</p>
      <form onSubmit={signIn} style={{ display: "grid", gap: 14 }}>
        <label>Email<input type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", border: "1px solid gray", padding: 10 }} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: "block", width: "100%", border: "1px solid gray", padding: 10 }} /></label>
        {error && <p role="alert">{error}</p>}
        <button disabled={submitting} type="submit"
          style={{ padding: 12, background: "#1b2661", color: "white", borderRadius: 6 }}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
        <button type="button" disabled={submitting} onClick={signInWithGoogle}
          style={{ width: "100%", padding: 12, marginTop: 14, border: "1px solid gray", borderRadius: 6 }}>
          Continue with Google
        </button>
      )}
      <p style={{ marginTop: 18 }}>Sign in with an account in the new AMO AI Supabase project.</p>
    </main>
  );
}
