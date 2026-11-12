import { Skeleton } from "@repo/ui";

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton style={{ width: 200, height: 28, marginBottom: 8, borderRadius: 4 }} />
      <Skeleton style={{ width: 300, height: 16, marginBottom: 24, borderRadius: 4 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 24,
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <Skeleton style={{ width: 100, height: 14, marginBottom: 8, borderRadius: 4 }} />
            <Skeleton style={{ width: 60, height: 28, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
