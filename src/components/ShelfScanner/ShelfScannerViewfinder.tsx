import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ScanMode } from "./types";
import { MOCK_DETECTIONS } from "./mockDetections";
import { checkEdgeOverlap } from "./edgeOverlap";
import StatusBar from "./StatusBar";
import ScanReticle from "./ScanReticle";
import DetectionOverlay from "./DetectionOverlay";
import GhostOverlay from "./GhostOverlay";
import BottomActionBar from "./BottomActionBar";

interface ShelfScannerViewfinderProps {
  onClose?: () => void;
  onScanComplete?: (mode: ScanMode) => void;
}

interface SessionFrame {
  base64: string;
  mimeType: string;
}

interface ScanGeminiDetection {
  brand: string;
  line: string;
  shadeCode: string;
  status: string;
  fullQuantity?: number;
  partialQuantity?: number;
}

interface ScanGeminiResponse {
  detections: ScanGeminiDetection[];
}

export default function ShelfScannerViewfinder({ onClose, onScanComplete }: ShelfScannerViewfinderProps) {
  const [mode, setMode] = useState<ScanMode>("shelf");
  const [flashOn, setFlashOn] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [showFlashFx, setShowFlashFx] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [sessionFrames, setSessionFrames] = useState<SessionFrame[]>([]);
  const [simulatedPendingCount, setSimulatedPendingCount] = useState(0);
  const [ghostFrameUrl, setGhostFrameUrl] = useState<string | null>(null);
  const [overlapLocked, setOverlapLocked] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [liveDetectionCount, setLiveDetectionCount] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch {
        setCameraReady(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const detectedCount = useMemo(
    () => liveDetectionCount ?? MOCK_DETECTIONS.filter((d) => d.status !== "analyzing").length,
    [liveDetectionCount],
  );

  const captureFrame = useCallback((): { dataUrl: string; base64: string; mimeType: string } | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady || video.videoWidth === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const mimeType = "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.85);
    const base64 = dataUrl.split(",")[1] ?? "";
    return { dataUrl, base64, mimeType };
  }, [cameraReady]);

  const pendingFrameCount = sessionFrames.length + simulatedPendingCount;

  const handleModeChange = useCallback((nextMode: ScanMode) => {
    setMode(nextMode);
    setSessionFrames([]);
    setSimulatedPendingCount(0);
    setGhostFrameUrl(null);
    setOverlapLocked(false);
    setLiveDetectionCount(null);
    setScanError(null);
  }, []);

  // Captures a single static photo and caches it client-side. This never
  // calls the network — frames just accumulate locally until the user taps
  // "Process batch", which is the only point we hit /api/scan-gemini.
  const handleCapture = useCallback(async () => {
    if (isScanning || isSubmittingBatch) return;

    setIsScanning(true);
    setShowFlashFx(true);
    setScanError(null);
    window.setTimeout(() => setShowFlashFx(false), 180);

    const previousFrameUrl = ghostFrameUrl;
    // dismiss the previous ghost the moment a new photo is taken
    setGhostFrameUrl(null);
    setOverlapLocked(false);

    const frame = captureFrame();
    if (!frame) {
      // no live camera in this environment — still let the batch UI flow work
      setSimulatedPendingCount((count) => count + 1);
      setIsScanning(false);
      return;
    }

    setGhostFrameUrl(frame.dataUrl);
    setSessionFrames((prev) => [...prev, { base64: frame.base64, mimeType: frame.mimeType }]);

    if (previousFrameUrl) {
      try {
        const { isMatch } = await checkEdgeOverlap(previousFrameUrl, frame.dataUrl);
        if (isMatch) {
          setOverlapLocked(true);
          navigator.vibrate?.([40]);
          window.setTimeout(() => setOverlapLocked(false), 1100);
        }
      } catch {
        // edge check is a best-effort alignment hint, never block capture on it
      }
    }

    setIsScanning(false);
  }, [captureFrame, ghostFrameUrl, isScanning, isSubmittingBatch]);

  // The single point where the aggregated photo batch is sent to the AI
  // service — one request per session instead of one per photo, since each
  // request would otherwise resend every previously captured frame too.
  const handleSubmitBatch = useCallback(async () => {
    if (isSubmittingBatch || pendingFrameCount === 0) return;

    if (sessionFrames.length === 0) {
      // no live camera in this environment — nothing real to send
      setSimulatedPendingCount(0);
      onScanComplete?.(mode);
      return;
    }

    setIsSubmittingBatch(true);
    setScanError(null);

    try {
      const response = await fetch("/api/scan-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: sessionFrames }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? `Scan failed (${response.status})`);
      }

      const { detections } = payload as ScanGeminiResponse;
      setLiveDetectionCount(detections.length);
      onScanComplete?.(mode);
      setSessionFrames([]);
      setSimulatedPendingCount(0);
      setGhostFrameUrl(null);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Could not reach the scanner service");
    } finally {
      setIsSubmittingBatch(false);
    }
  }, [isSubmittingBatch, mode, onScanComplete, pendingFrameCount, sessionFrames]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 font-sans text-white">
      {/* live camera feed, with a simulated fallback when no camera is available */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            cameraReady ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className={`absolute inset-0 transition-opacity duration-300 ${cameraReady ? "opacity-0" : "opacity-100"}`}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#15171c_0%,#0a0b0d_55%,#050608_100%)]" />
          <div className="absolute left-[6%] top-[18%] h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute right-[10%] top-[22%] h-44 w-44 rounded-full bg-rose-500/15 blur-3xl" />
          <div className="absolute left-[14%] top-[50%] h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="absolute right-[8%] top-[52%] h-40 w-40 rounded-full bg-electric/20 blur-3xl" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_78px,rgba(255,255,255,0.035)_79px,rgba(255,255,255,0.035)_80px)]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.65)_100%)]" />
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {ghostFrameUrl && <GhostOverlay imageUrl={ghostFrameUrl} />}

      {gridOn && <ScanReticle isScanning={isScanning} overlapLocked={overlapLocked} />}

      <DetectionOverlay detections={MOCK_DETECTIONS} />

      <StatusBar
        isConnected
        isScanning={isScanning}
        flashOn={flashOn}
        onToggleFlash={() => setFlashOn((v) => !v)}
        onClose={onClose ?? (() => {})}
      />

      {overlapLocked && (
        <div className="absolute inset-x-4 top-[72px] z-20 flex items-center gap-2 rounded-xl border border-electric/50 bg-electric/20 px-3 py-2 text-[12px] font-semibold tracking-wide text-white backdrop-blur-md">
          <ShieldCheck size={14} className="shrink-0 text-electric" strokeWidth={2.5} />
          <span className="min-w-0 truncate">OVERLAP LOCKED · BATCH UPDATED</span>
        </div>
      )}

      {scanError && (
        <div className="absolute inset-x-4 top-[72px] z-20 flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-950/80 px-3 py-2 text-[12px] font-medium text-rose-100 backdrop-blur-md">
          <AlertTriangle size={14} className="shrink-0" strokeWidth={2.5} />
          <span className="min-w-0 truncate">{scanError}</span>
        </div>
      )}

      <BottomActionBar
        mode={mode}
        onModeChange={handleModeChange}
        detectedCount={detectedCount}
        pendingFrameCount={pendingFrameCount}
        isScanning={isScanning}
        isSubmittingBatch={isSubmittingBatch}
        gridOn={gridOn}
        onToggleGrid={() => setGridOn((v) => !v)}
        onCapture={handleCapture}
        onSubmitBatch={handleSubmitBatch}
      />

      {/* shutter flash */}
      <div
        className={`pointer-events-none absolute inset-0 z-30 bg-white transition-opacity duration-150 ${
          showFlashFx ? "opacity-90" : "opacity-0"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
