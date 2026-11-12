"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

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
      const res = await fetch("/api/auth/login", {
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

  // Style-only restyle: the portal app has no Tailwind wiring, so the
  // shared @repo/ui Card/Input/Button (Tailwind classes) rendered
  // unstyled here. Native elements + the portal's own token variables
  // (PR #42 layer in globals.css) give the same form a themed render
  // without touching any shared code. No behavior changed below.
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    lineHeight: 1.5,
    borderRadius: 8,
    border: "1px solid var(--border-strong)",
    backgroundColor: "var(--surface)",
    color: "var(--text-primary)",
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 12,
          boxShadow: "var(--portal-shadow-md)",
          padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, color: "var(--accent)" }}>
          <LogIn size={20} />
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
            Client Portal
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #fecaca",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Project ID</label>
            <input
              style={inputStyle}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Your project ID"
              required
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Password</label>
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
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 8,
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
