"use client";

import { Button, Card, CardContent, Badge } from "@repo/ui";
import { useState } from "react";

interface ValidationIssue {
  entityType: string;
  entityId: string;
  field: string;
  severity: "warning" | "error";
  message: string;
}

interface ValidationReport {
  total: number;
  warnings: number;
  errors: number;
  issues: ValidationIssue[];
}

export default function ValidationPage() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seo/validate");
      if (!res.ok) throw new Error("Validation request failed");
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>SEO Validation</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Run validation checks against your SEO metadata and redirects.
      </p>

      {!report && !loading && !error && (
        <Card>
          <CardContent style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
              Click the button below to run a full SEO validation scan.
            </p>
            <Button onClick={runValidation}>Run Validation</Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Running validation...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 6, backgroundColor: "var(--bg-danger, #fef2f2)", color: "var(--text-danger, #dc2626)", fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {report && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{report.total}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Total Issues</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{report.errors}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Errors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{report.warnings}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Warnings</div>
              </CardContent>
            </Card>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <Button onClick={runValidation} variant="outline" style={{ fontSize: 13 }}>
                Re-run
              </Button>
            </div>
          </div>

          {report.issues.length === 0 ? (
            <Card>
              <CardContent style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>No issues found!</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>All SEO metadata looks good.</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {(["error", "warning"] as const).map((severity) => {
                const items = report.issues.filter((i) => i.severity === severity);
                if (items.length === 0) return null;
                return (
                  <div key={severity} style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)", textTransform: "capitalize" }}>
                      {severity === "error" ? `Errors (${items.length})` : `Warnings (${items.length})`}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {items.map((issue, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 6,
                            border: `1px solid ${severity === "error" ? "#fecaca" : "#fde68a"}`,
                            backgroundColor: severity === "error" ? "rgba(220,38,38,0.04)" : "rgba(245,158,11,0.04)",
                            fontSize: 13,
                            color: "var(--text-primary)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <Badge variant={severity === "error" ? "destructive" : "secondary"} style={{ fontSize: 10 }}>
                              {severity === "error" ? "ERROR" : "WARNING"}
                            </Badge>
                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                              {issue.entityType}/{issue.entityId}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>— {issue.field}</span>
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{issue.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
