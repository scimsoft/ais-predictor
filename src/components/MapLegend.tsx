import { SHIP_COLORS, getShipCategoryLabel } from "../types";
import type { ShipCategory } from "../types";

const LEGEND_CATEGORIES: ShipCategory[] = [
  "cargo", "tanker", "passenger", "fishing", "tug",
  "sailing", "pleasure", "highspeed", "military", "unknown",
];

export function MapLegend() {
  return (
    <div className="map-legend">
      <div className="legend-title">Vessel Types</div>
      <div className="legend-items">
        {LEGEND_CATEGORIES.map((cat) => (
          <div key={cat} className="legend-item">
            <div className="legend-swatch" style={{ background: SHIP_COLORS[cat] }} />
            <span>{getShipCategoryLabel(cat)}</span>
          </div>
        ))}
      </div>
      <div className="legend-divider" />
      <div className="legend-title">Collision Risk</div>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-swatch risk-high-swatch" />
          <span>High risk (&lt;0.5 nm)</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch risk-medium-swatch" />
          <span>Close approach (&lt;2 nm)</span>
        </div>
      </div>
    </div>
  );
}
