import { useState } from "react";
import { ChevronDown, ChevronUp, Check, Copy, Lightbulb, ShieldCheck } from "lucide-react";

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
    <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--bg-subtle)" }}>
      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>safe-rendering.js</span>
      <button onClick={copy} className="text-xs flex items-center gap-1" style={{ color: "var(--accent)" }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy example"}
      </button>
    </div>
    <pre className="p-3 text-xs overflow-x-auto leading-relaxed" style={{ background: "#0d1117", color: "#a5f3c4" }}><code>{code}</code></pre>
  </div>;
}

export default function AIPanel({ result }) {
  const [open, setOpen] = useState(true);
  if (!result) return null;
  const isXss = result.is_xss;
  const confidence = Math.round((result.xss_probability ?? 0) * 100);
  const explanation = isXss
    ? `The classifier marked this input as ${result.attack_type?.toLowerCase() || "suspicious"} with ${confidence}% XSS probability. The indicators below explain why it was flagged.`
    : `The classifier found no XSS signature (${confidence}% XSS probability). This is a screening result, so normal output encoding and validation still matter.`;
  const safeExample = `// Prefer textContent for untrusted values\nconst node = document.querySelector('#message');\nnode.textContent = userSuppliedValue;\n\n// Never: node.innerHTML = userSuppliedValue;`;

  return <section className="rounded-2xl overflow-hidden animate-fsu" style={{ background: "var(--bg-card)", border: "1px solid rgba(16,185,129,0.32)", boxShadow: "var(--glow)" }}>
    <button onClick={() => setOpen(value => !value)} className="w-full flex items-center gap-3 px-5 py-4 text-left" aria-expanded={open}>
      <div className="w-8 h-8 rounded-xl grid place-items-center" style={{ background: "var(--accent)" }}><ShieldCheck size={16} className="text-white" /></div>
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Explainable security guidance</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Local rules + model signals; no payload is sent to a third-party AI service.</p>
      </div>
      <div className="ml-auto" style={{ color: "var(--accent)" }}>{open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</div>
    </button>
    {open && <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="pt-4">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--accent)" }}>Assessment</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{explanation}</p>
      </div>
      {result.feature_labels?.length > 0 && <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Observed indicators</p>
        <div className="flex flex-wrap gap-2">{result.feature_labels.map(label => <span key={label} className="text-xs rounded-full px-2.5 py-1" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{label}</span>)}</div>
      </div>}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}><Lightbulb size={13} />Recommended actions</p>
        <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>{(result.recommendations || []).map(item => <li key={item}>• {item}</li>)}</ul>
      </div>
      {isXss && <CodeBlock code={safeExample} />}
    </div>}
  </section>;
}
