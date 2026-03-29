import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Image,
  Globe,
  Zap,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import type { Screen, NavigateMeta } from '../App';
import { listSessions } from '../lib/api';
import type { ScanSession } from '../lib/api';

interface AnalyticsScreenProps {
  navigate: (s: Screen, meta?: NavigateMeta) => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getDayLabel(date: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
}

function StatCard({ icon, value, label, color = '#6366f1' }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          backgroundColor: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-1)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-3)',
            marginTop: 4,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsScreen({ navigate }: AnalyticsScreenProps) {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // ---- Computed stats ----
  const totalScans = sessions.length;
  const totalScreenshots = sessions.reduce((acc, s) => acc + s.screenshots.length, 0);
  const avgScreenshots = totalScans > 0 ? Math.round(totalScreenshots / totalScans) : 0;

  const uniqueDomains = Array.from(new Set(sessions.map((s) => getHostname(s.url))));

  // Last 7 days activity
  const last7Days: { label: string; date: Date; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const count = sessions.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    last7Days.push({ label: getDayLabel(d), date: d, count });
  }

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  sessions.forEach((s) => {
    s.screenshots.forEach((sc) => {
      const cat = (sc as any).category ?? 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
    });
  });
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCategoryCount = topCategories[0]?.[1] ?? 1;

  // Top domains
  const domainCountMap: Record<string, number> = {};
  sessions.forEach((s) => {
    const h = getHostname(s.url);
    domainCountMap[h] = (domainCountMap[h] ?? 0) + 1;
  });
  const topDomains = Object.entries(domainCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxBarCount = Math.max(...last7Days.map((d) => d.count), 1);

  // ---- Render ----
  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'auto',
        backgroundColor: 'var(--bg-1)',
        color: 'var(--text-1)',
        padding: '32px 40px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-1)',
              letterSpacing: '-0.02em',
            }}
          >
            Analytics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-3)' }}>
            Insights from your scan history
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 14px',
            color: 'var(--text-2)',
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 300,
            color: 'var(--text-3)',
            fontSize: 14,
            gap: 10,
          }}
        >
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Loading analytics...
        </div>
      ) : totalScans === 0 ? (
        /* Empty state */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 380,
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: 'var(--bg-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}
          >
            <BarChart2 size={28} color="var(--text-3)" />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-1)' }}>
            No data yet
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)', maxWidth: 280 }}>
            Scan some websites to see your analytics here
          </p>
          <button
            onClick={() => navigate('scan')}
            style={{
              marginTop: 8,
              padding: '9px 20px',
              backgroundColor: '#6366f1',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start scanning
          </button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard
              icon={<TrendingUp size={18} />}
              value={totalScans}
              label="Total Scans"
              color="#6366f1"
            />
            <StatCard
              icon={<Image size={18} />}
              value={totalScreenshots}
              label="Total Screenshots"
              color="#a78bfa"
            />
            <StatCard
              icon={<Globe size={18} />}
              value={uniqueDomains.length}
              label="Unique Sites"
              color="#8b5cf6"
            />
            <StatCard
              icon={<Zap size={18} />}
              value={avgScreenshots}
              label="Avg Pages / Scan"
              color="#6366f1"
            />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Activity bar chart */}
            <div
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '20px 24px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 18px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <BarChart2 size={15} color="#6366f1" />
                Activity (Last 7 Days)
              </h3>
              <svg
                viewBox="0 0 280 120"
                width="100%"
                style={{ overflow: 'visible', display: 'block' }}
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                {last7Days.map((day, i) => {
                  const barW = 26;
                  const gap = 14;
                  const chartH = 80;
                  const barH = maxBarCount > 0 ? (day.count / maxBarCount) * chartH : 0;
                  const y = chartH - barH;

                  return (
                    <g key={i}>
                      {/* Bar */}
                      <rect
                        x={i * (barW + gap)}
                        y={y}
                        width={barW}
                        height={Math.max(barH, 2)}
                        rx={5}
                        fill={day.count > 0 ? 'url(#barGrad)' : 'var(--bg-3, #2a2a2a)'}
                        opacity={day.count > 0 ? 1 : 0.4}
                      />
                      {/* Count label above bar */}
                      {day.count > 0 && (
                        <text
                          x={i * (barW + gap) + barW / 2}
                          y={y - 5}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#a78bfa"
                          fontWeight="600"
                        >
                          {day.count}
                        </text>
                      )}
                      {/* Day label */}
                      <text
                        x={i * (barW + gap) + barW / 2}
                        y={100}
                        textAnchor="middle"
                        fontSize="9"
                        fill="var(--text-3, #666)"
                      >
                        {day.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Category breakdown */}
            <div
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '20px 24px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 18px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <TrendingUp size={15} color="#8b5cf6" />
                Category Breakdown
              </h3>
              {topCategories.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                  No category data available
                </p>
              ) : (
                <svg
                  viewBox={`0 0 280 ${topCategories.length * 26}`}
                  width="100%"
                  style={{ overflow: 'visible', display: 'block' }}
                >
                  {topCategories.map(([cat, count], i) => {
                    const rowH = 22;
                    const y = i * 26;
                    const maxBarW = 160;
                    const barW = (count / maxCategoryCount) * maxBarW;
                    const pct = Math.round((count / totalScreenshots) * 100);

                    return (
                      <g key={cat}>
                        {/* Category label */}
                        <text
                          x={0}
                          y={y + 14}
                          fontSize="10"
                          fill="var(--text-2, #ccc)"
                          fontWeight="500"
                        >
                          {cat.length > 14 ? cat.slice(0, 13) + '…' : cat}
                        </text>
                        {/* Background track */}
                        <rect
                          x={100}
                          y={y + 4}
                          width={maxBarW}
                          height={rowH - 8}
                          rx={4}
                          fill="var(--bg-3, #1a1a1a)"
                        />
                        {/* Fill bar */}
                        <rect
                          x={100}
                          y={y + 4}
                          width={Math.max(barW, 2)}
                          height={rowH - 8}
                          rx={4}
                          fill="#6366f1"
                          opacity={0.85}
                        />
                        {/* Count + pct */}
                        <text
                          x={268}
                          y={y + 14}
                          fontSize="9"
                          fill="#a78bfa"
                          textAnchor="end"
                          fontWeight="600"
                        >
                          {count} ({pct}%)
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Top Sites */}
          <div
            style={{
              backgroundColor: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px 24px',
            }}
          >
            <h3
              style={{
                margin: '0 0 14px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-1)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Globe size={15} color="#6366f1" />
              Top Sites
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topDomains.map(([domain, count], i) => {
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                return (
                  <div
                    key={domain}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 12px',
                      backgroundColor: 'var(--bg-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-3)',
                        width: 16,
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <img
                      src={faviconUrl}
                      alt=""
                      width={16}
                      height={16}
                      style={{ borderRadius: 3, flexShrink: 0 }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {domain}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#a78bfa',
                        backgroundColor: 'rgba(167, 139, 250, 0.12)',
                        border: '1px solid rgba(167, 139, 250, 0.25)',
                        borderRadius: 20,
                        padding: '2px 9px',
                        flexShrink: 0,
                      }}
                    >
                      {count} scan{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
