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

export interface AISMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    MMSI_String: string;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Cog: number;
      Sog: number;
      TrueHeading: number;
      NavigationalStatus: number;
      UserID: number;
    };
    ShipStaticData?: {
      Type: number;
      Destination: string;
      Name: string;
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
  | "unknown";

export function getShipCategory(shipType: number): ShipCategory {
  if (shipType >= 70 && shipType <= 79) return "cargo";
  if (shipType >= 80 && shipType <= 89) return "tanker";
  if (shipType >= 60 && shipType <= 69) return "passenger";
  if (shipType === 30) return "fishing";
  if (shipType >= 31 && shipType <= 32) return "tug";
  if (shipType === 35) return "military";
  if (shipType === 36) return "sailing";
  if (shipType === 37) return "pleasure";
  if (shipType >= 40 && shipType <= 49) return "highspeed";
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
  unknown: "#9E9E9E",
};
