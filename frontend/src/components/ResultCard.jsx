// src/components/ResultCard.jsx
import { useState } from "react";
import SeverityBadge from "./SeverityBadge";
import PayloadDecoder from "./PayloadDecoder";
import OWASPDefenseMap from "./OWASPDefenseMap";
import MLLimitationsPanel from "./MLLimitationsPanel";
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  ThumbsUp,
  ThumbsDown,
  Check,
  Info
} from "lucide-react";

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
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function updateHistoryFeedback(payload, feedbackVal) {
  try {
    const raw = JSON.parse(localStorage.getItem("shieldscan_history") || "[]");
    if (raw.length > 0) {
      // Update most recent entry matching this payload
      const idx = raw.findIndex(r => r.payload === payload);
      if (idx !== -1) {
        raw[idx].analyst_feedback = feedbackVal;
        localStorage.setItem("shieldscan_history", JSON.stringify(raw));
      }
    }
  } catch {}
}

export default function ResultCard({ result, latencyMs, payload }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  if (!result) return null;

  const is_xss = result.is_xss;
  const confidence = result.xss_probability ?? result.confidence ?? 0;
  const risk_level = (result.severity ?? result.risk_level ?? (is_xss ? "HIGH" : "SAFE")).toLowerCase();
  const triggered_rules = result.triggered_features ?? result.triggered_rules ?? [];

  const handleFeedback = (val) => {
    const nextVal = feedback === val ? null : val;
    setFeedback(nextVal);
    updateHistoryFeedback(payload, nextVal);
  };

  const handleDownloadJson = () => {
    const reportData = {
      scan_id: `SS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: payload || result.payload,
      model: {
        name: "CalibratedLinearSVC",
        version: "1.1.0",
        engine: "Character TF-IDF (2-5 grams) + 18 Security Indicators",
      },
      ml_result: {
        is_xss: result.is_xss,
        xss_probability: result.xss_probability,
        severity: result.severity,
        attack_type: result.attack_type,
        inference_ms: latencyMs || result.inference_ms,
        triggered_features: result.triggered_features || [],
        feature_labels: result.feature_labels || [],
        recommendations: result.recommendations || [],
      },
      analyst_feedback: feedback || "unreviewed",
      disclaimer: "ShieldScan is a pre-execution screening layer. Contextual output encoding and sanitization are always required.",
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shieldscan_analysis_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl overflow-hidden animate-fsu"
        style={{
          background: "var(--bg-card)",
          border: `2px solid ${is_xss ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          boxShadow: is_xss ? "0 0 20px rgba(239,68,68,0.08)" : "0 0 20px rgba(16,185,129,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center gap-3 flex-wrap"
          style={{
            background: is_xss ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
            borderBottom: `1px solid ${is_xss ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
          }}
        >
          {is_xss ? (
            <ShieldAlert size={18} style={{ color: "#f87171" }} />
          ) : (
            <ShieldCheck size={18} style={{ color: "#34d399" }} />
          )}
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
            <button
              onClick={handleDownloadJson}
              className="btn-ghost flex items-center gap-1 text-xs px-2.5 py-1"
              title="Download structured JSON report"
            >
              {downloaded ? <Check size={12} className="text-emerald-400" /> : <Download size={12} />}
              {downloaded ? "Saved" : "JSON"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {payload && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                Analyzed Payload
              </p>
              <code
                className="block text-xs rounded-xl px-3 py-2.5 break-all leading-relaxed max-h-24 overflow-y-auto"
                style={{ background: "#0d1117", color: "#a5f3c4", border: "1px solid var(--border)" }}
              >
                {payload}
              </code>
            </div>
          )}

          <ConfidenceBar value={confidence} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Detection type</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                {result.attack_type || (is_xss ? "Suspicious input" : "No XSS pattern detected")}
              </p>
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Decision basis</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                {triggered_rules.length ? `${triggered_rules.length} security signals` : "ML pattern analysis"}
              </p>
            </div>
          </div>

          {triggered_rules.length > 0 && (
            <div>
              <button
                onClick={() => setRulesOpen(p => !p)}
                className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-widest transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="flex items-center gap-1.5">
                  <Zap size={12} />Triggered Rules ({triggered_rules.length})
                </span>
                {rulesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {rulesOpen && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {triggered_rules.map((rule, i) => (
                    <span
                      key={i}
                      className="text-xs rounded-md px-2 py-0.5 font-mono"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analyst Feedback Section */}
          <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Info size={12} />
              <span>Analyst Feedback:</span>
              <span className="opacity-80">(Saved locally for review, not automatic retraining)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback("correct")}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all"
                style={{
                  background: feedback === "correct" ? "rgba(16,185,129,0.15)" : "transparent",
                  color: feedback === "correct" ? "#34d399" : "var(--text-muted)",
                  borderColor: feedback === "correct" ? "#34d399" : "var(--border)",
                }}
              >
                <ThumbsUp size={12} />
                Correct Detection
              </button>
              <button
                onClick={() => handleFeedback("incorrect")}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all"
                style={{
                  background: feedback === "incorrect" ? "rgba(239,68,68,0.15)" : "transparent",
                  color: feedback === "incorrect" ? "#f87171" : "var(--text-muted)",
                  borderColor: feedback === "incorrect" ? "#f87171" : "var(--border)",
                }}
              >
                <ThumbsDown size={12} />
                Incorrect Detection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payload Decoder */}
      <PayloadDecoder payload={payload} />

      {/* OWASP Defense Map */}
      <OWASPDefenseMap attackType={result.attack_type} isXss={result.is_xss} />

      {/* ML Capabilities & Limitations */}
      <MLLimitationsPanel />
    </div>
  );
}
