// src/components/ResultCard.jsx
import { useState } from "react";
import SeverityBadge from "./SeverityBadge";
import { ShieldCheck, ShieldAlert, Zap, Clock, ChevronDown, ChevronUp } from "lucide-react";

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 85 ? "#ef4444" : pct >= 65 ? "#f97316" : pct >= 40 ? "#f59e0b" : "#10b981";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        <span>Confidence</span>
        <span className="tabular-nums font-semibold" style={{ color: "var(--text-primary)" }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ResultCard({ result, latencyMs, payload }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  if (!result) return null;

  // ✅ Map backend field names to what we display
  const is_xss = result.is_xss;
  const confidence = result.xss_probability ?? result.confidence ?? 0;
  const risk_level = (result.severity ?? result.risk_level ?? (is_xss ? "HIGH" : "SAFE")).toLowerCase();
  const triggered_rules = result.triggered_features ?? result.triggered_rules ?? [];

  return (
    <div className="rounded-2xl overflow-hidden animate-fsu" style={{
      background: "var(--bg-card)",
      border: `2px solid ${is_xss ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
      boxShadow: is_xss ? "0 0 20px rgba(239,68,68,0.08)" : "0 0 20px rgba(16,185,129,0.08)",
    }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3" style={{
        background: is_xss ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
        borderBottom: `1px solid ${is_xss ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
      }}>
        {is_xss
          ? <ShieldAlert size={18} style={{ color: "#f87171" }} />
          : <ShieldCheck size={18} style={{ color: "#34d399" }} />}
        <span className="font-bold text-sm" style={{ color: is_xss ? "#f87171" : "#34d399" }}>
          {is_xss ? "XSS Threat Detected" : "Payload is Safe"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <SeverityBadge level={risk_level} />
          {latencyMs && (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <Clock size={11} />{latencyMs}ms
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {payload && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5"
              style={{ color: "var(--text-muted)" }}>Analyzed Payload</p>
            <code className="block text-xs rounded-xl px-3 py-2.5 break-all leading-relaxed max-h-24 overflow-y-auto"
              style={{ background: "#0d1117", color: "#a5f3c4", border: "1px solid var(--border)" }}>
              {payload}
            </code>
          </div>
        )}

        {/* ✅ Confidence bar now shows correct value */}
        <ConfidenceBar value={confidence} />

        {triggered_rules.length > 0 && (
          <div>
            <button onClick={() => setRulesOpen(p => !p)}
              className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-widest transition-colors"
              style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5">
                <Zap size={12} />Triggered Rules ({triggered_rules.length})
              </span>
              {rulesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {rulesOpen && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {triggered_rules.map((rule, i) => (
                  <span key={i} className="text-xs rounded-md px-2 py-0.5 font-mono"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {rule}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
