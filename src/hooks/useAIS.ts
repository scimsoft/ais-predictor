import { useState, useEffect, useRef, useMemo } from "react";
import type { Vessel } from "../types";
import { AISStreamService } from "../services/aisStream";
import { MockAISService } from "../services/mockAIS";

const AIS_API_KEY = import.meta.env.VITE_AIS_API_KEY as string | undefined;
const SEARCH_RADIUS = 2; // degrees (~55km)

export function useAIS(lat: number, lng: number, geoLoading: boolean) {
  const [vessels, setVessels] = useState<Map<number, Vessel>>(new Map());
  const isLive = useMemo(() => !!AIS_API_KEY, []);
  const [connected, setConnected] = useState(false);
  const serviceRef = useRef<AISStreamService | MockAISService | null>(null);

  useEffect(() => {
    if (geoLoading) return;

    const handleUpdate = (v: Map<number, Vessel>) => {
      setVessels(v);
      setConnected(true);
    };

    if (AIS_API_KEY) {
      const svc = new AISStreamService(
        AIS_API_KEY,
        lat,
        lng,
        SEARCH_RADIUS,
        handleUpdate
      );
      serviceRef.current = svc;
      svc.connect();
    } else {
      const svc = new MockAISService(lat, lng, SEARCH_RADIUS, handleUpdate);
      serviceRef.current = svc;
      svc.connect();
    }

    return () => {
      serviceRef.current?.disconnect();
      serviceRef.current = null;
    };
  }, [lat, lng, geoLoading]);

  return { vessels, isLive, connected };
}
