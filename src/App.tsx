import { useState } from "react";
import { MapView } from "./components/MapView";
import { VesselList } from "./components/VesselList";
import { StatusBar } from "./components/StatusBar";
import { useGeolocation } from "./hooks/useGeolocation";
import { useAIS } from "./hooks/useAIS";
import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const geo = useGeolocation();
  const { vessels, isLive, connected } = useAIS(geo.lat, geo.lng, geo.loading);
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

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
        geoError={geo.error}
      />

      <div className="app-body">
        <MapView
          lat={geo.lat}
          lng={geo.lng}
          vessels={vessels}
          selectedMmsi={selectedMmsi}
          onSelect={setSelectedMmsi}
        />

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
            selectedMmsi={selectedMmsi}
            onSelect={setSelectedMmsi}
          />
        )}
      </div>
    </div>
  );
}

export default App;
