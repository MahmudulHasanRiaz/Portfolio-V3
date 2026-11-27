"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@repo/auth";

/**
 * Admin sign-in — compact Clerk-style card.
 *
 * Small, minimal, clean: a ~360px card, brand mark + "Portfolio OS" on
 * top, Google / GitHub buttons when a provider is enabled AND fully
 * credentialed in Settings → Social Login, an "or continue with email"
 * divider, then email + password. All colours come from the admin CSS
 * variables, so the card follows the dashboard theme (light + dark)
 * instead of the old hardcoded light-only blue card.
 *
 * Social sign-in can never create an account (Better Auth runs both
 * providers with disableImplicitSignUp): only an email that already
 * has an admin account can sign in with Google/GitHub. A failed OAuth
 * callback lands back here with ?error=<code>; the codes are mapped
 * to friendly messages below and the raw query value is never shown.
 */

type SocialProvider = "google" | "github";

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "var(--bg)",
    fontFamily: "var(--font-sans)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: "28px 24px 22px",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow-sm)",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    objectFit: "cover",
    display: "block",
  },
  monogram: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "var(--brand)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 700,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    margin: "12px 0 2px",
    textAlign: "center",
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: 13,
    color: "var(--text-muted)",
    margin: 0,
    textAlign: "center",
  },
  socialButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 16px",
    backgroundColor: "var(--surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "18px 0",
    fontSize: 12,
    color: "var(--text-muted)",
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "var(--border)" },
  group: { marginBottom: 12 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: "var(--text-primary)",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: 14,
    boxSizing: "border-box",
    fontFamily: "var(--font-sans)",
  },
  button: {
    width: "100%",
    padding: "11px 16px",
    backgroundColor: "var(--brand)",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  },
  error: {
    padding: "10px 12px",
    borderRadius: 8,
    backgroundColor: "var(--red-soft)",
    color: "var(--red)",
    fontSize: 13,
    marginBottom: 14,
  },
  footer: {
    fontSize: 12,
    color: "var(--text-muted)",
    textAlign: "center",
    margin: "16px 0 0",
  },
};

/** Friendly text for Better Auth's OAuth callback ?error= codes. The raw
 *  query value is never rendered — an unknown code gets the generic line. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  signup_disabled:
    "This Google/GitHub account doesn't have an admin account yet. Sign in with email and password instead.",
  account_not_linked:
    "This Google/GitHub account isn't linked to an admin account yet. Sign in with email and password instead.",
  access_denied:
    "Social sign-in was cancelled. Try again, or sign in with email and password.",
  oauth_provider_not_found:
    "That social provider isn't configured. Sign in with email and password.",
  email_not_found:
    "The provider didn't return an email address. Sign in with email and password.",
};

function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return (
    OAUTH_ERROR_MESSAGES[code] ??
    "Social sign-in failed. Try again, or sign in with email and password."
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const SOCIAL_LABELS: Record<SocialProvider, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
};

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(
    null,
  );
  const [siteName, setSiteName] = useState("Mahmudul Hasan Riaz");
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [socialProviders, setSocialProviders] = useState<SocialProvider[]>(
    [],
  );

  // Brand + available social providers, from the public settings
  // endpoint (same-origin through the /api/* proxy). The email form
  // works immediately — this only fills in the brand and the social
  // buttons, and a failed fetch just leaves them at their defaults.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data === null || typeof data !== "object") return;
        const record = data as Record<string, unknown>;
        if (typeof record.siteName === "string" && record.siteName.trim()) {
          setSiteName(record.siteName.trim());
        }
        if (
          typeof record.faviconUrl === "string" &&
          record.faviconUrl.trim()
        ) {
          setFaviconUrl(record.faviconUrl.trim());
        }
        if (Array.isArray(record.socialProviders)) {
          setSocialProviders(
            record.socialProviders.filter(
              (p): p is SocialProvider => p === "google" || p === "github",
            ),
          );
        }
      })
      .catch(() => {
        // Brand/social stay at defaults; email sign-in is unaffected.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A failed OAuth callback lands back here with ?error=<code>.
  useEffect(() => {
    const message = oauthErrorMessage(searchParams.get("error"));
    if (message) setError(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSocial = async (provider: SocialProvider) => {
    setError("");
    setSocialLoading(provider);
    try {
      const { data, error: signInError } =
        await authClient.signIn.social({
          provider,
          callbackURL: redirect,
        });
      if (signInError) {
        setError(
          signInError.message ??
            "Social sign-in failed. Try email and password.",
        );
        setSocialLoading(null);
      } else if (data?.url) {
        // The client normally navigates itself; this is the fallback
        // if it resolves without leaving the page.
        window.location.href = data.url;
      } else {
        setSocialLoading(null);
      }
    } catch {
      setError("Social sign-in failed. Try email and password.");
      setSocialLoading(null);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.brand}>
          {faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={faviconUrl} alt="" style={s.logo} />
          ) : (
            <div style={s.monogram}>{siteName.charAt(0) || "P"}</div>
          )}
          <h1 style={s.title}>Portfolio OS</h1>
          <p style={s.subtitle}>{siteName}</p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {socialProviders.length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {socialProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                style={{
                  ...s.socialButton,
                  opacity: socialLoading ? 0.6 : 1,
                }}
                disabled={socialLoading !== null || loading}
                onClick={() => void handleSocial(provider)}
              >
                {provider === "google" ? <GoogleMark /> : <GitHubMark />}
                {socialLoading === provider
                  ? "Redirecting…"
                  : SOCIAL_LABELS[provider]}
              </button>
            ))}
            <div style={s.divider}>
              <span style={s.dividerLine} />
              <span>or continue with email</span>
              <span style={s.dividerLine} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={s.group}>
            <label style={s.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              style={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div style={{ ...s.group, marginBottom: 16 }}>
            <label style={s.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              style={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Your password"
            />
          </div>
          <button type="submit" style={s.button} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={s.footer}>Secured by Better Auth</p>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
