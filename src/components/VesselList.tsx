import type { Vessel } from "../types";
import { getShipCategory, getShipCategoryLabel, SHIP_COLORS } from "../types";
import type { CollisionRisk } from "../services/collisionDetection";

interface Props {
  vessels: Vessel[];
  risks: Map<number, CollisionRisk>;
  selectedMmsi: number | null;
  onSelect: (mmsi: number) => void;
}

export function VesselList({ vessels, risks, selectedMmsi, onSelect }: Props) {
  const sorted = [...vessels].sort((a, b) => {
    const riskA = risks.get(a.mmsi);
    const riskB = risks.get(b.mmsi);
    const riskOrder = { high: 0, medium: 1, none: 2 };
    const orderA = riskOrder[riskA?.riskLevel ?? "none"];
    const orderB = riskOrder[riskB?.riskLevel ?? "none"];
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="vessel-list">
      <div className="vessel-list-header">
        <h3>Nearby Vessels</h3>
        <span className="vessel-count">{vessels.length}</span>
      </div>
      <div className="vessel-list-items">
        {sorted.length === 0 && (
          <div className="vessel-list-empty">
            Waiting for vessel data...
          </div>
        )}
        {sorted.map((v) => {
          const cat = getShipCategory(v.shipType);
          const color = SHIP_COLORS[cat];
          const isSelected = v.mmsi === selectedMmsi;
          const risk = risks.get(v.mmsi);
          const isRisk = risk && risk.riskLevel !== "none";
          return (
            <button
              key={v.mmsi}
              className={`vessel-list-item ${isSelected ? "selected" : ""} ${isRisk ? `risk-${risk.riskLevel}` : ""}`}
              onClick={() => onSelect(v.mmsi)}
            >
              <div
                className="vessel-color-dot"
                style={{ background: color }}
              />
              <div className="vessel-item-info">
                <span className="vessel-item-name">
                  {isRisk && <span className="risk-icon">{risk.riskLevel === "high" ? "🔴" : "🟡"}</span>}
                  {v.name}
                </span>
                <span className="vessel-item-meta">
                  {getShipCategoryLabel(cat)} · {v.sog.toFixed(1)} kn
                  {isRisk && ` · CPA ${risk.cpa.toFixed(1)}nm in ${risk.tcpa.toFixed(0)}m`}
                </span>
              </div>
              <span className="vessel-item-bearing">{v.cog.toFixed(0)}°</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
