"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@repo/auth";

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 32,
    backgroundColor: "#fff",
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,.1)",
  },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 24, textAlign: "center" },
  group: { marginBottom: 16 },
  label: { display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 },
  input: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
};

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email(
        { email, password },
      );
      if (signInError) {
        setError(signInError.message ?? "Sign in failed");
      } else {
        router.push(redirect);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Sign in</h1>
        <p style={s.subtitle}>Enter your credentials to access the dashboard</p>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={s.group}>
            <label style={s.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              style={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div style={s.group}>
            <label style={s.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              style={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" style={s.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <LoginFormInner />
    </Suspense>
  );
}
