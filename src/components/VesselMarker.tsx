import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Vessel } from "../types";
import { getShipCategory, getShipCategoryLabel, SHIP_COLORS } from "../types";

function createVesselIcon(vessel: Vessel): L.DivIcon {
  const cat = getShipCategory(vessel.shipType);
  const color = SHIP_COLORS[cat];
  const rotation = vessel.heading || vessel.cog || 0;

  return L.divIcon({
    className: "vessel-icon",
    html: `<div style="transform: rotate(${rotation}deg); display: flex; align-items: center; justify-content: center;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2 L18 20 L12 16 L6 20 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
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
}

export function VesselMarker({ vessel, selected, onSelect }: Props) {
  const cat = getShipCategory(vessel.shipType);
  const color = SHIP_COLORS[cat];

  return (
    <Marker
      position={[vessel.lat, vessel.lng]}
      icon={createVesselIcon(vessel)}
      eventHandlers={{ click: () => onSelect(vessel.mmsi) }}
      zIndexOffset={selected ? 1000 : 0}
    >
      <Popup>
        <div className="vessel-popup">
          <div className="vessel-popup-header" style={{ borderColor: color }}>
            <strong>{vessel.name}</strong>
            <span className="vessel-type-badge" style={{ background: color }}>
              {getShipCategoryLabel(cat)}
            </span>
          </div>
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
