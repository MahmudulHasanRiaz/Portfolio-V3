"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Card, CardContent, Textarea } from "@repo/ui";
import { Send, MessageSquare } from "lucide-react";

interface Message {
  id: string; projectId: string; senderType: string;
  message: string; createdAt: string | null; isRead: boolean | null;
}

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((res) => setMessages(res.messages || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Messages</h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16, maxHeight: 500, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <MessageSquare size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No messages yet. Send a message to start the conversation.</div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: m.senderType === "client" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%", padding: "10px 16px", borderRadius: 12,
                      backgroundColor: m.senderType === "client" ? "var(--brand)" : "var(--muted)",
                      color: m.senderType === "client" ? "var(--brand-foreground)" : "var(--text-primary)",
                      fontSize: 14, lineHeight: 1.5,
                    }}
                  >
                    {m.message}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {m.senderType === "client" ? "You" : "Admin"} · {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSend} style={{ display: "flex", gap: 8 }}>
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          rows={2}
          style={{ flex: 1 }}
        />
        <Button type="submit" disabled={sending || !newMessage.trim()} style={{ alignSelf: "flex-end" }}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
