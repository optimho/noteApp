"use client";

import { useEffect, useState } from "react";

export function useCameraAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setAvailable(false);
      return;
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => setAvailable(devices.some((d) => d.kind === "videoinput")))
      .catch(() => setAvailable(false));
  }, []);

  return available;
}