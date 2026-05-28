import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Vessel } from "../types";
import { getShipCategory, getShipCategoryLabel, SHIP_COLORS } from "../types";
import type { CollisionRisk } from "../services/collisionDetection";

function createVesselIcon(vessel: Vessel, risk?: CollisionRisk): L.DivIcon {
  const cat = getShipCategory(vessel.shipType);
  const color = SHIP_COLORS[cat];
  const rotation = vessel.heading || vessel.cog || 0;
  const isHighRisk = risk?.riskLevel === "high";
  const isMediumRisk = risk?.riskLevel === "medium";
  const isRisk = isHighRisk || isMediumRisk;

  const size = isHighRisk ? 44 : isMediumRisk ? 40 : 32;
  const arrowSize = isRisk ? 20 : 16;

  const riskRing = isHighRisk
    ? `<div class="vessel-risk-ring high"></div>`
    : isMediumRisk
      ? `<div class="vessel-risk-ring medium"></div>`
      : "";

  return L.divIcon({
    className: "vessel-icon",
    html: `<div class="vessel-marker-wrapper" style="width:${size}px;height:${size}px;">
      ${riskRing}
      <div class="vessel-marker-bg" style="background:${color};width:${size}px;height:${size}px;"></div>
      <div class="vessel-marker-arrow" style="transform:rotate(${rotation}deg);">
        <svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 L18 20 L12 15 L6 20 Z" fill="#fff" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
        </svg>
      </div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function formatTimestamp(ts: number): string {
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

interface Props {
  vessel: Vessel;
  selected: boolean;
  onSelect: (mmsi: number) => void;
  risk?: CollisionRisk;
}

export function VesselMarker({ vessel, selected, onSelect, risk }: Props) {
  const cat = getShipCategory(vessel.shipType);
  const color = SHIP_COLORS[cat];
  const isRisk = risk && risk.riskLevel !== "none";

  return (
    <Marker
      position={[vessel.lat, vessel.lng]}
      icon={createVesselIcon(vessel, risk)}
      eventHandlers={{ click: () => onSelect(vessel.mmsi) }}
      zIndexOffset={selected ? 1000 : isRisk ? 500 : 0}
    >
      <Popup>
        <div className="vessel-popup">
          <div className="vessel-popup-header" style={{ borderColor: color }}>
            <strong>{vessel.name}</strong>
            <span className="vessel-type-badge" style={{ background: color }}>
              {getShipCategoryLabel(cat)}
            </span>
          </div>
          {isRisk && (
            <div className={`vessel-risk-banner ${risk.riskLevel}`}>
              ⚠️ {risk.riskLevel === "high" ? "Collision risk" : "Close approach"} —
              CPA {risk.cpa.toFixed(2)} nm in {risk.tcpa.toFixed(0)} min
            </div>
          )}
          <table className="vessel-popup-table">
            <tbody>
              <tr><td>MMSI</td><td>{vessel.mmsi}</td></tr>
              <tr><td>Speed</td><td>{vessel.sog.toFixed(1)} kn</td></tr>
              <tr><td>Course</td><td>{vessel.cog.toFixed(0)}°</td></tr>
              <tr><td>Heading</td><td>{vessel.heading.toFixed(0)}°</td></tr>
              {vessel.destination && (
                <tr><td>Dest.</td><td>{vessel.destination}</td></tr>
              )}
              <tr><td>Updated</td><td>{formatTimestamp(vessel.lastUpdate)}</td></tr>
            </tbody>
          </table>
        </div>
      </Popup>
    </Marker>
  );
}
