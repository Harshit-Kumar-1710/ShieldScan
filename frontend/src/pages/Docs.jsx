// src/pages/Docs.jsx
import { useState } from "react";
import {
  BookOpen,
  Cpu,
  Shield,
  Layers,
  FileCode,
  CheckCircle2,
  Terminal,
  Copy,
  Check
} from "lucide-react";

const FEATURE_EXPLANATIONS = [
  { name: "has_script_tag", label: "Script Tag", desc: "Detects <script tag openers to prevent dynamic code injection." },
  { name: "has_javascript_protocol", label: "javascript: URI", desc: "Detects inline protocol injection inside href, src, or iframe attributes." },
  { name: "has_event_handler", label: "Inline Event Handler", desc: "Flags inline event handler triggers (e.g. onerror=, onload=, onclick=)." },
  { name: "has_alert", label: "alert() Call", desc: "Matches JavaScript alert() diagnostic functions common in proof-of-concept exploits." },
  { name: "has_eval", label: "Dynamic eval()", desc: "Identifies dynamic code string evaluation (eval(), setTimeout string execution)." },
  { name: "has_document_access", label: "Document Object Access", desc: "Catches document.cookie, document.location, and document.write accesses." },
  { name: "has_window_access", label: "Window Object Access", desc: "Detects window.location or window.open redirection attempts." },
  { name: "has_remote_src", label: "Remote Resource Source", desc: "Detects src attributes loading external scripts from http/https domains." },
  { name: "has_url_encoding", label: "URL Percent Encoding", desc: "Detects %XX sequences attempting to evade static string pattern matchers." },
  { name: "has_html_entity", label: "HTML Entity Encoding", desc: "Flags &#xHH; or &#NNN; entity encodings used to conceal markup tags." },
  { name: "has_unicode_escape", label: "Unicode Escapes", desc: "Detects \\uXXXX hexadecimal unicode escape sequences." },
  { name: "has_base64", label: "Base64 Marker", desc: "Detects base64 encoding identifiers used in data: URI exploits." },
  { name: "has_fromcharcode", label: "fromCharCode()", desc: "Catches String.fromCharCode() construction used to bypass quote filters." },
  { name: "has_iframe", label: "Iframe Tag", desc: "Identifies <iframe> injection for framing and clickjacking attacks." },
  { name: "has_img_src", label: "Image Source Markup", desc: "Detects <img src tags frequently paired with onerror fallback triggers." },
  { name: "has_data_uri", label: "data: URI Scheme", desc: "Matches data:text/html or data:application/javascript URI vectors." },
  { name: "has_vbscript", label: "vbscript: URI", desc: "Matches legacy ActiveScripting protocol injection vectors." },
  { name: "tag_density_ratio", label: "Tag Density Ratio", desc: "Calculates ratio of markup delimiters (<...>) relative to string length." },
];

export default function Docs() {
  const [copiedKey, setCopiedKey] = useState(null);

  const copyCode = async (key, code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  };

  const middlewareExample = `# FastAPI Screening Middleware Integration
from fastapi import Request, HTTPException
import requests

async def shieldscan_filter(request: Request, call_next):
    if request.method in ["POST", "PUT"]:
        body = await request.body()
        payload = body.decode("utf-8", errors="ignore")
        if payload:
            res = requests.post("http://localhost:8000/predict", json={"payload": payload[:2000]}).json()
            if res.get("is_xss") and res.get("severity") in ["HIGH", "CRITICAL"]:
                raise HTTPException(status_code=400, detail="XSS pattern detected by ShieldScan")
    return await call_next(request)`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            System Architecture & Technical Docs
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Deep-dive documentation on feature engineering, model calibration, and defensive integration.
        </p>
      </div>

      {/* Feature Engineering Breakdown */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu size={16} style={{ color: "var(--accent)" }} />
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            The 18 Handcrafted Cybersecurity Features
          </h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          ShieldScan extracts 3,000 character-level TF-IDF n-grams (2–5 grams) and combines them with 18 specialized security features engineered specifically to catch obfuscation, encoding evasions, and dangerous JavaScript sinks:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {FEATURE_EXPLANATIONS.map((f, i) => (
            <div key={f.name} className="card-subtle p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{f.label}</span>
                <span className="text-[10px] font-mono text-muted" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
              </div>
              <code className="text-[11px] font-mono block text-emerald-400">{f.name}</code>
              <p className="text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Code Pattern */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={16} style={{ color: "var(--accent)" }} />
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Pre-Execution Gateway Middleware Pattern
            </h2>
          </div>
          <button
            onClick={() => copyCode("middleware", middlewareExample)}
            className="text-xs btn-ghost px-2.5 py-1 flex items-center gap-1"
          >
            {copiedKey === "middleware" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copiedKey === "middleware" ? "Copied" : "Copy code"}
          </button>
        </div>

        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Because ShieldScan executes in sub-millisecond time (~0.005 ms/payload), it can be deployed directly into API middleware to screen input before database persistence or template rendering:
        </p>

        <pre className="p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed" style={{ background: "#0d1117", color: "#a5f3c4", border: "1px solid var(--border)" }}>
          <code>{middlewareExample}</code>
        </pre>
      </div>
    </div>
  );
}
