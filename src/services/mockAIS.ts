import type { Vessel } from "../types";

type VesselUpdateCallback = (vessels: Map<number, Vessel>) => void;

const SHIP_NAMES = [
  "EVER GIVEN",
  "MAERSK SEALAND",
  "MSC OSCAR",
  "QUEEN MARY II",
  "ATLANTIC STAR",
  "NORDIC FISHER",
  "PACIFIC VOYAGER",
  "BLUE HORIZON",
  "SILVER WIND",
  "GOLDEN DAWN",
  "OCEAN TITAN",
  "SEA BREEZE",
  "NORTHERN SPIRIT",
  "EMERALD COAST",
  "CRIMSON TIDE",
  "POLAR EXPLORER",
  "SUNSET RUNNER",
  "IRON MONARCH",
  "CORAL PRINCESS",
  "STORM PETREL",
];

const SHIP_TYPES = [30, 36, 37, 60, 70, 71, 72, 80, 81, 40];
const DESTINATIONS = [
  "ROTTERDAM",
  "SINGAPORE",
  "SHANGHAI",
  "HAMBURG",
  "ANTWERP",
  "LOS ANGELES",
  "YOKOHAMA",
  "DUBAI",
  "SANTOS",
  "FELIXSTOWE",
];

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export class MockAISService {
  private vessels = new Map<number, Vessel>();
  private onUpdate: VesselUpdateCallback;
  private lat: number;
  private lng: number;
  private radius: number;
  private interval: ReturnType<typeof setInterval> | null = null;
  private count: number;

  constructor(
    lat: number,
    lng: number,
    radius: number,
    onUpdate: VesselUpdateCallback,
    count = 20
  ) {
    this.lat = lat;
    this.lng = lng;
    this.radius = radius;
    this.onUpdate = onUpdate;
    this.count = count;
  }

  connect() {
    this.generateInitialVessels();
    this.onUpdate(new Map(this.vessels));

    this.interval = setInterval(() => {
      this.updateVesselPositions();
      this.onUpdate(new Map(this.vessels));
    }, 3000);
  }

  private generateInitialVessels() {
    for (let i = 0; i < this.count; i++) {
      const mmsi = 200000000 + Math.floor(Math.random() * 800000000);
      let lat: number, lng: number, cog: number, sog: number;

      if (i < 3) {
        // First 3 vessels are on an approach course toward the user
        const angle = randomInRange(0, 360);
        const distDeg = randomInRange(0.3, 0.8);
        lat = this.lat + Math.cos(angle * Math.PI / 180) * distDeg;
        lng = this.lng + Math.sin(angle * Math.PI / 180) * distDeg;
        // Point course toward user position
        const bearingToUser = Math.atan2(this.lng - lng, this.lat - lat) * 180 / Math.PI;
        cog = (bearingToUser + 360) % 360 + randomInRange(-5, 5);
        sog = randomInRange(8, 16);
      } else {
        lat = this.lat + randomInRange(-this.radius, this.radius);
        lng = this.lng + randomInRange(-this.radius, this.radius);
        cog = randomInRange(0, 360);
        sog = randomInRange(0, 18);
      }

      const vessel: Vessel = {
        mmsi,
        name: SHIP_NAMES[i % SHIP_NAMES.length],
        lat,
        lng,
        cog,
        sog,
        heading: cog + randomInRange(-10, 10),
        shipType: SHIP_TYPES[Math.floor(Math.random() * SHIP_TYPES.length)],
        destination:
          DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)],
        lastUpdate: Date.now(),
      };
      this.vessels.set(mmsi, vessel);
    }
  }

  private updateVesselPositions() {
    for (const [, vessel] of this.vessels) {
      const cogRad = (vessel.cog * Math.PI) / 180;
      const speedFactor = (vessel.sog / 3600) * 3 * 0.01;
      vessel.lat += Math.cos(cogRad) * speedFactor;
      vessel.lng += Math.sin(cogRad) * speedFactor;
      vessel.cog += randomInRange(-2, 2);
      vessel.sog = Math.max(0, vessel.sog + randomInRange(-0.5, 0.5));
      vessel.heading = vessel.cog + randomInRange(-5, 5);
      vessel.lastUpdate = Date.now();
    }
  }

  updatePosition(lat: number, lng: number) {
    this.lat = lat;
    this.lng = lng;
  }

  disconnect() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
