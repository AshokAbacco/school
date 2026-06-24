// components/CameraCapture.jsx
// Webcam/camera modal — works on both desktop (webcam) and mobile (front camera)
import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { COLORS } from "./FormFields";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [captured, setCaptured] = useState(null); // base64 preview after snap
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setLoading(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setLoading(false);
        };
      }
    } catch (err) {
      setLoading(false);
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not access camera: " + err.message);
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // Mirror the image so it feels natural (front camera is mirrored)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCaptured(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  const confirm = () => {
    if (!captured) return;
    // Convert base64 to File
    const arr = captured.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const file = new File([u8arr], `camera-photo-${Date.now()}.jpg`, { type: mime });
    onCapture(file, captured);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-md"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: COLORS.bgSoft, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2">
            <Camera size={16} style={{ color: COLORS.primary }} />
            <p className="text-sm font-bold" style={{ color: COLORS.primary }}>
              Take Photo
            </p>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-white/70 transition-colors"
            style={{ color: COLORS.secondary }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera / Preview area */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          {/* Live video — mirrored so it feels like a selfie */}
          {!captured && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)", display: loading ? "none" : "block" }}
            />
          )}

          {/* Captured still */}
          {captured && (
            <img
              src={captured}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {/* Loading spinner */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin"
              />
              <p className="text-white/80 text-sm">Starting camera…</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <Camera size={36} className="text-white/40" />
              <p className="text-white/80 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Hidden canvas for snapshot */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div
          className="flex items-center justify-center gap-3 px-4 py-4"
          style={{ background: COLORS.bgSoft, borderTop: `1px solid ${COLORS.border}` }}
        >
          {!captured ? (
            <>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.secondary,
                  background: "white",
                }}
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={takeSnapshot}
                disabled={loading || !!error}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                style={{ background: COLORS.primary }}
              >
                <Camera size={15} /> Capture
              </button>
            </>
          ) : (
            <>
              <button
                onClick={retake}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.secondary,
                  background: "white",
                }}
              >
                <RotateCcw size={14} /> Retake
              </button>
              <button
                onClick={confirm}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95"
                style={{ background: "#16a34a" }}
              >
                <Check size={15} /> Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}