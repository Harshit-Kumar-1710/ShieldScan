// src/pages/LearnHub.jsx
import { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  RotateCw,
  CheckCircle2,
  Lock,
  Cpu,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  ChevronRight
} from "lucide-react";

const FLASHCARDS = [
  {
    id: 1,
    category: "xss",
    tag: "XSS Taxonomy",
    question: "What is the difference between Reflected, Stored, and DOM-based XSS?",
    summary: "How the malicious script enters and travels through the application.",
    answer: "1. Reflected XSS: Payload comes from the current HTTP request (e.g., query params/search terms) and is reflected immediately in the server response.\n2. Stored (Persistent) XSS: Payload is saved permanently in the database (e.g., user comments/profiles) and served to all future visitors.\n3. DOM-based XSS: Vulnerability exists entirely on the client-side JavaScript execution, where unsanitized input reaches a dangerous DOM sink (e.g., location.hash -> innerHTML).",
    interviewTip: "Emphasize that ShieldScan screens input at the boundary to catch both Reflected and Stored payloads before database insertion or rendering."
  },
  {
    id: 2,
    category: "ml",
    tag: "ML & Model Selection",
    question: "Why prioritize False-Negative Rate (FNR) over Accuracy in security ML?",
    summary: "The asymmetry of cybersecurity risks.",
    answer: "In cybersecurity, a False Positive (safe text flagged as suspicious) causes minor analyst triage delay. However, a False Negative (a missed XSS attack) allows arbitrary JavaScript execution in user browsers, leading to session hijacking, credential theft, and account takeover.\n\nCalibrated Linear SVM achieved a 0.20% False-Negative Rate (a 39% reduction compared to Random Forest's 0.33%), making it far superior for active security screening.",
    interviewTip: "Cite ShieldScan's benchmark: Calibrated Linear SVM had the lowest FNR (0.20%) and lowest inference latency (0.005 ms)."
  },
  {
    id: 3,
    category: "owasp",
    tag: "OWASP Defenses",
    question: "Why is Context-Aware Output Encoding required instead of a single escaping rule?",
    summary: "Browsers parse different HTML contexts with different parsers.",
    answer: "An input inside an HTML body (`<div>user</div>`) requires standard HTML entity encoding (`&lt;`, `&gt;`). However, that same encoding fails inside an HTML attribute (`<input value=\"user\">`) where quotes must be escaped, or inside JavaScript execution contexts (`<script>var x = 'user';</script>`) where Unicode/hex escaping is required.\n\nOutput encoding must match the exact syntax context where the untrusted value is rendered.",
    interviewTip: "Mention that ShieldScan provides specific context-aware remediation snippets in its OWASP Defense Map."
  },
  {
    id: 4,
    category: "ml",
    tag: "ML & Architecture",
    question: "Why use Calibrated Linear SVM over Deep Learning / Transformers for XSS?",
    summary: "Balancing latency, interpretability, and resource overhead.",
    answer: "1. Sub-Millisecond Latency: Calibrated Linear SVM executes in ~0.005 ms per payload (over 1000× faster than LLMs/BERT), making it viable for high-throughput gateway screening.\n2. Interpretable Features: Combines 3,000 character 2-5 n-grams with 18 explicit security signals (e.g. onerror, eval, script tags), allowing full explainability.\n3. Zero Dependency Overhead: Operates locally without GPUs or third-party cloud connections.",
    interviewTip: "Explain Platt Scaling calibration: SVM decision distances are converted into true calibrated probabilities (0.0 to 1.0)."
  },
  {
    id: 5,
    category: "owasp",
    tag: "OWASP Defenses",
    question: "How does Content Security Policy (CSP) provide defense-in-depth?",
    summary: "Restricting browser execution capabilities even if injection occurs.",
    answer: "CSP is an HTTP response header that tells the browser which sources of executable code are trusted. By specifying:\n`Content-Security-Policy: script-src 'self' 'nonce-xyz'; object-src 'none';`\n\nthe browser refuses to execute inline scripts (like `<script>alert(1)</script>`) or inline event handlers (`onerror=`), rendering injected payloads inert even if sanitization is bypassed.",
    interviewTip: "Position ML as an early triage filter and CSP as a vital layer of defense-in-depth."
  },
  {
    id: 6,
    category: "ai",
    tag: "AI & Privacy",
    question: "Why should an LLM be an Advisory Assistant rather than the Primary Detector?",
    summary: "Overcoming LLM non-determinism, latency, and data privacy risks.",
    answer: "1. Determinism: Supervised ML gives repeatable, mathematical confidence scores; LLMs can hallucinate or produce non-deterministic verdicts.\n2. Latency: Local ML takes ~0.005 ms; LLM API calls take 1,500-3,000 ms.\n3. Privacy & Compliance: Enterprise security policies forbid sending unvetted customer payloads to third-party AI APIs. Keeping local ML primary preserves zero-trust privacy, with external AI gated behind user consent.",
    interviewTip: "Demonstrate ShieldScan's side-by-side ML vs AI comparison and explain how disagreements signal manual analyst triage."
  }
];

export default function LearnHub() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [flippedCards, setFlippedCards] = useState({});
  const [masteredCards, setMasteredCards] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("shieldscan_mastered") || "[]");
    } catch {
      return [];
    }
  });

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMastered = (e, id) => {
    e.stopPropagation();
    setMasteredCards(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem("shieldscan_mastered", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredCards = activeCategory === "all"
    ? FLASHCARDS
    : FLASHCARDS.filter(c => c.category === activeCategory);

  const progressPct = Math.round((masteredCards.length / FLASHCARDS.length) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <GraduationCap size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              AppSec & ML Knowledge Hub
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Interactive flashcards covering XSS attack taxonomy, OWASP defense principles, and interview defense topics.
          </p>
        </div>

        {/* Study Progress Card */}
        <div className="card-subtle px-4 py-3 min-w-[200px] flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span style={{ color: "var(--text-muted)" }}>Interview Mastery</span>
              <span style={{ color: "var(--accent)" }}>{progressPct}% ({masteredCards.length}/{FLASHCARDS.length})</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: "var(--accent)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {[
          { id: "all", label: "All Topics" },
          { id: "xss", label: "XSS Taxonomy" },
          { id: "owasp", label: "OWASP Defenses" },
          { id: "ml", label: "ML & Benchmarks" },
          { id: "ai", label: "AI & Privacy" },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="text-xs px-3.5 py-1.5 rounded-xl font-semibold border transition-all"
            style={{
              background: activeCategory === cat.id ? "var(--accent)" : "var(--bg-card)",
              color: activeCategory === cat.id ? "white" : "var(--text-secondary)",
              borderColor: activeCategory === cat.id ? "var(--accent)" : "var(--border)",
              boxShadow: activeCategory === cat.id ? "0 2px 8px rgba(16,185,129,0.25)" : "none",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3D Flashcards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCards.map(card => {
          const isFlipped = Boolean(flippedCards[card.id]);
          const isMastered = masteredCards.includes(card.id);

          return (
            <div
              key={card.id}
              onClick={() => toggleFlip(card.id)}
              className="group cursor-pointer rounded-2xl p-5 card flex flex-col justify-between min-h-[260px] relative transition-all duration-300 hover:scale-[1.01]"
              style={{
                borderColor: isMastered ? "rgba(16,185,129,0.4)" : "var(--border)",
                background: isFlipped ? "var(--bg-subtle)" : "var(--bg-card)",
                boxShadow: "var(--shadow)",
              }}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      background: "var(--bg-subtle)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {card.tag}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleMastered(e, card.id)}
                      className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors"
                      style={{
                        background: isMastered ? "rgba(16,185,129,0.15)" : "transparent",
                        color: isMastered ? "#34d399" : "var(--text-muted)",
                        border: isMastered ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
                      }}
                      title="Mark as understood"
                    >
                      <CheckCircle2 size={13} />
                      {isMastered ? "Mastered" : "Mark Mastered"}
                    </button>
                    <span className="text-xs text-muted flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <RotateCw size={12} /> Flip
                    </span>
                  </div>
                </div>

                {/* Content: Front (Question) vs Back (Answer) */}
                {!isFlipped ? (
                  <div className="space-y-2 animate-fsu">
                    <h3 className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                      {card.question}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {card.summary}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fsu">
                    <p className="text-xs font-mono font-medium leading-relaxed whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
                      {card.answer}
                    </p>
                    <div className="p-2.5 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <span className="font-bold text-emerald-400">💡 Interview Defense Tip: </span>
                      <span style={{ color: "var(--text-secondary)" }}>{card.interviewTip}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 flex items-center justify-between text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <span>Card #{card.id}</span>
                <span className="flex items-center gap-1 font-semibold group-hover:text-emerald-400 transition-colors">
                  {isFlipped ? "Click to view question" : "Click to reveal answer & defense tips"}
                  <ChevronRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
