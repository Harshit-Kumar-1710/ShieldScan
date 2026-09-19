import { useState } from "react";
import { Sparkles, ShieldCheck, AlertCircle, CheckCircle, HelpCircle, Lock, Cpu, Lightbulb, RefreshCw, Eye } from "lucide-react";
import { requestAiReview } from "../api/client";

function recordAiAnalytics(isAgreement) {
  try {
    const raw = JSON.parse(localStorage.getItem("shieldscan_ai_analytics") || '{"total": 0, "agreements": 0, "disagreements": 0}');
    raw.total = (raw.total || 0) + 1;
    if (isAgreement) {
      raw.agreements = (raw.agreements || 0) + 1;
    } else {
      raw.disagreements = (raw.disagreements || 0) + 1;
    }
    localStorage.setItem("shieldscan_ai_analytics", JSON.stringify(raw));
  } catch {}
}

export default function AIReviewComparison({ payload, result }) {
  const [consent, setConsent] = useState(false);
  const [demoMode, setDemoMode] = useState(true); // Default to demo mode for interview/offline usability
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  if (!result) return null;

  const handleRunAiReview = async () => {
    if (!consent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requestAiReview({
        payload,
        mlResult: result,
        consent,
        demoMode,
      });
      setAiResult(res);
      const isAgree = res.ml_agreement === "agrees";
      recordAiAnalytics(isAgree);
    } catch (err) {
      setError(err.message || "Failed to complete AI review.");
    } finally {
      setLoading(false);
    }
  };

  const mlIsXss = result.is_xss;
  const mlProb = Math.round((result.xss_probability ?? 0) * 100);

  return (
    <div className="rounded-2xl overflow-hidden animate-fsu" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: "rgba(168,85,247,0.12)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
            <Sparkles size={14} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              AI Security Review (Advisory)
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Optional contextual reasoning layer to complement the local ML classifier.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.1)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.2)" }}>
          Advisory Only
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Consent and Trigger Controls */}
        {!aiResult && (
          <div className="space-y-3 p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-2.5">
              <input
                id="consent-checkbox"
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 rounded cursor-pointer accent-purple-600"
              />
              <label htmlFor="consent-checkbox" className="text-xs leading-relaxed cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <strong>Explicit Privacy Consent:</strong> I consent to send this payload pattern to an AI service for contextual security analysis. No API key is ever exposed to the browser.
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={e => setDemoMode(e.target.checked)}
                  className="rounded cursor-pointer accent-purple-600"
                />
                <span>Demo Mode (Deterministic local advisory for interviews & offline use)</span>
              </label>

              <button
                onClick={handleRunAiReview}
                disabled={!consent || loading}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#9333ea", borderColor: "#7e22ce" }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Generating Advisory Review…
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    Run AI Review
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl flex items-start gap-2 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Review Notice</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Side-by-Side ML vs AI Advisory Comparison */}
        {aiResult && (
          <div className="space-y-4 animate-fsu">
            {/* Agreement Status Banner */}
            <div
              className="p-3.5 rounded-xl flex items-center justify-between"
              style={{
                background:
                  aiResult.ml_agreement === "agrees"
                    ? "rgba(16,185,129,0.08)"
                    : aiResult.ml_agreement === "disagrees"
                    ? "rgba(245,158,11,0.08)"
                    : "var(--bg-subtle)",
                border: `1px solid ${
                  aiResult.ml_agreement === "agrees"
                    ? "rgba(16,185,129,0.25)"
                    : aiResult.ml_agreement === "disagrees"
                    ? "rgba(245,158,11,0.25)"
                    : "var(--border)"
                }`,
              }}
            >
              <div className="flex items-center gap-2">
                {aiResult.ml_agreement === "agrees" ? (
                  <CheckCircle size={16} className="text-emerald-400" />
                ) : aiResult.ml_agreement === "disagrees" ? (
                  <AlertCircle size={16} className="text-amber-400" />
                ) : (
                  <HelpCircle size={16} className="text-purple-400" />
                )}
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{
                      color:
                        aiResult.ml_agreement === "agrees"
                          ? "#34d399"
                          : aiResult.ml_agreement === "disagrees"
                          ? "#fbbf24"
                          : "var(--text-primary)",
                    }}
                  >
                    {aiResult.ml_agreement === "agrees"
                      ? "ML and AI Agree on Assessment"
                      : aiResult.ml_agreement === "disagrees"
                      ? "ML and AI Disagree — Manual Analyst Review Recommended"
                      : "Comparative Assessment Uncertain"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {aiResult.is_demo ? "[Demo Mode Advisory]" : "[Live Advisory API]"} The local ML decision remains authoritative.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAiResult(null)}
                className="text-xs btn-ghost px-2.5 py-1"
              >
                Reset Review
              </button>
            </div>

            {/* Comparison Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Local ML Column */}
              <div className="p-4 rounded-xl space-y-2.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <Cpu size={14} style={{ color: "var(--accent)" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Primary Local ML Model
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Decision:</span>
                  <span className="font-bold" style={{ color: mlIsXss ? "#f87171" : "#34d399" }}>
                    {mlIsXss ? "XSS Detected" : "Safe Payload"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Probability / Severity:</span>
                  <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                    {mlProb}% · {result.severity || "SAFE"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Attack Category:</span>
                  <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {result.attack_type || "N/A"}
                  </span>
                </div>
                {result.triggered_features?.length > 0 && (
                  <div className="pt-1">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Triggered Features:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.triggered_features.map((f, i) => (
                        <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Advisory AI Column */}
              <div className="p-4 rounded-xl space-y-2.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <Sparkles size={14} style={{ color: "#c084fc" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Advisory AI Review
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Risk Assessment:</span>
                  <span className="font-bold capitalize" style={{ color: aiResult.risk_assessment === "suspicious" ? "#f87171" : "#34d399" }}>
                    {aiResult.risk_assessment}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Confidence:</span>
                  <span className="font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                    {aiResult.confidence_level}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Likely Type:</span>
                  <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {aiResult.likely_attack_type || "N/A"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed pt-1" style={{ color: "var(--text-secondary)" }}>
                  {aiResult.explanation}
                </p>
              </div>
            </div>

            {/* Suggested Defenses and Manual Review Rationales */}
            {aiResult.suggested_defenses?.length > 0 && (
              <div className="p-3.5 rounded-xl text-xs space-y-1.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  <Lightbulb size={12} />
                  AI Advisory Defense Recommendations
                </p>
                <ul className="space-y-1" style={{ color: "var(--text-secondary)" }}>
                  {aiResult.suggested_defenses.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.reasons_to_review_manually?.length > 0 && (
              <div className="p-3.5 rounded-xl text-xs space-y-1.5" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="font-bold flex items-center gap-1.5 text-amber-400 uppercase tracking-wider">
                  <Eye size={12} />
                  Analyst Triage Notes
                </p>
                <ul className="space-y-1" style={{ color: "var(--text-secondary)" }}>
                  {aiResult.reasons_to_review_manually.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Permanent Principle Callout */}
            <div className="p-3 rounded-lg text-xs leading-relaxed text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              The ML classifier recognizes learned character patterns and explicit security indicators with deterministic consistency. The AI review provides contextual reasoning but can be non-deterministic.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
