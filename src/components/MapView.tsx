import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Vessel } from "../types";
import type { CollisionRisk } from "../services/collisionDetection";
import { VesselMarker } from "./VesselMarker";
import { useEffect } from "react";

const userIcon = L.divIcon({
  className: "user-icon",
  html: `<div class="user-position-marker">
    <div class="user-position-pulse"></div>
    <div class="user-position-dot"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FlyToSelected({ vessel }: { vessel: Vessel | null }) {
  const map = useMap();
  useEffect(() => {
    if (vessel) {
      map.flyTo([vessel.lat, vessel.lng], Math.max(map.getZoom(), 12), {
        duration: 0.8,
      });
    }
  }, [vessel, map]);
  return null;
}

interface Props {
  lat: number;
  lng: number;
  vessels: Map<number, Vessel>;
  risks: Map<number, CollisionRisk>;
  selectedMmsi: number | null;
  onSelect: (mmsi: number) => void;
}

export function MapView({ lat, lng, vessels, risks, selectedMmsi, onSelect }: Props) {
  const selectedVessel = selectedMmsi ? vessels.get(selectedMmsi) ?? null : null;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={11}
      className="map-container"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[lat, lng]} icon={userIcon}>
        <Popup>Your position</Popup>
      </Marker>

      {[...vessels.values()].map((v) => (
        <VesselMarker
          key={v.mmsi}
          vessel={v}
          selected={v.mmsi === selectedMmsi}
          onSelect={onSelect}
          risk={risks.get(v.mmsi)}
        />
      ))}

      <FlyToSelected vessel={selectedVessel} />
    </MapContainer>
  );
}
