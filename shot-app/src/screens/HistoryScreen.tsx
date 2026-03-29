import { useState, useEffect } from 'react';
import {
  Globe,
  Clock,
  Image,
  RefreshCw,
  Search,
  ChevronRight,
} from 'lucide-react';
import type { Screen, NavigateMeta } from '../App';
import { listSessions } from '../lib/api';
import type { ScanSession } from '../lib/api';

interface HistoryScreenProps {
  navigate: (s: Screen, meta?: NavigateMeta) => void;
  onOpenSession: (id: string) => void;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 2) return 'Yesterday';
  return `${diffDays} days ago`;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function StatusBadge({ status }: { status: ScanSession['status'] }) {
  const isComplete = status === 'complete';
  const isError = status === 'error';
  void (!isComplete && !isError);

  const styles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    backgroundColor: isComplete
      ? 'rgba(34, 197, 94, 0.15)'
      : isError
      ? 'rgba(239, 68, 68, 0.15)'
      : 'rgba(245, 158, 11, 0.15)',
    color: isComplete ? '#4ade80' : isError ? '#f87171' : '#fbbf24',
    border: `1px solid ${
      isComplete
        ? 'rgba(74, 222, 128, 0.3)'
        : isError
        ? 'rgba(248, 113, 113, 0.3)'
        : 'rgba(251, 191, 36, 0.3)'
    }`,
  };

  return (
    <span style={styles}>
      {isComplete ? 'Complete' : isError ? 'Error' : 'In progress'}
    </span>
  );
}

export default function HistoryScreen({ navigate, onOpenSession }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [_deleting] = useState<Set<string>>(new Set());

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

  const filtered = sessions
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const hostname = getHostname(s.url);
      return s.url.toLowerCase().includes(q) || hostname.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div
      style={{
        height: '100dvh',
        backgroundColor: 'var(--bg-1)',
        color: 'var(--text-1)',
        padding: '32px 40px',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 16,
          flexWrap: 'wrap',
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
            History
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-3)' }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} captured
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '7px 12px',
              minWidth: 220,
            }}
          >
            <Search size={14} color="var(--text-3)" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-1)',
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>

          {/* Refresh */}
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
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
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
          Loading sessions...
        </div>
      ) : filtered.length === 0 && sessions.length === 0 ? (
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
            <Globe size={28} color="var(--text-3)" />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-1)' }}>
            No scans yet
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)', maxWidth: 280 }}>
            Start by scanning a website from the home screen
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
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.15s',
            }}
          >
            Start scanning
            <ChevronRight size={15} />
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 280,
            gap: 8,
            color: 'var(--text-3)',
          }}
        >
          <Search size={28} />
          <p style={{ margin: 0, fontSize: 14 }}>No sessions match "{search}"</p>
        </div>
      ) : (
        /* Session grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((session) => {
            const hostname = getHostname(session.url);
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

            return (
              <SessionCard
                key={session.id}
                session={session}
                hostname={hostname}
                faviconUrl={faviconUrl}
                onOpen={() => onOpenSession(session.id)}
              />
            );
          })}
        </div>
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

interface SessionCardProps {
  session: ScanSession;
  hostname: string;
  faviconUrl: string;
  onOpen: () => void;
}

function SessionCard({ session, hostname, faviconUrl, onOpen }: SessionCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: 'var(--bg-2)',
        border: `1px solid ${hovered ? 'rgba(99, 102, 241, 0.5)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: hovered
          ? '0 0 0 3px rgba(99, 102, 241, 0.12), 0 4px 16px rgba(0,0,0,0.25)'
          : '0 1px 4px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Top row: favicon + hostname + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={faviconUrl}
          alt=""
          width={20}
          height={20}
          style={{ borderRadius: 4, flexShrink: 0 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-1)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hostname}
        </span>
        <StatusBadge status={session.status} />
      </div>

      {/* URL */}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--text-3)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {session.url}
      </p>

      {/* Meta row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontSize: 12,
          color: 'var(--text-3)',
          marginTop: 2,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} />
          {getRelativeTime(session.createdAt)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Image size={12} />
          {session.screenshots.length} screenshot{session.screenshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Open arrow */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 2,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: '#818cf8',
            fontWeight: 500,
          }}
        >
          Open session <ChevronRight size={13} />
        </span>
      </div>
    </div>
  );
}
