"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui";
import { KeyRound } from "lucide-react";

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ projectId: string; clientEmail: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.projectId) setSessionInfo(data);
        else setError("Invalid or expired access token");
      })
      .catch(() => setError("Failed to verify access token"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Setup failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: "100%", maxWidth: 400 }}>
      <CardHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <KeyRound size={20} />
          <CardTitle>Set Up Portal Access</CardTitle>
        </div>
        <CardDescription>
          {sessionInfo
            ? `Set a password for ${sessionInfo.clientEmail}`
            : "Enter your access token to get started"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)", fontSize: 14 }}>
              {error}
            </div>
          )}
          {!token && (
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Access Token</label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste your access token" required />
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={sessionInfo?.clientEmail || "your@email.com"} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Confirm Password</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Setting up..." : "Set Password & Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SetupPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Suspense fallback={<div>Loading...</div>}>
        <SetupForm />
      </Suspense>
    </div>
  );
}
