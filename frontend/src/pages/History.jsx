// src/pages/History.jsx
import { useState, useMemo } from "react";
import { History as HistoryIcon, Search, Trash2, Download, Shield, ShieldAlert, ChevronLeft, ChevronRight, AlertTriangle, Clock, SlidersHorizontal, X, Copy, Check } from "lucide-react";
import SeverityBadge from "../components/SeverityBadge";

const PAGE_SIZE = 15;
function readHistory() { try { return JSON.parse(localStorage.getItem("shieldscan_history") || "[]"); } catch { return []; } }
function formatTs(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function exportCSV(rows) {
  const headers = ["#","Timestamp","Mode","Risk Level","Is XSS","Confidence","Payload"];
  const lines = rows.map((r, i) => [i+1, r.timestamp, r.mode||"single", r.risk_level||"", r.is_xss?"true":"false", r.confidence!=null?(r.confidence*100).toFixed(1)+"%":"", `"${(r.payload||"").replace(/"/g,'""')}"`].join(","));
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `shieldscan_history_${Date.now()}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

function DetailDrawer({ entry, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl w-full max-w-lg animate-fsu" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            {entry.is_xss ? <ShieldAlert size={16} style={{ color: "#f87171" }} /> : <Shield size={16} style={{ color: "#34d399" }} />}
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Scan Detail</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="hover:opacity-70 transition-opacity"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Result", value: entry.is_xss ? "XSS Detected" : "Safe", color: entry.is_xss ? "#f87171" : "#34d399" },
              { label: "Risk Level", value: <SeverityBadge level={entry.risk_level || (entry.is_xss ? "high" : "safe")} /> },
              { label: "Confidence", value: entry.confidence != null ? `${(entry.confidence * 100).toFixed(1)}%` : "—" },
              { label: "Mode", value: entry.mode || "single" },
              { label: "Scanned At", value: formatTs(entry.timestamp) },
            ].map(r => (
              <div key={r.label} className="card-subtle p-3">
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{r.label}</p>
                <p className="text-sm font-semibold" style={{ color: r.color || "var(--text-primary)" }}>{r.value}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Payload</p>
              <button onClick={() => { navigator.clipboard.writeText(entry.payload || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex items-center gap-1 text-xs transition-colors" style={{ color: copied ? "#34d399" : "var(--text-muted)" }}>
                {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="block text-xs font-mono rounded-xl p-3 break-all leading-relaxed max-h-36 overflow-y-auto"
              style={{ background: "#0d1117", color: "#a5f3c4", border: "1px solid var(--border)" }}>
              {entry.payload || "—"}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const [rawHistory, setRawHistory] = useState(readHistory);
  const [search, setSearch] = useState("");
  const [filterXss, setFilterXss] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const riskLevels = useMemo(() => ["all", ...new Set(rawHistory.map(r => r.risk_level).filter(Boolean))], [rawHistory]);
  const filtered = useMemo(() => {
    let rows = rawHistory;
    if (search.trim()) rows = rows.filter(r => r.payload?.toLowerCase().includes(search.toLowerCase()));
    if (filterXss === "xss") rows = rows.filter(r => r.is_xss);
    if (filterXss === "safe") rows = rows.filter(r => !r.is_xss);
    if (filterMode !== "all") rows = rows.filter(r => (r.mode || "single") === filterMode);
    if (filterRisk !== "all") rows = rows.filter(r => r.risk_level === filterRisk);
    return rows;
  }, [rawHistory, search, filterXss, filterMode, filterRisk]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = [filterXss, filterMode, filterRisk].filter(f => f !== "all").length;

  const FilterBtn = ({ active, onClick, children }) => (
    <button onClick={onClick} className="text-xs px-2.5 py-1 rounded-lg font-medium border transition-all"
      style={{ background: active ? "var(--accent)" : "var(--bg-card)", color: active ? "white" : "var(--text-muted)", borderColor: active ? "var(--accent)" : "var(--border)" }}>
      {children}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}><HistoryIcon size={16} className="text-white" /></div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Scan History</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>All payloads analyzed in this browser — stored locally.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search payloads…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}><X size={13} /></button>}
        </div>
        <button onClick={() => setShowFilters(p => !p)} className="btn-ghost flex items-center gap-1.5 text-sm px-3 py-2"
          style={showFilters || activeFilters > 0 ? { background: "var(--accent-light)", color: "var(--accent-text)", borderColor: "var(--accent)" } : {}}>
          <SlidersHorizontal size={14} />Filters
          {activeFilters > 0 && <span className="text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold" style={{ background: "var(--accent)" }}>{activeFilters}</span>}
        </button>
        <button onClick={() => exportCSV(filtered)} disabled={filtered.length === 0} className="btn-ghost flex items-center gap-1.5 text-sm px-3 py-2 disabled:opacity-40">
          <Download size={14} />Export CSV
        </button>
        {rawHistory.length > 0 && (
          <button onClick={() => setShowClearConfirm(true)} className="btn-ghost flex items-center gap-1.5 text-sm px-3 py-2" style={{ color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}>
            <Trash2 size={14} />Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-xl animate-fsu" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Result:</span>
            {[["all","All"],["xss","XSS Only"],["safe","Safe Only"]].map(([v,l]) => <FilterBtn key={v} active={filterXss===v} onClick={() => { setFilterXss(v); setPage(1); }}>{l}</FilterBtn>)}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Mode:</span>
            {[["all","All"],["single","Single"],["batch","Batch"]].map(([v,l]) => <FilterBtn key={v} active={filterMode===v} onClick={() => { setFilterMode(v); setPage(1); }}>{l}</FilterBtn>)}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Risk:</span>
            {riskLevels.map(v => <FilterBtn key={v} active={filterRisk===v} onClick={() => { setFilterRisk(v); setPage(1); }}>{v==="all"?"All":v.charAt(0).toUpperCase()+v.slice(1)}</FilterBtn>)}
          </div>
        </div>
      )}

      {rawHistory.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {[
            { v: `${filtered.length} result${filtered.length!==1?"s":""}`, bg: "var(--bg-subtle)", color: "var(--text-secondary)", border: "var(--border)" },
            { v: `${filtered.filter(r=>r.is_xss).length} XSS`, bg: "rgba(239,68,68,0.08)", color: "#f87171", border: "rgba(239,68,68,0.2)" },
            { v: `${filtered.filter(r=>!r.is_xss).length} Safe`, bg: "rgba(16,185,129,0.08)", color: "#34d399", border: "rgba(16,185,129,0.2)" },
          ].map(p => <span key={p.v} className="rounded-full px-3 py-1 font-medium" style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>{p.v}</span>)}
        </div>
      )}

      {rawHistory.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
          <HistoryIcon size={40} className="mb-3 opacity-20" />
          <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>No scan history yet</p>
          <p className="text-sm mt-1">Run a scan on the Scanner page to see results here.</p>
        </div>
      )}

      {rawHistory.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--text-muted)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No results match your filters</p>
          <button onClick={() => { setSearch(""); setFilterXss("all"); setFilterMode("all"); setFilterRisk("all"); }} className="mt-3 text-xs hover:underline" style={{ color: "var(--accent)" }}>Clear all filters</button>
        </div>
      )}

      {pageRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                <tr>{["#","Payload","Result","Risk","Confidence","Mode","Time"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {pageRows.map((entry, i) => (
                  <tr key={entry.id||i} onClick={() => setSelected(entry)} className="cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = entry.is_xss ? "rgba(239,68,68,0.05)" : "var(--bg-subtle)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{(page-1)*PAGE_SIZE+i+1}</td>
                    <td className="px-4 py-3 max-w-[280px]"><code className="text-xs font-mono truncate block" style={{ color: "var(--text-secondary)" }}>{entry.payload||"—"}</code></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {entry.is_xss ? <ShieldAlert size={13} style={{ color: "#f87171" }} /> : <Shield size={13} style={{ color: "#34d399" }} />}
                        <span className="text-xs font-bold" style={{ color: entry.is_xss ? "#f87171" : "#34d399" }}>{entry.is_xss ? "XSS" : "Safe"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge level={entry.risk_level||(entry.is_xss?"high":"safe")} size="sm" /></td>
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>{entry.confidence!=null?`${(entry.confidence*100).toFixed(1)}%`:"—"}</td>
                    <td className="px-4 py-3"><span className="text-xs rounded-md px-1.5 py-0.5 capitalize" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{entry.mode||"single"}</span></td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{formatTs(entry.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Page {page} of {totalPages} · {filtered.length} entries</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg transition-all disabled:opacity-30 btn-ghost"><ChevronLeft size={15} /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => Math.max(1, Math.min(totalPages-4, page-2))+i).map(pg => (
                  <button key={pg} onClick={() => setPage(pg)} className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: pg===page ? "var(--accent)" : "transparent", color: pg===page ? "white" : "var(--text-muted)" }}>{pg}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg transition-all disabled:opacity-30 btn-ghost"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {selected && <DetailDrawer entry={selected} onClose={() => setSelected(null)} />}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 max-w-sm w-full animate-fsu" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
            <div className="flex items-center gap-2 mb-3"><AlertTriangle size={18} style={{ color: "#f87171" }} /><p className="font-bold" style={{ color: "var(--text-primary)" }}>Clear all history?</p></div>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>This will permanently delete all {rawHistory.length} scan records. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 text-sm font-semibold rounded-xl btn-ghost">Cancel</button>
              <button onClick={() => { localStorage.removeItem("shieldscan_history"); setRawHistory([]); setShowClearConfirm(false); setPage(1); }}
                className="flex-1 py-2 text-sm font-semibold rounded-xl text-white" style={{ background: "#ef4444" }}>Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
