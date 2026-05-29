import { useState, useMemo } from "react";
import { MapView } from "./components/MapView";
import { MapLegend } from "./components/MapLegend";
import { VesselList } from "./components/VesselList";
import { StatusBar } from "./components/StatusBar";
import { DebugOverlay } from "./components/DebugOverlay";
import { useGeolocation } from "./hooks/useGeolocation";
import { useAIS } from "./hooks/useAIS";
import { assessCollisionRisks } from "./services/collisionDetection";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Toggle the debug overlay by appending ?debug=1 (or #debug=1) to the URL.
const debugEnabled =
  typeof window !== "undefined" &&
  (new URLSearchParams(window.location.search).get("debug") === "1" ||
    window.location.hash.includes("debug=1"));

function App() {
  const geo = useGeolocation();
  const { vessels, isLive, connected, stats } = useAIS(
    geo.lat,
    geo.lng,
    geo.loading,
    debugEnabled
  );
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const risks = useMemo(
    () => assessCollisionRisks(vessels, geo.lat, geo.lng),
    [vessels, geo.lat, geo.lng]
  );

  const riskCount = useMemo(
    () => [...risks.values()].filter((r) => r.riskLevel !== "none").length,
    [risks]
  );

  if (geo.loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Acquiring position...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <StatusBar
        isLive={isLive}
        connected={connected}
        vesselCount={vessels.size}
        riskCount={riskCount}
        geoError={geo.error}
      />

      <div className="app-body">
        <MapView
          lat={geo.lat}
          lng={geo.lng}
          vessels={vessels}
          risks={risks}
          selectedMmsi={selectedMmsi}
          onSelect={setSelectedMmsi}
        />

        <MapLegend />

        <button
          className={`panel-toggle ${panelOpen ? "open" : ""}`}
          onClick={() => setPanelOpen(!panelOpen)}
          aria-label="Toggle vessel list"
        >
          ‹
        </button>

        {panelOpen && (
          <VesselList
            vessels={[...vessels.values()]}
            risks={risks}
            selectedMmsi={selectedMmsi}
            onSelect={setSelectedMmsi}
          />
        )}

        {debugEnabled && (
          <DebugOverlay
            stats={stats}
            isLive={isLive}
            vesselCount={vessels.size}
          />
        )}
      </div>
    </div>
  );
}

export default App;
