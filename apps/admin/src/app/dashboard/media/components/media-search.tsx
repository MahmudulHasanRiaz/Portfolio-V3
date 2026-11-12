"use client";

import { Input } from "@repo/ui";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MediaSearch({ value, onChange, placeholder = "Search name, alt text or slug…" }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      position: "relative",
      flex: 1,
      maxWidth: 400,
    }}>
      <Search size={16} style={{
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--text-muted)",
        pointerEvents: "none",
      }} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          paddingLeft: 36,
          paddingRight: value ? 36 : 12,
          borderColor: focused ? "var(--accent-primary)" : "var(--border-color)",
          transition: "border-color 0.15s",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: 4,
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
