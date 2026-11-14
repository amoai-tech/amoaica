"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SessionState = "checking" | "ready" | "missing" | "saved";

export default function ResetPasswordPage() {
  const [state, setState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    // A recovery link establishes an authenticated session via /auth/callback.
    createClient().auth.getUser().then(({ data, error: authError }) => {
      if (active) setState(!authError && data.user ? "ready" : "missing");
    }).catch(() => {
      if (active) setState("missing");
    });
    return () => { active = false; };
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("Use at least 12 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError("Could not change password. Use a new reset link or try another strong password.");
        return;
      }
      // Require a fresh password login instead of silently continuing a recovery session.
      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setState("saved");
    } catch {
      setError("Password change could not be completed. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Choose a new password</h1>
      {state === "checking" && <p role="status">Checking your recovery link...</p>}
      {state === "missing" && (
        <p role="alert">This recovery link is invalid, expired, or has already been used. <Link href="/forgot-password">Request another link.</Link></p>
      )}
      {state === "saved" && (
        <p role="status">Password updated. <Link href="/sign-in">Sign in with your new password.</Link></p>
      )}
      {state === "ready" && (
        <form onSubmit={savePassword} style={{ display: "grid", gap: 14 }}>
          <p>Choose a new password with at least 12 characters.</p>
          <label>New password
            <input type="password" autoComplete="new-password" required minLength={12}
              value={password} onChange={(event) => setPassword(event.target.value)}
              style={{ display: "block", width: "100%", border: "1px solid gray", padding: 10 }}/>
          </label>
          <label>Confirm new password
            <input type="password" autoComplete="new-password" required minLength={12}
              value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
              style={{ display: "block", width: "100%", border: "1px solid gray", padding: 10 }}/>
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={submitting}
            style={{ padding: 12, background: "#1b2661", color: "white", borderRadius: 6 }}>
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      )}
      <p style={{ marginTop: 18 }}><Link href="/sign-in">Back to sign in</Link></p>
    </main>
  );
}
