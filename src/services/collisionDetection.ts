import type { Vessel } from "../types";

export interface CollisionRisk {
  mmsi: number;
  cpa: number; // Closest Point of Approach in nautical miles
  tcpa: number; // Time to CPA in minutes
  riskLevel: "high" | "medium" | "none";
}

const DEG_TO_RAD = Math.PI / 180;
const NM_PER_DEG_LAT = 60;

function degToNm(degLat: number, degLng: number, refLat: number): { x: number; y: number } {
  return {
    x: degLng * NM_PER_DEG_LAT * Math.cos(refLat * DEG_TO_RAD),
    y: degLat * NM_PER_DEG_LAT,
  };
}

/**
 * Calculate CPA (Closest Point of Approach) between a vessel and a stationary point (user).
 * Returns distance in nautical miles and time in minutes.
 */
function calculateCPA(
  vessel: Vessel,
  userLat: number,
  userLng: number
): { cpa: number; tcpa: number } {
  const relPos = degToNm(vessel.lat - userLat, vessel.lng - userLng, userLat);

  if (vessel.sog < 0.5) {
    const dist = Math.sqrt(relPos.x * relPos.x + relPos.y * relPos.y);
    return { cpa: dist, tcpa: Infinity };
  }

  const cogRad = vessel.cog * DEG_TO_RAD;
  const vx = vessel.sog * Math.sin(cogRad); // knots eastward
  const vy = vessel.sog * Math.cos(cogRad); // knots northward

  // User is stationary, so relative velocity is just vessel velocity
  // Time of CPA: t = -(pos · vel) / (vel · vel)
  const dot = relPos.x * vx + relPos.y * vy;
  const velSq = vx * vx + vy * vy;
  const tHours = -dot / velSq;

  if (tHours < 0) {
    // Vessel is moving away
    const dist = Math.sqrt(relPos.x * relPos.x + relPos.y * relPos.y);
    return { cpa: dist, tcpa: -1 };
  }

  const cpaX = relPos.x + vx * tHours;
  const cpaY = relPos.y + vy * tHours;
  const cpa = Math.sqrt(cpaX * cpaX + cpaY * cpaY);
  const tcpa = tHours * 60; // convert to minutes

  return { cpa, tcpa };
}

const CPA_HIGH_THRESHOLD = 0.5; // nautical miles
const CPA_MEDIUM_THRESHOLD = 2.0;
const TCPA_MAX = 30; // only consider vessels arriving within 30 minutes

export function assessCollisionRisks(
  vessels: Map<number, Vessel>,
  userLat: number,
  userLng: number
): Map<number, CollisionRisk> {
  const risks = new Map<number, CollisionRisk>();

  for (const [mmsi, vessel] of vessels) {
    const { cpa, tcpa } = calculateCPA(vessel, userLat, userLng);

    let riskLevel: CollisionRisk["riskLevel"] = "none";

    if (tcpa >= 0 && tcpa <= TCPA_MAX) {
      if (cpa <= CPA_HIGH_THRESHOLD) {
        riskLevel = "high";
      } else if (cpa <= CPA_MEDIUM_THRESHOLD) {
        riskLevel = "medium";
      }
    }

    risks.set(mmsi, { mmsi, cpa, tcpa, riskLevel });
  }

  return risks;
}
