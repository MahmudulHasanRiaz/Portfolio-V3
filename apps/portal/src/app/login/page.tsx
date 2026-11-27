"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

/**
 * Client Portal sign-in — compact Clerk-style card, same visual language
 * as the admin login (small, minimal, clean). NO social buttons here:
 * portal login stays Project ID + Email + Password — a client signs in
 * to one project, and there is no Google/GitHub account linked to a
 * project client.
 *
 * Style-only restyle: the portal app has no Tailwind wiring, so the
 * shared @repo/ui Card/Input/Button (Tailwind classes) rendered
 * unstyled here. Native elements + the portal's own token variables
 * (PR #42 layer in globals.css) give the same form a themed render
 * without touching any shared code. No behavior changed below — the
 * error text still comes from the API verbatim (the API only ever
 * returns generic messages since PR #68; no raw DB error can reach
 * this box).
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("project") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    lineHeight: 1.5,
    borderRadius: 10,
    border: "1px solid var(--border-strong)",
    backgroundColor: "var(--surface)",
    color: "var(--text-primary)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: "var(--text-primary)",
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 14,
          boxShadow: "var(--portal-shadow-md)",
          padding: "28px 24px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogIn size={20} />
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
              marginTop: 12,
            }}
          >
            Client Portal
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Sign in to your project workspace
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-strong)",
                borderLeft: "3px solid #dc2626",
                backgroundColor: "var(--surface-raised)",
                color: "var(--text-primary)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          <div>
            <label style={labelStyle}>Project ID</label>
            <input
              style={inputStyle}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Your project ID"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
            />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px 16px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
            margin: "16px 0 0",
          }}
        >
          Secured by Better Auth
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
