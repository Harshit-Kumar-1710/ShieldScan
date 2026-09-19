import { useState, useMemo } from "react";
import { Code, Copy, Check, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

function decodeEntitiesSafely(str) {
  try {
    const doc = new DOMParser().parseFromString(str, "text/html");
    return doc.documentElement.textContent || str;
  } catch {
    return str;
  }
}

function decodeUnicodeEscapes(str) {
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  } catch {
    return str;
  }
}

function decodeUrlSafely(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

const SUSPICIOUS_PATTERNS = [
  { label: "Script tag", regex: /<script/i },
  { label: "Inline event handler", regex: /on\w+\s*=/i },
  { label: "javascript: URI", regex: /javascript:/i },
  { label: "alert() execution", regex: /alert\s*\(/i },
  { label: "eval() dynamic code", regex: /eval\s*\(/i },
  { label: "document access", regex: /document\./i },
  { label: "window access", regex: /window\./i },
  { label: "iframe tag", regex: /<iframe/i },
  { label: "data: URI", regex: /data:/i },
  { label: "vbscript: URI", regex: /vbscript:/i },
];

export default function PayloadDecoder({ payload }) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const decodedForms = useMemo(() => {
    if (!payload) return null;
    const urlDec = decodeUrlSafely(payload);
    const htmlDec = decodeEntitiesSafely(payload);
    const unicodeDec = decodeUnicodeEscapes(payload);

    // Fully canonicalized decode (URL -> Unicode -> Entity)
    const fullCanonical = decodeEntitiesSafely(decodeUnicodeEscapes(decodeUrlSafely(payload)));

    const originalSuspicious = SUSPICIOUS_PATTERNS.filter(p => p.regex.test(payload));
    const decodedSuspicious = SUSPICIOUS_PATTERNS.filter(p => p.regex.test(fullCanonical));

    const newlyExposed = decodedSuspicious.filter(
      d => !originalSuspicious.some(o => o.label === d.label)
    );

    const isObfuscated = payload !== fullCanonical;

    return {
      urlDec,
      htmlDec,
      unicodeDec,
      fullCanonical,
      isObfuscated,
      originalSignals: originalSuspicious.map(s => s.label),
      decodedSignals: decodedSuspicious.map(s => s.label),
      newlyExposed: newlyExposed.map(s => s.label),
    };
  }, [payload]);

  if (!payload || !decodedForms) return null;

  const handleCopy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
        style={{ background: open ? "var(--bg-subtle)" : "transparent" }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Code size={15} style={{ color: "var(--accent)" }} />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Safe Payload Decoder
            </span>
            <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {decodedForms.isObfuscated ? "Obfuscation / Encoding detected" : "Plain / Unencoded format"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {decodedForms.newlyExposed.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-md font-semibold flex items-center gap-1"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <ShieldAlert size={11} />
              +{decodedForms.newlyExposed.length} hidden signals
            </span>
          )}
          {open ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-3.5" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-start gap-2 text-xs p-3 rounded-lg" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            {decodedForms.newlyExposed.length > 0 ? (
              <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {decodedForms.newlyExposed.length > 0
                  ? `Decoding exposed hidden malicious patterns: ${decodedForms.newlyExposed.join(", ")}`
                  : decodedForms.isObfuscated
                  ? "Encoded characters detected, but no new hidden XSS primitives were unlocked upon decoding."
                  : "Input was already in canonical plaintext; decoding produced identical output."}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Rendered safely as text in memory without HTML parsing or script execution.
              </p>
            </div>
          </div>

          {[
            { key: "url", label: "URL Decoded", value: decodedForms.urlDec },
            { key: "html", label: "HTML Entity Decoded", value: decodedForms.htmlDec },
            { key: "unicode", label: "Unicode Unescaped", value: decodedForms.unicodeDec },
            { key: "canonical", label: "Full Canonicalized Form", value: decodedForms.fullCanonical },
          ].map(row => (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                <button
                  onClick={() => handleCopy(row.key, row.value)}
                  className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                  style={{ color: "var(--accent)" }}
                >
                  {copiedKey === row.key ? <Check size={11} /> : <Copy size={11} />}
                  {copiedKey === row.key ? "Copied" : "Copy"}
                </button>
              </div>
              <code
                className="block text-xs font-mono rounded-lg p-2.5 break-all max-h-24 overflow-y-auto"
                style={{ background: "#0d1117", color: "#a5f3c4", border: "1px solid var(--border)" }}
              >
                {row.value}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
