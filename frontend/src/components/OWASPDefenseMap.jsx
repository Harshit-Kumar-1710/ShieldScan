import { useState } from "react";
import { ShieldAlert, Check, Copy, Layers, Lock, FileCode, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

const DEFENSE_MAP = {
  "Script injection": {
    title: "Script Tag & Dynamic Execution Defense",
    owaspRule: "OWASP Rule #1 & #3: Context-Aware Output Encoding & Safe Sinks",
    controls: [
      { name: "Context-Aware Encoding", desc: "Encode HTML special chars (<, >, &, \", ') before inserting untrusted data into HTML body." },
      { name: "Sink Hardening", desc: "Never assign untrusted input to innerHTML, outerHTML, or document.write(). Use textContent or React JSX bindings." },
      { name: "Content Security Policy (CSP)", desc: "Enforce script-src 'self' and disallow 'unsafe-inline' and 'unsafe-eval' to neutralize injected script execution." }
    ],
    secureCode: `// SECURE: Use textContent or framework bindings (React / Vue)
const element = document.getElementById('user-comment');
element.textContent = untrustedInput; // Browser treats as inert string

// React JSX automatically applies context-aware escaping:
function Comment({ text }) {
  return <div className="comment">{text}</div>; // Safe
}`
  },
  "Event-handler injection": {
    title: "Inline Attribute & Handler Defense",
    owaspRule: "OWASP Rule #2: Attribute Context Output Encoding",
    controls: [
      { name: "Attribute Encoding", desc: "Always quote attributes and HTML-attribute-encode all dynamic values." },
      { name: "Framework Event Binding", desc: "Attach event listeners via addEventListener() in JavaScript rather than dynamic on* string concatenation." },
      { name: "DOMPurify Attribute Allowlist", desc: "Strip all inline event handler attributes (onload, onerror, onclick, onmouseover) using a strict sanitizer." }
    ],
    secureCode: `// SECURE: Add event listeners programmatically in JS
const button = document.createElement('button');
button.textContent = 'Submit';
button.addEventListener('click', handleUserAction);

// When rendering dynamic HTML, sanitize with DOMPurify:
import DOMPurify from 'dompurify';
const cleanHtml = DOMPurify.sanitize(untrustedHtml, {
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
});`
  },
  "Protocol injection": {
    title: "Dangerous URL Scheme & Protocol Defense",
    owaspRule: "OWASP Rule #4: JavaScript & URI Scheme Allowlisting",
    controls: [
      { name: "Protocol Allowlist", desc: "Explicitly allowlist valid URL protocols (e.g. https:, http:, mailto:). Strictly reject javascript:, data:, and vbscript: schemes." },
      { name: "URL Parsing & Validation", desc: "Use the URL constructor (new URL(val)) to parse and verify the protocol before setting href or src attributes." },
      { name: "Link Hardening", desc: "Add rel=\"noopener noreferrer\" to external links to prevent window.opener tabnabbing." }
    ],
    secureCode: `// SECURE: Protocol Validation Utility
function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:'];
    if (ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch (err) {
    // Malformed URL
  }
  return '#'; // Fallback to safe inert reference
}`
  },
  "Encoded or obfuscated payload": {
    title: "Obfuscation & Canonicalization Defense",
    owaspRule: "OWASP Defense Principle: Decode Once, Validate, Encode for Context",
    controls: [
      { name: "Single-Pass Decoding", desc: "Decode encoded input exactly once at the input boundary before validation. Avoid decoding after sanitization." },
      { name: "HTML Sanitizer Pipeline", desc: "Feed canonical input into an established HTML parser sanitizer (DOMPurify) before template injection." },
      { name: "WAF Pre-Screening", desc: "Employ fast pattern classifiers like ShieldScan to flag multi-layered encoding anomalies." }
    ],
    secureCode: `// SECURE: Canonicalize once, then sanitize
import DOMPurify from 'dompurify';

function processUserSubmission(rawEncodedInput) {
  // Decode standard URI components once
  let decoded;
  try {
    decoded = decodeURIComponent(rawEncodedInput);
  } catch {
    decoded = rawEncodedInput;
  }
  // Sanitize markup using configured DOMPurify
  return DOMPurify.sanitize(decoded, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'] });
}`
  },
  "Markup injection": {
    title: "HTML Structure & Iframe Injection Defense",
    owaspRule: "OWASP Rule #5: HTML Sanitization & Framing Control",
    controls: [
      { name: "Strict Tag Allowlist", desc: "Permit only safe typographical tags (<b>, <i>, <p>). Strip <iframe>, <object>, <embed>, and <form> tags." },
      { name: "Frame-Ancestors CSP", desc: "Set Content-Security-Policy: frame-ancestors 'none' to prevent clickjacking and framing attacks." },
      { name: "Sandbox Attributes", desc: "When iframes are required, apply the sandbox attribute (e.g. sandbox=\"allow-scripts\")." }
    ],
    secureCode: `// SECURE: Restrict markup tags strictly
import DOMPurify from 'dompurify';

const sanitizedMarkup = DOMPurify.sanitize(userMarkup, {
  ALLOWED_TAGS: ['b', 'i', 'p', 'span'],
  ALLOWED_ATTR: ['class']
});

// In HTTP Response Headers:
// Content-Security-Policy: frame-ancestors 'none'; object-src 'none';`
  },
  "default": {
    title: "General Defense-in-Depth for Untrusted Input",
    owaspRule: "OWASP Top 10 A03:2021 — Injection Prevention",
    controls: [
      { name: "Output Encoding", desc: "Always encode data at the rendering boundary according to the specific context (HTML, JS, CSS, URL)." },
      { name: "Strict CSP", desc: "Deploy Content-Security-Policy with default-src 'self' to limit blast radius of any missed bypasses." },
      { name: "Input Validation", desc: "Enforce length boundaries, character whitelists, and type validation on the server." }
    ],
    secureCode: `// Standard Defense Checklist:
// 1. Never trust client input — validate on the backend.
// 2. Encode dynamically rendered values in your frontend framework.
// 3. Set Content-Security-Policy: default-src 'self'; script-src 'self';
// 4. Set HttpOnly and SameSite=Strict cookies to protect session tokens.`
  }
};

export default function OWASPDefenseMap({ attackType, isXss }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const matchedDefense = DEFENSE_MAP[attackType] || DEFENSE_MAP["default"];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(matchedDefense.secureCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
        style={{ background: open ? "var(--bg-subtle)" : "transparent" }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Lock size={15} style={{ color: "var(--accent)" }} />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              OWASP Defense Map
            </span>
            <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {matchedDefense.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="p-3 rounded-lg" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold text-emerald-400">{matchedDefense.owaspRule}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {isXss
                ? `Mitigations tailored to address the detected ${attackType} pattern.`
                : "Standard defense-in-depth principles to prevent XSS across the application lifecycle."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {matchedDefense.controls.map(ctrl => (
              <div key={ctrl.name} className="p-3 rounded-lg" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={13} style={{ color: "var(--accent)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{ctrl.name}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{ctrl.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "var(--bg-subtle)" }}>
              <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                <FileCode size={12} />
                secure-remediation.js
              </div>
              <button
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: "var(--accent)" }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
            <pre className="p-3 text-xs overflow-x-auto leading-relaxed font-mono" style={{ background: "#0d1117", color: "#a5f3c4" }}>
              <code>{matchedDefense.secureCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
