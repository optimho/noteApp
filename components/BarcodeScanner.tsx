"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onScanAction: (rawValue: string, format: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScanAction, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("scanning");

        const useNative = typeof BarcodeDetector !== "undefined";

        if (useNative) {
          const detector = new BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "data_matrix", "pdf417", "aztec"],
          });

          function scan() {
            if (cancelled || scannedRef.current) return;
            if (videoRef.current && videoRef.current.readyState >= 2) {
              detector.detect(videoRef.current).then((results) => {
                const first = results[0];
                if (first && !scannedRef.current) {
                  scannedRef.current = true;
                  onScanAction(first.rawValue, first.format);
                }
              }).catch(() => {});
            }
            rafRef.current = requestAnimationFrame(scan);
          }
          rafRef.current = requestAnimationFrame(scan);
        } else {
          // ZXing fallback
          const canvas = document.createElement("canvas");
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();

          function scan() {
            if (cancelled || scannedRef.current || !videoRef.current) return;
            const video = videoRef.current;
            if (video.readyState >= 2) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              canvas.getContext("2d")!.drawImage(video, 0, 0);
              try {
                const result = reader.decodeFromCanvas(canvas);
                if (result && !scannedRef.current) {
                  scannedRef.current = true;
                  onScanAction(result.getText(), result.getBarcodeFormat().toString());
                }
              } catch { /* no code found in frame */ }
            }
            rafRef.current = requestAnimationFrame(scan);
          }
          rafRef.current = requestAnimationFrame(scan);
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err?.name === "NotAllowedError" ? "Camera permission denied." : "Could not start camera.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onScanAction]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white text-sm">
          {status === "starting" && "Starting camera…"}
          {status === "scanning" && "Point at a QR code or barcode"}
          {status === "error" && errorMsg}
        </span>
        <button
          onClick={onClose}
          className="text-white text-2xl leading-none px-2"
          aria-label="Close scanner"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Viewfinder overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white rounded-lg opacity-60" />
        </div>
      </div>
    </div>
  );
}
