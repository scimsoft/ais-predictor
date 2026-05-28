interface Props {
  isLive: boolean;
  connected: boolean;
  vesselCount: number;
  riskCount: number;
  geoError: string | null;
}

export function StatusBar({ isLive, connected, vesselCount, riskCount, geoError }: Props) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className={`status-dot ${connected ? "connected" : ""}`} />
        <span className="status-text">
          {isLive ? "Live AIS Stream" : "Demo Mode (simulated vessels)"}
        </span>
      </div>
      <div className="status-right">
        {geoError && <span className="status-warning">{geoError}</span>}
        {riskCount > 0 && (
          <span className="status-risk">⚠️ {riskCount} approaching</span>
        )}
        <span className="status-count">{vesselCount} vessels</span>
      </div>
    </div>
  );
}
