// src/components/AIPanel.jsx
import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, Loader2, AlertCircle } from "lucide-react";

async function fetchAIExplanation(payload, result) {
  const prompt = `You are a web security expert analyzing an XSS detection result.
Payload: \`${payload}\`
Result: Is XSS: ${result?.is_xss ? "YES" : "NO"}, Risk: ${result?.risk_level}, Confidence: ${result?.confidence ? Math.round(result.confidence * 100) + "%" : "unknown"}, Triggered Rules: ${result?.triggered_rules?.join(", ") || "none"}

Respond ONLY with valid JSON (no markdown, no preamble):
{"summary":"1-2 sentence explanation","attack_type":"XSS type or N/A","how_it_works":"2-3 sentences on mechanism","impact":"potential impact or None","fix":{"description":"what fix is needed","code":"short code snippet showing the fix"}}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden mt-2" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "#0d1117" }}>
        <span className="text-xs font-mono" style={{ color: "#475569" }}>fix.js</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 text-xs transition-colors" style={{ color: copied ? "#34d399" : "#475569" }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto leading-relaxed" style={{ background: "#090e1a", color: "#a5f3c4" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function AIPanel({ payload, result }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleToggle = async () => {
    if (!open && !analysis && !loading) {
      setLoading(true); setError(null);
      try { setAnalysis(await fetchAIExplanation(payload, result)); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }
    setOpen(p => !p);
  };

  return (
    <div className="rounded-2xl overflow-hidden animate-fsu" style={{
      background: "var(--bg-card)",
      border: "1px solid rgba(139,92,246,0.3)",
      boxShadow: "0 0 20px rgba(139,92,246,0.06)",
    }}>
      <button onClick={handleToggle} className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors"
        style={{ borderBottom: open ? "1px solid rgba(139,92,246,0.2)" : "none" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#7c3aed" }}>
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>AI Security Analysis</p>
          <p className="text-xs" style={{ color: "#6d28d9" }}>
            {analysis ? "Claude's explanation & fix ready" : "Click to get Claude's explanation & fix"}
          </p>
        </div>
        <div className="ml-auto">
          {loading ? <Loader2 size={16} className="animate-spin" style={{ color: "#7c3aed" }} />
            : open ? <ChevronUp size={16} style={{ color: "#7c3aed" }} />
            : <ChevronDown size={16} style={{ color: "#7c3aed" }} />}
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div><p className="text-xs font-semibold">Analysis failed</p><p className="text-xs mt-0.5 opacity-80">{error}</p></div>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center py-6 gap-3" style={{ color: "#a78bfa" }}>
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm font-medium">Analyzing with Claude...</p>
            </div>
          )}
          {analysis && !loading && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#7c3aed" }}>Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.summary}</p>
              </div>
              {analysis.attack_type && analysis.attack_type !== "N/A" && (
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: "Attack Type", value: analysis.attack_type }, { label: "Impact", value: analysis.impact }].map(r => (
                    <div key={r.label} className="rounded-xl p-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#7c3aed" }}>{r.label}</p>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.value}</p>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#7c3aed" }}>How It Works</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.how_it_works}</p>
              </div>
              {analysis.fix && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#10b981" }}>Recommended Fix</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{analysis.fix.description}</p>
                  {analysis.fix.code && <CodeBlock code={analysis.fix.code} />}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
