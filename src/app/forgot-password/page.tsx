"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      // Must be allow-listed in Supabase Auth > URL Configuration.
      const redirectTo = new URL("/auth/callback?next=/reset-password", window.location.origin).toString();
      const { error: authError } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (authError) {
        // Do not reveal whether the supplied email belongs to an account.
        setError(authError.status === 429
          ? "Too many requests. Please wait before trying again."
          : "Unable to send reset email right now. Please try again later.");
        return;
      }
      setComplete(true);
    } catch {
      setError("Unable to connect to the sign-in service.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Reset your password</h1>
      {complete ? (
        <p role="status">If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder. Use the newest link only.</p>
      ) : (
        <>
          <p>Enter the email you use to sign in to AMO AI.</p>
          <form onSubmit={requestReset} style={{ display: "grid", gap: 14 }}>
            <label>Email
              <input type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={{ display: "block", width: "100%", border: "1px solid gray", padding: 10 }} />
            </label>
            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={sending}
              style={{ padding: 12, background: "#1b2661", color: "white", borderRadius: 6 }}>
              {sending ? "Sending..." : "Send password reset link"}
            </button>
          </form>
        </>
      )}
      <p style={{ marginTop: 18 }}><Link href="/sign-in">Back to sign in</Link></p>
    </main>
  );
}
