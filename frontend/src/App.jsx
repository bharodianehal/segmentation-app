import React, { useState, useEffect, useCallback } from 'react';

// ─── Helpers ───────────────────────────────────────────────────────────
const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '--';
  const n = Number(v);
  if (isNaN(n)) return v;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return n.toLocaleString('en-US');
  if (n < 1 && n > 0) return n.toFixed(3);
  return n.toLocaleString('en-US');
};

const fmtDollar = (v) => {
  if (v === null || v === undefined || v === '') return '--';
  const n = Number(v);
  if (isNaN(n)) return v;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
};

const pct = (v) => {
  if (v === null || v === undefined || v === '') return '--';
  const n = Number(v);
  if (isNaN(n)) return v;
  return `${(n * 100).toFixed(1)}%`;
};

const SEGMENT_COLORS = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
  { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', bar: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', bar: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
  { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', bar: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
];

const segColor = (i) => SEGMENT_COLORS[i % SEGMENT_COLORS.length];

const CHURN_COLORS = {
  High: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
  Medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  Low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700', bar: 'bg-green-500' },
};

const CLV_COLORS = {
  Platinum: 'bg-violet-100 text-violet-700',
  Gold: 'bg-amber-100 text-amber-700',
  Silver: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-700',
};

// ─── API Hook ──────────────────────────────────────────────────────────
function useApi(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url, ...deps]);

  return { data, loading, error };
}

// ─── Icons (inline SVG) ───────────────────────────────────────────────
const Icons = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  ),
  alert: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  megaphone: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  chevronUp: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
};

// ─── Shared Components ─────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
      <p className="text-lg font-medium">{message || 'No data available'}</p>
      <p className="text-sm mt-1">The data pipeline may still be running. Check back soon.</p>
    </div>
  );
}

function KpiCard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
      <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold mt-2 bg-gradient-to-r bg-clip-text text-transparent" style={{backgroundImage: `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))`}} >
        <span className={`bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>{value}</span>
      </span>
      {sub && <span className="text-xs text-gray-400 mt-1">{sub}</span>}
    </div>
  );
}

function HBar({ items, maxVal }) {
  const max = maxVal || Math.max(...items.map((i) => Number(i.value) || 0), 1);
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const pctW = Math.max(((Number(item.value) || 0) / max) * 100, 2);
        const c = item.color || segColor(idx);
        return (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="text-gray-500">{fmt(item.value)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${typeof c === 'string' ? c : c.bar}`} style={{ width: `${pctW}%`, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataTable({ columns, rows, emptyMsg }) {
  if (!rows || rows.length === 0) return <EmptyState message={emptyMsg} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '--')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

// ─── Pages ─────────────────────────────────────────────────────────────

// 1. OVERVIEW
function OverviewPage() {
  const { data, loading } = useApi('/api/customers/overview');
  if (loading) return <Spinner />;
  if (!data || data.total_customers === 0) return <EmptyState message="No customer data yet" />;

  const d = data;
  const bySegment = d.customers_by_segment || [];
  const churnDist = d.churn_distribution || [];
  const clvDist = d.clv_distribution || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Overview</h1>
        <p className="text-gray-500 mt-1">Customer segmentation and targeting performance at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="Total Customers" value={fmt(d.total_customers)} color="indigo" />
        <KpiCard label="Active Segments" value={d.segment_count} color="emerald" />
        <KpiCard label="Avg Propensity Score" value={d.avg_propensity ? Number(d.avg_propensity).toFixed(3) : '--'} color="amber" />
        <KpiCard label="Avg Customer LTV" value={fmtDollar(d.avg_clv)} color="rose" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customers by Segment</h2>
          {bySegment.length > 0 ? (
            <HBar items={bySegment.map((s, i) => ({ label: `Segment ${s.segment}`, value: s.count, color: segColor(i) }))} />
          ) : <EmptyState message="Segment data pending" />}
        </div>

        {/* Churn + CLV */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Churn Risk Distribution</h2>
            {churnDist.length > 0 ? (
              <div className="flex gap-4">
                {['High', 'Medium', 'Low'].map((tier) => {
                  const item = churnDist.find((c) => c.churn_risk_tier === tier) || { count: 0 };
                  const cc = CHURN_COLORS[tier] || CHURN_COLORS.Low;
                  return (
                    <div key={tier} className={`flex-1 rounded-xl p-4 ${cc.bg} border ${cc.border}`}>
                      <p className={`text-2xl font-bold ${cc.text}`}>{fmt(item.count)}</p>
                      <p className="text-sm text-gray-600 mt-1">{tier} Risk</p>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState message="Churn data pending" />}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">CLV Tier Distribution</h2>
            {clvDist.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {clvDist.map((t) => (
                  <div key={t.clv_tier} className="flex items-center gap-2">
                    <Badge className={CLV_COLORS[t.clv_tier] || 'bg-gray-100 text-gray-600'}>{t.clv_tier}</Badge>
                    <span className="text-sm font-medium text-gray-700">{fmt(t.count)}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState message="CLV data pending" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. SEGMENTS
function SegmentsPage() {
  const { data, loading } = useApi('/api/segments');
  const [expanded, setExpanded] = useState(null);
  const [custData, setCustData] = useState({});

  const toggleExpand = useCallback((seg) => {
    if (expanded === seg) { setExpanded(null); return; }
    setExpanded(seg);
    if (!custData[seg]) {
      fetch(`/api/segments/${seg}/customers`)
        .then((r) => r.json())
        .then((d) => setCustData((prev) => ({ ...prev, [seg]: d.customers })));
    }
  }, [expanded, custData]);

  if (loading) return <Spinner />;
  if (!data || !data.segments || data.segments.length === 0) return <EmptyState message="Segment profiles not yet generated" />;

  const segments = data.segments;
  // Get column keys (exclude 'segment')
  const allKeys = segments.length > 0 ? Object.keys(segments[0]).filter(k => k !== 'segment') : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Segment Explorer</h1>
        <p className="text-gray-500 mt-1">Explore customer segments and their profiles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {segments.map((seg, idx) => {
          const c = segColor(idx);
          const segId = seg.segment;
          const isOpen = expanded === segId;
          const customers = custData[segId] || [];

          return (
            <div key={idx} className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all ${isOpen ? 'col-span-full' : ''}`}>
              <div className={`p-6 ${c.bg} border-b ${c.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className={c.badge}>Segment {segId}</Badge>
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {allKeys.slice(0, 6).map((k) => (
                        <div key={k}>
                          <span className="text-gray-500">{k.replace(/_/g, ' ')}: </span>
                          <span className="font-medium text-gray-800">{seg[k] ?? '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <button
                  onClick={() => toggleExpand(segId)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {isOpen ? Icons.chevronUp : Icons.chevronDown}
                  {isOpen ? 'Hide customers' : 'Show top customers'}
                </button>
                {isOpen && (
                  <div className="mt-4">
                    {customers.length > 0 ? (
                      <DataTable
                        columns={[
                          { key: 'customer_id', label: 'ID' },
                          { key: 'first_name', label: 'First' },
                          { key: 'last_name', label: 'Last' },
                          { key: 'tier', label: 'Tier' },
                          { key: 'income', label: 'Income', render: (v) => fmtDollar(v) },
                          { key: 'propensity_score', label: 'Propensity', render: (v) => v ? Number(v).toFixed(3) : '--' },
                          { key: 'churn_risk_tier', label: 'Churn Risk', render: (v) => {
                            if (!v) return '--';
                            const cc = CHURN_COLORS[v] || {};
                            return <Badge className={cc.badge || 'bg-gray-100'}>{v}</Badge>;
                          }},
                          { key: 'estimated_clv', label: 'CLV', render: (v) => fmtDollar(v) },
                        ]}
                        rows={customers}
                      />
                    ) : <Spinner />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. PROPENSITY
function PropensityPage() {
  const { data, loading } = useApi('/api/propensity/distribution');
  if (loading) return <Spinner />;
  if (!data || (!data.by_decile?.length && !data.top_customers?.length)) return <EmptyState message="Propensity scores not yet computed" />;

  const byDecile = data.by_decile || [];
  const stats = data.responder_stats || {};
  const bySegment = data.by_segment || [];
  const topCustomers = data.top_customers || [];

  const respPct = stats.total && stats.responders ? ((Number(stats.responders) / Number(stats.total)) * 100).toFixed(1) : '--';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Propensity Scoring</h1>
        <p className="text-gray-500 mt-1">Customer response likelihood analysis</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard label="Total Scored" value={fmt(stats.total)} color="indigo" />
        <KpiCard label="Predicted Responders" value={fmt(stats.responders)} sub={`${respPct}% of total`} color="emerald" />
        <KpiCard label="Avg Score (overall)" value={byDecile.length > 0 ? (byDecile.reduce((s, d) => s + Number(d.avg_score || 0), 0) / byDecile.length).toFixed(3) : '--'} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decile distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribution by Decile</h2>
          {byDecile.length > 0 ? (
            <HBar items={byDecile.map((d, i) => ({
              label: `Decile ${d.decile}`,
              value: d.count,
              color: segColor(i),
            }))} />
          ) : <EmptyState message="No decile data" />}
        </div>

        {/* By segment */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Avg Score by Segment</h2>
          {bySegment.length > 0 ? (
            <HBar
              items={bySegment.map((s, i) => ({
                label: `Segment ${s.segment}`,
                value: s.avg_score,
                color: segColor(i),
              }))}
              maxVal={1}
            />
          ) : <EmptyState message="No segment propensity data" />}
        </div>
      </div>

      {/* Top customers table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 20 Highest Propensity Customers</h2>
        <DataTable
          columns={[
            { key: 'customer_id', label: 'Customer ID' },
            { key: 'first_name', label: 'First' },
            { key: 'last_name', label: 'Last' },
            { key: 'tier', label: 'Tier' },
            { key: 'region', label: 'Region' },
            { key: 'propensity_score', label: 'Score', render: (v) => <span className="font-semibold text-indigo-600">{v ? Number(v).toFixed(3) : '--'}</span> },
            { key: 'propensity_decile', label: 'Decile' },
            { key: 'predicted_responder', label: 'Responder', render: (v) => v === '1' || v === 1 ? <Badge className="bg-green-100 text-green-700">Yes</Badge> : <Badge className="bg-gray-100 text-gray-500">No</Badge> },
          ]}
          rows={topCustomers}
          emptyMsg="No propensity data"
        />
      </div>
    </div>
  );
}

// 4. CHURN RISK
function ChurnPage() {
  const { data, loading } = useApi('/api/churn/summary');
  if (loading) return <Spinner />;
  if (!data || data.total === 0) return <EmptyState message="Churn risk scores not yet computed" />;

  const dist = data.distribution || [];
  const total = data.total || 0;
  const topRisk = data.top_risk_customers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Churn Risk Analysis</h1>
        <p className="text-gray-500 mt-1">Identify at-risk customers and take preventive action</p>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {['High', 'Medium', 'Low'].map((tier) => {
          const item = dist.find((d) => d.churn_risk_tier === tier) || { count: 0, avg_probability: 0 };
          const cc = CHURN_COLORS[tier];
          const countNum = Number(item.count) || 0;
          const pctOfTotal = total > 0 ? ((countNum / total) * 100).toFixed(1) : 0;
          return (
            <div key={tier} className={`rounded-2xl p-6 ${cc.bg} border ${cc.border}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${cc.bar}`} />
                <h3 className={`text-lg font-semibold ${cc.text}`}>{tier} Risk</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{fmt(countNum)}</p>
              <p className="text-sm text-gray-600 mt-1">{pctOfTotal}% of total</p>
              <p className="text-sm text-gray-500 mt-1">Avg probability: {item.avg_probability ? Number(item.avg_probability).toFixed(3) : '--'}</p>
            </div>
          );
        })}
      </div>

      {/* Top risk customers */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 20 Highest Churn Risk Customers</h2>
        <DataTable
          columns={[
            { key: 'customer_id', label: 'Customer ID' },
            { key: 'first_name', label: 'First' },
            { key: 'last_name', label: 'Last' },
            { key: 'tier', label: 'Tier' },
            { key: 'region', label: 'Region' },
            { key: 'income', label: 'Income', render: (v) => fmtDollar(v) },
            { key: 'churn_probability', label: 'Churn Prob', render: (v) => <span className="font-semibold text-red-600">{v ? Number(v).toFixed(3) : '--'}</span> },
            { key: 'churn_risk_tier', label: 'Risk Tier', render: (v) => {
              const cc = CHURN_COLORS[v] || {};
              return <Badge className={cc.badge || 'bg-gray-100'}>{v || '--'}</Badge>;
            }},
            { key: 'estimated_clv', label: 'CLV', render: (v) => fmtDollar(v) },
            { key: 'clv_tier', label: 'CLV Tier', render: (v) => <Badge className={CLV_COLORS[v] || 'bg-gray-100'}>{v || '--'}</Badge> },
          ]}
          rows={topRisk}
          emptyMsg="No churn data"
        />
      </div>
    </div>
  );
}

// 5. CAMPAIGNS
function CampaignsPage() {
  const { data, loading } = useApi('/api/campaigns');
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (loading) return <Spinner />;
  if (!data || (!data.campaign_copy?.length && !data.targets_summary?.length)) return <EmptyState message="Campaign data not yet generated" />;

  const copy = data.campaign_copy || [];
  const targets = data.targets_summary || [];
  const totalTargets = data.total_targets || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Targeting</h1>
        <p className="text-gray-500 mt-1">AI-generated campaigns tailored to each customer segment</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard label="Total Target Customers" value={fmt(totalTargets)} color="indigo" />
        <KpiCard label="Campaigns Generated" value={copy.length} color="emerald" />
        <KpiCard label="Segments Covered" value={targets.length} color="amber" />
      </div>

      {/* Target summary by segment */}
      {targets.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Targets by Segment</h2>
          <HBar items={targets.map((t, i) => ({
            label: `Segment ${t.segment} - ${t.campaign_type || 'Campaign'}`,
            value: t.target_count,
            color: segColor(i),
          }))} />
        </div>
      )}

      {/* Campaign copy cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Campaign Content</h2>
        {copy.map((c, idx) => {
          const color = segColor(idx);
          const isOpen = expandedIdx === idx;
          return (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`p-5 ${color.bg} border-b ${color.border} cursor-pointer`} onClick={() => setExpandedIdx(isOpen ? null : idx)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={color.badge}>Segment {c.segment}</Badge>
                    <span className="font-medium text-gray-800">{c.channel || 'Multi-channel'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.recommended_offer && <span className="text-sm text-gray-500">Offer: {c.recommended_offer}</span>}
                    {isOpen ? Icons.chevronUp : Icons.chevronDown}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className="p-5 space-y-4">
                  {c.subject_line && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject Line</label>
                      <p className="mt-1 text-gray-800 font-medium">{c.subject_line}</p>
                    </div>
                  )}
                  {c.body_text && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Body</label>
                      <p className="mt-1 text-gray-700 whitespace-pre-line leading-relaxed">{c.body_text}</p>
                    </div>
                  )}
                  {/* Show any other fields */}
                  {Object.entries(c).filter(([k]) => !['segment', 'channel', 'subject_line', 'body_text', 'recommended_offer'].includes(k)).map(([k, v]) => (
                    v && (
                      <div key={k}>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{k.replace(/_/g, ' ')}</label>
                        <p className="mt-1 text-gray-700">{v}</p>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 6. CUSTOMER 360
function Customer360Page() {
  const [searchId, setSearchId] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const { data, loading, error } = useApi(customerId ? `/api/customers/${customerId}` : null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) setCustomerId(searchId.trim());
  };

  const cust = data?.customer;
  const seg = data?.segment;
  const prop = data?.propensity;
  const churn = data?.churn;
  const ltv = data?.ltv;
  const camp = data?.campaign;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer 360</h1>
        <p className="text-gray-500 mt-1">Complete view of any individual customer</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-lg">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            {Icons.search}
          </div>
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Enter Customer ID..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
          />
        </div>
        <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
          Search
        </button>
      </form>

      {loading && <Spinner />}
      {error && <div className="text-red-500 bg-red-50 rounded-xl p-4">Customer not found. Please check the ID and try again.</div>}

      {cust && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demographics */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h2>
            <div className="space-y-3">
              {[
                ['Name', `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || '--'],
                ['Customer ID', cust.customer_id],
                ['Gender', cust.gender],
                ['Region', cust.region],
                ['Income', fmtDollar(cust.income)],
                ['Tier', cust.tier],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{val || '--'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Segment */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Segment Assignment</h2>
            {seg ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">Segment:</span>
                  <Badge className={segColor(Number(seg.segment) || 0).badge}>Segment {seg.segment}</Badge>
                </div>
                {Object.entries(seg).filter(([k]) => k !== 'customer_id' && k !== 'segment').map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">{k.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900">{v ?? '--'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400">Not yet assigned to a segment</p>}
          </div>

          {/* Propensity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Propensity Score</h2>
            {prop ? (
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Score</span>
                  <span className="text-2xl font-bold text-indigo-600">{Number(prop.propensity_score).toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Decile</span>
                  <span className="font-medium">{prop.propensity_decile}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Predicted Responder</span>
                  {prop.predicted_responder === '1' || prop.predicted_responder === 1
                    ? <Badge className="bg-green-100 text-green-700">Yes</Badge>
                    : <Badge className="bg-gray-100 text-gray-500">No</Badge>
                  }
                </div>
              </div>
            ) : <p className="text-gray-400">Propensity score not yet computed</p>}
          </div>

          {/* Churn */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Churn Risk</h2>
            {churn ? (
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Probability</span>
                  <span className="text-2xl font-bold text-red-600">{Number(churn.churn_probability).toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Risk Tier</span>
                  <Badge className={(CHURN_COLORS[churn.churn_risk_tier] || {}).badge || 'bg-gray-100'}>{churn.churn_risk_tier}</Badge>
                </div>
              </div>
            ) : <p className="text-gray-400">Churn risk not yet computed</p>}
          </div>

          {/* LTV */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Lifetime Value</h2>
            {ltv ? (
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Estimated CLV</span>
                  <span className="text-2xl font-bold text-emerald-600">{fmtDollar(ltv.estimated_clv)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">CLV Tier</span>
                  <Badge className={CLV_COLORS[ltv.clv_tier] || 'bg-gray-100'}>{ltv.clv_tier}</Badge>
                </div>
                {ltv.monthly_revenue_estimate && (
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Monthly Revenue</span>
                    <span className="font-medium">{fmtDollar(ltv.monthly_revenue_estimate)}</span>
                  </div>
                )}
              </div>
            ) : <p className="text-gray-400">CLV not yet computed</p>}
          </div>

          {/* Campaign */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Assignment</h2>
            {camp ? (
              <div className="space-y-3">
                {Object.entries(camp).filter(([k]) => k !== 'customer_id').map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">{k.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900">{v ?? '--'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400">Not yet targeted for a campaign</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar + Layout ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'segments', label: 'Segments', icon: 'users' },
  { id: 'propensity', label: 'Propensity', icon: 'target' },
  { id: 'churn', label: 'Churn Risk', icon: 'alert' },
  { id: 'campaigns', label: 'Campaigns', icon: 'megaphone' },
  { id: 'customer360', label: 'Customer 360', icon: 'user' },
];

function Sidebar({ active, onNav }) {
  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col min-h-screen fixed left-0 top-0 bottom-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-indigo-400">Customer</span> Intelligence
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Segmentation & Promotions</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {Icons[item.icon]}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">Powered by Databricks</p>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('overview');

  const pages = {
    overview: <OverviewPage />,
    segments: <SegmentsPage />,
    propensity: <PropensityPage />,
    churn: <ChurnPage />,
    campaigns: <CampaignsPage />,
    customer360: <Customer360Page />,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar active={page} onNav={setPage} />
      <main className="flex-1 ml-64 p-8">
        {pages[page] || <OverviewPage />}
      </main>
    </div>
  );
}

export default App;
