import type { Vessel, AISMessage, AISDebugStats } from "../types";

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

  // --- Debug instrumentation (used by the optional ?debug=1 overlay) ---
  private stats: AISDebugStats = {
    totalMessages: 0,
    messageCounts: {},
    shipTypeCounts: {},
    vesselsWithType: 0,
    vesselsTypeZero: 0,
    vesselsNoStaticYet: 0,
  };
  // MMSIs for which we've received at least one usable static-data message
  // (ShipStaticData with Type defined, StaticDataReport Part B with Valid
  // ReportB, or an ExtendedClassBPositionReport carrying an inline Type).
  // Used to distinguish "vessel broadcasts Type=0" (genuinely unknown by
  // the AIS protocol) from "we haven't seen static data for this vessel yet".
  private mmsisWithStaticData = new Set<number>();

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

  getStats(): AISDebugStats {
    let withType = 0;
    let typeZero = 0;
    let noStaticYet = 0;
    for (const v of this.vessels.values()) {
      if (v.shipType && v.shipType > 0) {
        withType++;
      } else if (this.mmsisWithStaticData.has(v.mmsi)) {
        typeZero++;
      } else {
        noStaticYet++;
      }
    }
    return {
      ...this.stats,
      vesselsWithType: withType,
      vesselsTypeZero: typeZero,
      vesselsNoStaticYet: noStaticYet,
      messageCounts: { ...this.stats.messageCounts },
      shipTypeCounts: { ...this.stats.shipTypeCounts },
    };
  }

  private recordShipType(mmsi: number, t: number | undefined) {
    if (t == null) return;
    this.stats.shipTypeCounts[t] = (this.stats.shipTypeCounts[t] ?? 0) + 1;
    this.mmsisWithStaticData.add(mmsi);
  }

  connect() {
    if (this.ws) this.disconnect();

    this.ws = new WebSocket(AIS_STREAM_URL);

    this.ws.onopen = () => {
      this.stats.connectedSince = Date.now();
      const subscriptionMsg = {
        Apikey: this.apiKey,
        BoundingBoxes: [
          [
            [this.lat - this.radius, this.lng - this.radius],
            [this.lat + this.radius, this.lng + this.radius],
          ],
        ],
        // Include Class B traffic and both static-data variants so vessels
        // can be color-coded by type. Class A vessels broadcast position
        // via PositionReport (1/2/3) and static via ShipStaticData (5).
        // Class B vessels broadcast position via StandardClassBPositionReport
        // (18) / ExtendedClassBPositionReport (19, includes Type) and static
        // via StaticDataReport (24, Type lives in ReportB.ShipType).
        FilterMessageTypes: [
          "PositionReport",
          "ShipStaticData",
          "StandardClassBPositionReport",
          "ExtendedClassBPositionReport",
          "StaticDataReport",
        ],
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
        this.stats.totalMessages++;
        if (text.length < 2000) {
          this.stats.lastRawSample = text;
          this.stats.lastSampleAt = Date.now();
        }
        const msg: AISMessage = JSON.parse(text);
        const mt = msg?.MessageType ?? "(unknown)";
        this.stats.messageCounts[mt] = (this.stats.messageCounts[mt] ?? 0) + 1;
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
    const { MetaData, Message, MessageType } = msg;
    if (!MetaData || !Message) return;

    const mmsi = MetaData.MMSI;
    if (!mmsi) return;
    const existing = this.vessels.get(mmsi);

    // --- Static-data messages: update type/name/destination on existing
    //     vessel, or create a partial entry if we have position metadata.
    if (MessageType === "ShipStaticData" && Message.ShipStaticData) {
      const sd = Message.ShipStaticData;
      // ShipStaticData (Class A msg 5) always carries a Type field — record
      // it even when it's 0, because that's a real "Not available" broadcast.
      if (sd.Type != null) this.recordShipType(mmsi, sd.Type);
      this.applyStaticData(mmsi, existing, {
        shipType: sd.Type,
        name: sd.Name,
        destination: sd.Destination,
        metaLat: MetaData.latitude ?? MetaData.Latitude,
        metaLng: MetaData.longitude ?? MetaData.Longitude,
        metaName: MetaData.ShipName,
      });
      return;
    }

    if (MessageType === "StaticDataReport" && Message.StaticDataReport) {
      const sd = Message.StaticDataReport;
      // StaticDataReport (Class B msg 24) is split across two transmissions:
      //   - Part A (PartNumber=0/false): carries Name in ReportA. ReportB is
      //     present in the JSON but populated with default zeros and
      //     Valid:false. We MUST NOT count its ShipType=0 as a real
      //     broadcast — that would falsely inflate the Type=0 bucket.
      //   - Part B (PartNumber=1/true): carries ShipType in ReportB with
      //     Valid:true. That's the only case where ReportB.ShipType is real.
      const isPartB = sd.PartNumber === true || sd.PartNumber === 1;
      const reportBValid = sd.ReportB?.Valid !== false; // tolerate undefined
      const realShipType =
        isPartB && reportBValid ? sd.ReportB?.ShipType : undefined;

      if (realShipType != null) this.recordShipType(mmsi, realShipType);

      this.applyStaticData(mmsi, existing, {
        shipType: realShipType,
        name: sd.ReportA?.Name,
        metaLat: MetaData.latitude ?? MetaData.Latitude,
        metaLng: MetaData.longitude ?? MetaData.Longitude,
        metaName: MetaData.ShipName,
      });
      return;
    }

    // --- Position-bearing messages: PositionReport (Class A 1/2/3),
    //     StandardClassBPositionReport (18), ExtendedClassBPositionReport
    //     (19, also carries Name + Type so we can color immediately).
    const positionBody =
      Message.PositionReport ??
      Message.StandardClassBPositionReport ??
      Message.ExtendedClassBPositionReport;
    if (!positionBody) return;

    const lat =
      positionBody.Latitude ?? MetaData.latitude ?? MetaData.Latitude;
    const lng =
      positionBody.Longitude ?? MetaData.longitude ?? MetaData.Longitude;
    if (lat == null || lng == null) return;

    // ExtendedClassBPositionReport may carry Name and Type inline.
    const extended = Message.ExtendedClassBPositionReport;
    const inlineName = extended?.Name?.trim();
    const inlineType = extended?.Type;
    if (inlineType != null) this.recordShipType(mmsi, inlineType);

    const vessel: Vessel = {
      mmsi,
      name:
        inlineName ||
        MetaData.ShipName?.trim() ||
        existing?.name ||
        `MMSI ${mmsi}`,
      lat,
      lng,
      cog: positionBody.Cog ?? existing?.cog ?? 0,
      sog: positionBody.Sog ?? existing?.sog ?? 0,
      heading: positionBody.TrueHeading ?? existing?.heading ?? 0,
      // Prefer an inline Type from Extended Class B over a previously known
      // value of 0 (unknown), otherwise keep what we have.
      shipType:
        inlineType && inlineType > 0
          ? inlineType
          : existing?.shipType ?? 0,
      destination: existing?.destination || "",
      lastUpdate: Date.now(),
    };

    this.vessels.set(mmsi, vessel);
    this.onUpdate(new Map(this.vessels));
  }

  private applyStaticData(
    mmsi: number,
    existing: Vessel | undefined,
    data: {
      shipType?: number;
      name?: string;
      destination?: string;
      metaLat?: number;
      metaLng?: number;
      metaName?: string;
    }
  ) {
    const trimmedName = data.name?.trim();
    const trimmedDest = data.destination?.trim();

    if (existing) {
      if (data.shipType && data.shipType > 0) {
        existing.shipType = data.shipType;
      }
      if (trimmedName) {
        existing.name = trimmedName;
      }
      if (trimmedDest) {
        existing.destination = trimmedDest;
      }
      existing.lastUpdate = Date.now();
      this.vessels.set(mmsi, existing);
      this.onUpdate(new Map(this.vessels));
      return;
    }

    // No prior vessel — only seed an entry if we have a position from
    // metadata. AISstream's MetaData carries the last known lat/lng, so
    // this lets static-data messages create a vessel before the first
    // position report arrives.
    if (data.metaLat != null && data.metaLng != null) {
      const vessel: Vessel = {
        mmsi,
        name: trimmedName || data.metaName?.trim() || `MMSI ${mmsi}`,
        lat: data.metaLat,
        lng: data.metaLng,
        cog: 0,
        sog: 0,
        heading: 0,
        shipType: data.shipType ?? 0,
        destination: trimmedDest || "",
        lastUpdate: Date.now(),
      };
      this.vessels.set(mmsi, vessel);
      this.onUpdate(new Map(this.vessels));
    }
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
