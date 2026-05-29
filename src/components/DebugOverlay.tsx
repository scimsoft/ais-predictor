import { useEffect, useState } from "react";
import type { AISDebugStats } from "../types";
import { getShipCategory, getShipCategoryLabel } from "../types";

interface Props {
  stats: AISDebugStats;
  isLive: boolean;
  vesselCount: number;
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  if (min < 60) return `${min}m ${s}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export function DebugOverlay({ stats, isLive, vesselCount }: Props) {
  // Re-render once a second so the "x seconds ago" / uptime timestamps
  // stay fresh independently of whether new messages have arrived.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const messageEntries = Object.entries(stats.messageCounts).sort(
    (a, b) => b[1] - a[1]
  );
  const shipTypeEntries = Object.entries(stats.shipTypeCounts)
    .map(([k, v]) => [Number(k), v] as const)
    .sort((a, b) => b[1] - a[1]);

  const lastSampleAge = stats.lastSampleAt
    ? Math.round((now - stats.lastSampleAt) / 1000) + "s ago"
    : "never";

  const uptimeMs = stats.connectedSince ? now - stats.connectedSince : 0;
  const uptimeLabel = stats.connectedSince ? formatDuration(uptimeMs) : "not yet";
  const msgsPerSec =
    uptimeMs > 0 && stats.totalMessages > 0
      ? (stats.totalMessages / (uptimeMs / 1000)).toFixed(1)
      : "—";

  return (
    <div className="debug-overlay">
      <div className="debug-overlay-header">AIS Debug</div>

      <div className="debug-section">
        <div className="debug-row">
          <span>Mode</span>
          <strong>{isLive ? "Live" : "Demo"}</strong>
        </div>
        <div className="debug-row">
          <span>Connected for</span>
          <strong>{uptimeLabel}</strong>
        </div>
        <div className="debug-row">
          <span>Total raw messages</span>
          <strong>{stats.totalMessages}</strong>
        </div>
        <div className="debug-row">
          <span>Throughput</span>
          <strong>{msgsPerSec} msgs/sec</strong>
        </div>
        <div className="debug-row">
          <span>Tracked vessels</span>
          <strong>{vesselCount}</strong>
        </div>
        <div className="debug-row">
          <span>✓ Has shipType</span>
          <strong>{stats.vesselsWithType}</strong>
        </div>
        <div className="debug-row">
          <span>○ Static rcvd, Type=0</span>
          <strong>{stats.vesselsTypeZero}</strong>
        </div>
        <div className="debug-row">
          <span>… No static yet</span>
          <strong>{stats.vesselsNoStaticYet}</strong>
        </div>
      </div>

      <div className="debug-section">
        <div className="debug-subheader">Messages by type</div>
        {messageEntries.length === 0 ? (
          <div className="debug-empty">No messages yet</div>
        ) : (
          <ul className="debug-list">
            {messageEntries.map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="debug-section">
        <div className="debug-subheader">Ship-type codes observed</div>
        {shipTypeEntries.length === 0 ? (
          <div className="debug-empty">No static-data Type fields seen yet</div>
        ) : (
          <ul className="debug-list">
            {shipTypeEntries.map(([t, v]) => (
              <li key={t}>
                <span>
                  {t} <em>({getShipCategoryLabel(getShipCategory(t))})</em>
                </span>
                <strong>{v}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stats.lastRawSample && (
        <div className="debug-section">
          <div className="debug-subheader">
            Last raw message ({lastSampleAge})
          </div>
          <pre className="debug-sample">{stats.lastRawSample}</pre>
        </div>
      )}
    </div>
  );
}
