// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { BarChart2, Activity, Cpu, CheckCircle2, AlertCircle, Clock, TrendingUp, Layers, Zap, RefreshCw, Shield } from "lucide-react";
import { getModelInfo, getModelFeatures, getModelThresholds, healthCheck } from "../api/client";

function readHistory() { try { return JSON.parse(localStorage.getItem("shieldscan_history") || "[]"); } catch { return []; } }
function formatDate(iso) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatUptime(s) { if (!s) return "—"; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }

function StatCard({ icon: Icon, label, value, sub, accent, delay = 0 }) {
  return (
    <div className="card p-5 flex flex-col gap-3 animate-fsu" style={{ animationDelay: `${delay}ms` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>{value ?? "—"}</p>
        <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function ActivityChart({ history }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (13 - i)); return d.toISOString().slice(0, 10); });
  const counts = days.map(day => ({
    day, label: new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    total: history.filter(h => h.timestamp?.slice(0, 10) === day).length,
    xss: history.filter(h => h.timestamp?.slice(0, 10) === day && h.is_xss).length,
  }));
  const maxCount = Math.max(...counts.map(c => c.total), 1);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Scan Activity</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Last 14 days</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {[{ color: "#10b981", label: "Safe" }, { color: "#f87171", label: "XSS" }].map(l => (
            <span key={l.label} className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />{l.label}
            </span>
          ))}
        </div>
      </div>
      {counts.every(c => c.total === 0) ? (
        <div className="flex flex-col items-center justify-center py-10" style={{ color: "var(--text-muted)" }}>
          <BarChart2 size={32} className="mb-2 opacity-30" />
          <p className="text-sm">No scan data yet</p>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 h-32">
          {counts.map(c => {
            const totalH = (c.total / maxCount) * 100;
            const xssH = c.total > 0 ? (c.xss / c.total) * totalH : 0;
            const safeH = totalH - xssH;
            return (
              <div key={c.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                  <div className="w-full flex flex-col rounded-t overflow-hidden">
                    {c.xss > 0 && <div style={{ height: `${xssH}px`, background: "#f87171" }} />}
                    {safeH > 0 && <div style={{ height: `${safeH}px`, background: "#10b981" }} />}
                    {c.total === 0 && <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px" }} />}
                  </div>
                </div>
                {c.total > 0 && (
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", boxShadow: "var(--shadow-md)" }}>
                    {c.total} · {c.xss} XSS
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [modelInfo, setModelInfo] = useState(null);
  const [features, setFeatures] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const history = readHistory();

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [info, feat, thresh, h] = await Promise.allSettled([getModelInfo(), getModelFeatures(), getModelThresholds(), healthCheck()]);
      if (info.status === "fulfilled") setModelInfo(info.value);
      if (feat.status === "fulfilled") setFeatures(feat.value);
      if (thresh.status === "fulfilled") setThresholds(thresh.value);
      if (h.status === "fulfilled") setHealth(h.value);
      setLastRefresh(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalScans = history.length;
  const xssCount = history.filter(h => h.is_xss).length;
  const safeCount = totalScans - xssCount;
  const detectionRate = totalScans > 0 ? Math.round((xssCount / totalScans) * 100) : 0;
  const featureList = features ? Object.entries(features).sort(([, a], [, b]) => b - a).slice(0, 12) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}><BarChart2 size={16} className="text-white" /></div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Model performance, scan analytics, and system health.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl p-4 mb-6" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div><p className="text-sm font-semibold">Backend unreachable</p><p className="text-xs mt-0.5 opacity-80">Showing local scan history only.</p></div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Layers}      label="Total Scans"    value={totalScans}  accent="#60a5fa" delay={0} />
        <StatCard icon={AlertCircle} label="XSS Detected"   value={xssCount}    accent="#f87171" delay={60} />
        <StatCard icon={CheckCircle2}label="Safe Payloads"  value={safeCount}   accent="#34d399" delay={120} />
        <StatCard icon={TrendingUp}  label="Detection Rate" value={`${detectionRate}%`} accent="#fbbf24" delay={180} />
        <StatCard icon={Cpu}         label="Model Accuracy" value={modelInfo?.accuracy ? `${(modelInfo.accuracy * 100).toFixed(1)}%` : "—"} sub={modelInfo?.model_type || ""} accent="#a78bfa" delay={240} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2"><ActivityChart history={history} /></div>
        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Activity size={15} style={{ color: "var(--accent)" }} />
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>System Health</p>
            {health && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Online
              </span>
            )}
          </div>
          {loading && !health ? (
            <div className="flex items-center gap-2 text-sm py-4" style={{ color: "var(--text-muted)" }}>
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />Checking...
            </div>
          ) : health ? (
            <div className="space-y-0 text-sm">
              {[
                { label: "Status", value: health.status || "OK" },
                { label: "Model loaded", value: health.model_loaded ? "Yes" : "No" },
                { label: "Uptime", value: formatUptime(health.uptime_seconds) },
                { label: "Version", value: health.version || modelInfo?.version || "—" },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{r.label}</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm py-4" style={{ color: "var(--text-muted)" }}><AlertCircle size={14} />Backend offline</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Zap size={15} style={{ color: "var(--accent)" }} />
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Feature Importances</p>
            <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>Top 12</span>
          </div>
          {loading && featureList.length === 0 ? (
            <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-5 rounded animate-pulse" style={{ width: `${80 - i * 5}%`, background: "var(--bg-subtle)" }} />
            ))}</div>
          ) : featureList.length > 0 ? (
            <div className="space-y-3">
              {featureList.map(([name, imp], i) => (
                <div key={name} className="flex items-center gap-3 group">
                  <span className="w-5 text-xs tabular-nums text-right font-mono" style={{ color: "var(--border-strong)" }}>{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-mono truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>{name}</span>
                      <span className="text-xs tabular-nums ml-2" style={{ color: "var(--text-muted)" }}>{Math.round(imp * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(imp * 100)}%`, background: `linear-gradient(90deg, var(--accent), #34d399)` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8" style={{ color: "var(--text-muted)" }}>
              <Zap size={28} className="mb-2 opacity-30" /><p className="text-sm">Feature data unavailable</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={15} style={{ color: "var(--accent)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Model Info</p>
            </div>
            {modelInfo ? (
              <div className="space-y-0">
                {[
                  { label: "Type", value: modelInfo.model_type },
                  { label: "Version", value: modelInfo.version },
                  { label: "Features", value: modelInfo.n_features },
                  { label: "Trained", value: formatDate(modelInfo.trained_at) },
                  { label: "F1 Score", value: modelInfo.f1_score ? `${(modelInfo.f1_score * 100).toFixed(1)}%` : null },
                ].filter(r => r.value != null).map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.label}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm" style={{ color: "var(--text-muted)" }}>{loading ? "Loading..." : "Unavailable"}</p>}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} style={{ color: "var(--accent)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Thresholds</p>
            </div>
            {thresholds ? (
              <div className="space-y-0">
                {Object.entries(thresholds).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{k}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {typeof v === "number" ? (v <= 1 ? `${(v * 100).toFixed(0)}%` : v) : String(v ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm" style={{ color: "var(--text-muted)" }}>{loading ? "Loading..." : "Unavailable"}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
