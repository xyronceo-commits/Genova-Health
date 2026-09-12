import { useState, useRef, useCallback, useEffect } from 'react';

interface LiveLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function useLiveLocationTracking() {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device.');
      return;
    }
    setError(null);
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Emergency contacts will not receive live updates.'
            : 'Live location temporarily unavailable — retrying.'
        );
        // Do not stop tracking on a transient error; watchPosition will keep retrying.
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Always clean up on unmount so tracking never keeps running (and draining battery)
  // after the user navigates away from the Emergency screen.
  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  return { location, error, isTracking, startTracking, stopTracking };
}
