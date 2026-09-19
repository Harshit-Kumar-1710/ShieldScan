import { useState } from "react";
import { AlertTriangle, Info, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

export default function MLLimitationsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
        style={{ background: open ? "var(--bg-subtle)" : "transparent" }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Info size={15} style={{ color: "var(--accent)" }} />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              ML Capabilities & Limitations
            </span>
            <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Screening layer vs. Defense-in-Depth
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-3.5 text-xs leading-relaxed" style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 font-bold mb-1" style={{ color: "#34d399" }}>
                <ShieldCheck size={14} />
                What the Local ML Model Does Well
              </div>
              <ul className="space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <li>• Extremely low inference latency (<strong>~0.005 ms/payload</strong>).</li>
                <li>• Recognizes character 2–5 gram n-grams and 18 handcrafted XSS signatures.</li>
                <li>• Effective screening filter against malformed markup, protocol tricks, and event-handler obfuscations.</li>
                <li>• 100% local, privacy-preserving execution with no third-party data transmission.</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 font-bold mb-1" style={{ color: "#f87171" }}>
                <AlertTriangle size={14} />
                Known Limitations & Why Defense-in-Depth is Required
              </div>
              <ul className="space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <li>• <strong>Context Agnostic:</strong> The classifier evaluates strings in isolation, not how the destination application renders them (e.g., inside <code>&lt;script&gt;</code> blocks vs HTML comments).</li>
                <li>• <strong>No Silver Bullet:</strong> Statistical classifiers cannot replace server-side contextual output encoding, DOMPurify sanitization, and Content Security Policy (CSP).</li>
                <li>• <strong>Evolving Evasions:</strong> Complex multi-stage DOM mutations or esoteric browser parsers may occasionally evade static feature extraction.</li>
              </ul>
            </div>
          </div>

          <div className="p-2.5 rounded-lg text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="font-semibold text-emerald-400">Security Architecture Principle: </span>
            <span style={{ color: "var(--text-secondary)" }}>
              Use ShieldScan as a high-throughput, early-triage WAF/Gateway screening layer, while maintaining strict output encoding and sanitization at the presentation boundary.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
