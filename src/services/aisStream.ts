import type { Vessel, AISMessage } from "../types";

const AIS_STREAM_URL = "wss://stream.aisstream.io/v0/stream";

type VesselUpdateCallback = (vessels: Map<number, Vessel>) => void;

export class AISStreamService {
  private ws: WebSocket | null = null;
  private vessels = new Map<number, Vessel>();
  private onUpdate: VesselUpdateCallback;
  private apiKey: string;
  private lat: number;
  private lng: number;
  private radius: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    apiKey: string,
    lat: number,
    lng: number,
    radius: number,
    onUpdate: VesselUpdateCallback
  ) {
    this.apiKey = apiKey;
    this.lat = lat;
    this.lng = lng;
    this.radius = radius;
    this.onUpdate = onUpdate;
  }

  connect() {
    if (this.ws) this.disconnect();

    this.ws = new WebSocket(AIS_STREAM_URL);

    this.ws.onopen = () => {
      const subscriptionMsg = {
        Apikey: this.apiKey,
        BoundingBoxes: [
          [
            [this.lat - this.radius, this.lng - this.radius],
            [this.lat + this.radius, this.lng + this.radius],
          ],
        ],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      };
      this.ws?.send(JSON.stringify(subscriptionMsg));
    };

    this.ws.onmessage = async (event) => {
      try {
        let text: string;
        if (event.data instanceof Blob) {
          text = await event.data.text();
        } else {
          text = event.data;
        }
        const msg: AISMessage = JSON.parse(text);
        this.processMessage(msg);
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    this.startStaleCleanup();
  }

  private processMessage(msg: AISMessage) {
    const { MetaData, Message } = msg;
    if (!MetaData) return;

    const mmsi = MetaData.MMSI;
    const existing = this.vessels.get(mmsi);

    // Handle ShipStaticData messages (vessel type, name, destination)
    if (Message?.ShipStaticData) {
      if (existing) {
        if (Message.ShipStaticData.Type) {
          existing.shipType = Message.ShipStaticData.Type;
        }
        if (Message.ShipStaticData.Name?.trim()) {
          existing.name = Message.ShipStaticData.Name.trim();
        }
        if (Message.ShipStaticData.Destination?.trim()) {
          existing.destination = Message.ShipStaticData.Destination.trim();
        }
        existing.lastUpdate = Date.now();
        this.vessels.set(mmsi, existing);
        this.onUpdate(new Map(this.vessels));
      } else {
        // Static data for a vessel we haven't seen yet — store partial entry
        const lat = MetaData.latitude ?? MetaData.Latitude;
        const lng = MetaData.longitude ?? MetaData.Longitude;
        if (lat && lng) {
          const vessel: Vessel = {
            mmsi,
            name: Message.ShipStaticData.Name?.trim() || `MMSI ${mmsi}`,
            lat,
            lng,
            cog: 0,
            sog: 0,
            heading: 0,
            shipType: Message.ShipStaticData.Type ?? 0,
            destination: Message.ShipStaticData.Destination?.trim() || "",
            lastUpdate: Date.now(),
          };
          this.vessels.set(mmsi, vessel);
          this.onUpdate(new Map(this.vessels));
        }
      }
      return;
    }

    // Handle PositionReport messages
    const lat = MetaData.latitude ?? MetaData.Latitude;
    const lng = MetaData.longitude ?? MetaData.Longitude;

    if (!lat || !lng) return;

    const vessel: Vessel = {
      mmsi,
      name:
        MetaData.ShipName?.trim() ||
        existing?.name ||
        `MMSI ${mmsi}`,
      lat,
      lng,
      cog: Message?.PositionReport?.Cog ?? existing?.cog ?? 0,
      sog: Message?.PositionReport?.Sog ?? existing?.sog ?? 0,
      heading:
        Message?.PositionReport?.TrueHeading ?? existing?.heading ?? 0,
      shipType: existing?.shipType ?? 0,
      destination: existing?.destination || "",
      lastUpdate: Date.now(),
    };

    this.vessels.set(mmsi, vessel);
    this.onUpdate(new Map(this.vessels));
  }

  private startStaleCleanup() {
    this.staleTimer = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 10 * 60 * 1000;
      let changed = false;
      for (const [mmsi, vessel] of this.vessels) {
        if (now - vessel.lastUpdate > staleThreshold) {
          this.vessels.delete(mmsi);
          changed = true;
        }
      }
      if (changed) this.onUpdate(new Map(this.vessels));
    }, 60000);
  }

  updatePosition(lat: number, lng: number) {
    this.lat = lat;
    this.lng = lng;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.disconnect();
      this.connect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
