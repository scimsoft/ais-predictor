import type { Vessel } from "../types";
import { getShipCategory, getShipCategoryLabel, SHIP_COLORS } from "../types";

interface Props {
  vessels: Vessel[];
  selectedMmsi: number | null;
  onSelect: (mmsi: number) => void;
}

export function VesselList({ vessels, selectedMmsi, onSelect }: Props) {
  const sorted = [...vessels].sort((a, b) => a.name.localeCompare(b.name));

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
          return (
            <button
              key={v.mmsi}
              className={`vessel-list-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(v.mmsi)}
            >
              <div
                className="vessel-color-dot"
                style={{ background: color }}
              />
              <div className="vessel-item-info">
                <span className="vessel-item-name">{v.name}</span>
                <span className="vessel-item-meta">
                  {getShipCategoryLabel(cat)} · {v.sog.toFixed(1)} kn
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
