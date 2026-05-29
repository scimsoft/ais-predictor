export interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  cog: number; // course over ground (degrees)
  sog: number; // speed over ground (knots)
  heading: number;
  shipType: number;
  destination: string;
  lastUpdate: number; // timestamp ms
}

interface PositionFields {
  Cog?: number;
  Sog?: number;
  TrueHeading?: number;
  Latitude?: number;
  Longitude?: number;
  UserID?: number;
}

export interface AISDebugStats {
  // Total raw messages received from the websocket
  totalMessages: number;
  // When the WebSocket most recently transitioned to OPEN. Used to compute
  // uptime + msgs/sec so we can tell whether the connection is healthy or
  // being throttled by the browser.
  connectedSince?: number;
  // Counts keyed by AISstream's MessageType discriminator
  // (e.g. PositionReport, ShipStaticData, StandardClassBPositionReport, …)
  messageCounts: Record<string, number>;
  // Distribution of every distinct *valid* ship-type code observed. Only
  // includes codes that came from a message that actually carried type
  // information — Part A StaticDataReport messages (ShipType field absent
  // or invalid) are excluded.
  shipTypeCounts: Record<number, number>;
  // Tracked-vessel breakdown
  vesselsWithType: number; //  shipType > 0
  vesselsTypeZero: number; //  static data received but Type=0 ("Not available")
  vesselsNoStaticYet: number; //  no usable static-data message received yet
  // The most recent raw message text (truncated) for at-a-glance inspection
  lastRawSample?: string;
  lastSampleAt?: number;
}

export interface AISMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    MMSI_String?: string;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    Latitude?: number;
    Longitude?: number;
    time_utc?: string;
  };
  Message: {
    // Class A position (msg type 1/2/3)
    PositionReport?: PositionFields & { NavigationalStatus?: number };
    // Class A static data (msg type 5)
    ShipStaticData?: {
      Type?: number;
      Destination?: string;
      Name?: string;
    };
    // Class B basic position (msg type 18)
    StandardClassBPositionReport?: PositionFields;
    // Class B extended position (msg type 19) — includes Name + Type
    ExtendedClassBPositionReport?: PositionFields & {
      Name?: string;
      Type?: number;
    };
    // Class B static data (msg type 24, split into Part A / Part B)
    StaticDataReport?: {
      PartNumber?: boolean | number;
      ReportA?: { Name?: string; Valid?: boolean };
      ReportB?: { ShipType?: number; CallSign?: string; Valid?: boolean };
    };
  };
}

export type ShipCategory =
  | "cargo"
  | "tanker"
  | "passenger"
  | "fishing"
  | "tug"
  | "military"
  | "sailing"
  | "pleasure"
  | "highspeed"
  | "service"
  | "wig"
  | "other"
  | "unknown";

// ITU AIS ship type codes (see ITU-R M.1371-5, Annex 8, Table 53).
// Anything that isn't explicitly mapped falls back to "unknown".
export function getShipCategory(shipType: number): ShipCategory {
  if (shipType >= 70 && shipType <= 79) return "cargo";
  if (shipType >= 80 && shipType <= 89) return "tanker";
  if (shipType >= 60 && shipType <= 69) return "passenger";
  if (shipType >= 40 && shipType <= 49) return "highspeed";
  if (shipType >= 20 && shipType <= 29) return "wig";
  if (shipType === 30) return "fishing";
  // 31/32 = Towing (protocol). 52 = Tug (operator-assigned). Treat as one bucket.
  if (shipType === 31 || shipType === 32 || shipType === 52) return "tug";
  if (shipType === 35) return "military";
  if (shipType === 36) return "sailing";
  if (shipType === 37) return "pleasure";
  // Port-service / safety vessels: dredging, diving, pilot, SAR, port tender,
  // anti-pollution, law enforcement, medical transport, noncombatant, etc.
  if (
    shipType === 33 ||
    shipType === 34 ||
    shipType === 50 ||
    shipType === 51 ||
    (shipType >= 53 && shipType <= 59)
  ) {
    return "service";
  }
  // 90-99 = "Other Type" (catch-all that many transponders broadcast).
  if (shipType >= 90 && shipType <= 99) return "other";
  return "unknown";
}

export function getShipCategoryLabel(cat: ShipCategory): string {
  const labels: Record<ShipCategory, string> = {
    cargo: "Cargo",
    tanker: "Tanker",
    passenger: "Passenger",
    fishing: "Fishing",
    tug: "Tug / Towing",
    military: "Military",
    sailing: "Sailing",
    pleasure: "Pleasure Craft",
    highspeed: "High-Speed Craft",
    service: "Port Service / SAR",
    wig: "Wing-In-Ground",
    other: "Other",
    unknown: "Unknown",
  };
  return labels[cat];
}

export const SHIP_COLORS: Record<ShipCategory, string> = {
  cargo: "#4CAF50",
  tanker: "#F44336",
  passenger: "#2196F3",
  fishing: "#FF9800",
  tug: "#9C27B0",
  military: "#607D8B",
  sailing: "#00BCD4",
  pleasure: "#E91E63",
  highspeed: "#FFEB3B",
  service: "#00897B",
  wig: "#7E57C2",
  other: "#795548",
  unknown: "#9E9E9E",
};
