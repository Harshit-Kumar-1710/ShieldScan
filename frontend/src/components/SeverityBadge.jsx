// src/components/SeverityBadge.jsx
const SEVERITY_CONFIG = {
  critical: { label: "Critical", bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.3)", dot: "#ef4444" },
  high:     { label: "High",     bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "rgba(249,115,22,0.3)", dot: "#f97316" },
  medium:   { label: "Medium",   bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.3)", dot: "#f59e0b" },
  low:      { label: "Low",      bg: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "rgba(59,130,246,0.3)", dot: "#3b82f6" },
  safe:     { label: "Safe",     bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.3)", dot: "#10b981" },
};

export default function SeverityBadge({ level = "safe", size = "md" }) {
  const key = level?.toLowerCase();
  const cfg = SEVERITY_CONFIG[key] || SEVERITY_CONFIG.safe;
  const sizeClasses = { sm: "text-xs px-2 py-0.5 gap-1", md: "text-xs px-2.5 py-1 gap-1.5", lg: "text-sm px-3 py-1.5 gap-2" }[size];
  return (
    <span className={`inline-flex items-center font-semibold rounded-full tracking-wide ${sizeClasses}`}
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}
