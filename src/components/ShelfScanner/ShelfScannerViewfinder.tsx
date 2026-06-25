import { useCallback, useMemo, useState } from "react";
import type { ScanMode } from "./types";
import { MOCK_DETECTIONS } from "./mockDetections";
import StatusBar from "./StatusBar";
import ScanReticle from "./ScanReticle";
import DetectionOverlay from "./DetectionOverlay";
import BottomActionBar from "./BottomActionBar";

interface ShelfScannerViewfinderProps {
  onClose?: () => void;
}

export default function ShelfScannerViewfinder({ onClose }: ShelfScannerViewfinderProps) {
  const [mode, setMode] = useState<ScanMode>("shelf");
  const [flashOn, setFlashOn] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [showFlashFx, setShowFlashFx] = useState(false);

  const detectedCount = useMemo(
    () => MOCK_DETECTIONS.filter((d) => d.status !== "analyzing").length,
    [],
  );

  const handleCapture = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    setShowFlashFx(true);
    window.setTimeout(() => setShowFlashFx(false), 180);
    window.setTimeout(() => setIsScanning(false), 1600);
  }, [isScanning]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-950 font-sans text-white">
      {/* simulated camera feed */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#15171c_0%,#0a0b0d_55%,#050608_100%)]" />
        <div className="absolute left-[6%] top-[18%] h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute right-[10%] top-[22%] h-44 w-44 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute left-[14%] top-[50%] h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute right-[8%] top-[52%] h-40 w-40 rounded-full bg-electric/20 blur-3xl" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_78px,rgba(255,255,255,0.035)_79px,rgba(255,255,255,0.035)_80px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      {gridOn && <ScanReticle isScanning={isScanning} />}

      <DetectionOverlay detections={MOCK_DETECTIONS} />

      <StatusBar
        isConnected
        isScanning={isScanning}
        flashOn={flashOn}
        onToggleFlash={() => setFlashOn((v) => !v)}
        onClose={onClose ?? (() => {})}
      />

      <BottomActionBar
        mode={mode}
        onModeChange={setMode}
        detectedCount={detectedCount}
        isScanning={isScanning}
        gridOn={gridOn}
        onToggleGrid={() => setGridOn((v) => !v)}
        onCapture={handleCapture}
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
