"use client";

// Users directory — lists the internal users the CRM assignee picker
// (and lead assignment) draws from. Data comes from GET /api/users
// (Hono, session-authenticated), which returns a bare array of
// { id, name, email } for active users only — never credential
// material. Read-only: there is no user-management API in Hono, so
// no create/edit/delete here; accounts are created through sign-up /
// admin invite, and roles are managed in the database.
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, Input, Badge } from "@repo/ui";
import { Users, Search } from "lucide-react";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

export default function UsersListPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !Array.isArray(json)) {
          throw new Error(json?.error || "Failed to fetch users");
        }
        return json as AdminUser[];
      })
      .then(setUsers)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to fetch users");
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1
          style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}
        >
          Users
        </h1>
        <Badge>{users.length} active</Badge>
      </div>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}
      >
        <Search
          size={16}
          style={{ color: "var(--text-muted)", flexShrink: 0 }}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ maxWidth: 320 }}
        />
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          Loading users…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          {users.length === 0 ? "No active users found" : "No users match your search"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((u) => (
            <Card key={u.id}>
              <CardContent
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-tertiary, var(--border))",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Users size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontWeight: 600, color: "var(--text-primary)" }}
                  >
                    {u.name || "Unnamed user"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.email}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {filtered.length} of {users.length} users
        {" — "}accounts are created through sign-up / admin invite; roles are
        managed in the database.
      </div>
    </div>
  );
}
