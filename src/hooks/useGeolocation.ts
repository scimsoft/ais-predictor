import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  lat: number;
  lng: number;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

const DEFAULT_POSITION = { lat: 51.9, lng: 4.5 }; // Rotterdam area

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() => ({
    ...DEFAULT_POSITION,
    accuracy: null,
    error: navigator.geolocation
      ? null
      : "Geolocation not supported — showing Rotterdam area",
    loading: !!navigator.geolocation,
  }));

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setState({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      error: null,
      loading: false,
    });
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    setState((s) => ({
      ...s,
      loading: false,
      error: `${err.message} — showing Rotterdam area`,
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  }, [onSuccess, onError]);

  return state;
}
