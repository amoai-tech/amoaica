import Link from "next/link";

export default function SignUpPage() {
  return (
    <main style={{ maxWidth: 480, margin: "10vh auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>AMO AI account setup</h1>
      <p style={{ marginTop: 18 }}>
        New account creation is temporarily disabled until an isolated
        Supabase development project has been connected.
      </p>
      <p style={{ marginTop: 14 }}><Link href="/sign-in">Return to sign in</Link></p>
    </main>
  );
}
