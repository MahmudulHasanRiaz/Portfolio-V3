"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2 style={{ color: "var(--destructive)", marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 16, fontSize: 14 }}>
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            cursor: "pointer",
            color: "var(--text-primary)",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
