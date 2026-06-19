// client/src/superAdmin/pages/VoiceAnnouncements/VoiceRecorder.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Square, Play, Pause, RotateCcw, AlertCircle, Loader2, CheckCircle2, Upload } from "lucide-react";
import { colors, fontFamily } from "./theme";

const MAX_DURATION_SEC = 300; // 5 minutes
const MAX_FILE_BYTES = 20 * 1024 * 1024; // matches server-side multer limit

const formatTime = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const pickMimeType = () => {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return undefined; // let the browser pick
};

/**
 * Self-contained recorder: idle -> recording -> recorded (preview).
 * Bubbles the final blob up via onRecordingComplete; does not know anything
 * about uploading — that's the parent form's job. Upload status is purely
 * cosmetic here (passed down so the same card can show "Uploading...").
 */
export default function VoiceRecorder({
  disabled = false,
  disabledMessage = "Select a school first",
  onRecordingComplete,
  onClear,
  uploadStatus = "idle", // 'idle' | 'uploading' | 'success' | 'error'
  uploadProgress = 0,
  onRetryUpload,
}) {
  const [phase, setPhase] = useState("idle"); // idle | recording | recorded
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finalDurationSec, setFinalDurationSec] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0..1
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const audioElRef = useRef(null);
  const fileInputRef = useRef(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cleanupStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

    const startRecording = async () => {
      setPermissionError(null);

      try {
        // Check browser support
        if (!navigator.mediaDevices) {
          throw new Error("navigator.mediaDevices is unavailable");
        }

        if (!navigator.mediaDevices.getUserMedia) {
          throw new Error("getUserMedia is unavailable");
        }

        console.log("Requesting microphone permission...");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        console.log("Microphone access granted");
        console.log("Audio Tracks:", stream.getAudioTracks());

        streamRef.current = stream;

        const mimeType = pickMimeType();

        console.log("Selected mimeType:", mimeType);

        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );

        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onerror = (e) => {
          console.error("MediaRecorder Error:", e);
          alert(
            `MediaRecorder Error\n\n${
              e?.error?.message || "Unknown MediaRecorder error"
            }`
          );
        };

        recorder.onstop = () => {
          clearInterval(timerRef.current);
          cleanupStream();

          const blob = new Blob(chunksRef.current, {
            type: mimeType || "audio/webm",
          });

          const url = URL.createObjectURL(blob);

          const duration = Math.round(
            (Date.now() - startedAtRef.current) / 1000
          );

          setPreviewUrl(url);
          setFinalDurationSec(duration);
          setPhase("recorded");

          onRecordingComplete?.(blob, duration);
        };

        mediaRecorderRef.current = recorder;
        startedAtRef.current = Date.now();

        setElapsedSec(0);

        recorder.start();

        setPhase("recording");

        timerRef.current = setInterval(() => {
          const secs = (Date.now() - startedAtRef.current) / 1000;

          setElapsedSec(secs);

          if (secs >= MAX_DURATION_SEC) {
            stopRecording();
          }
        }, 200);

      } catch (err) {
        console.error("MIC ERROR:", err);

        const errorInfo = `
    Name: ${err?.name || "Unknown"}
    Message: ${err?.message || "Unknown"}
    `;

        alert(errorInfo);

        let message = `Microphone Error\n${errorInfo}`;

        if (
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError"
        ) {
          message =
            "Microphone permission denied by Android/WebView.";
        } else if (
          err?.name === "NotFoundError" ||
          err?.name === "OverconstrainedError"
        ) {
          message =
            "No microphone detected on the device.";
        } else if (err?.name === "SecurityError") {
          message =
            "SecurityError: WebView blocked microphone access.";
        }

        setPermissionError(message);
      }
    };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setPermissionError(null);

    if (!file.type.startsWith("audio/")) {
      setPermissionError("Please choose an audio file (mp3, wav, m4a, ogg, or webm).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setPermissionError("That file is too large. Audio files must be 20 MB or smaller.");
      return;
    }

    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = url;

    probe.onloadedmetadata = () => {
      const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
      if (duration > MAX_DURATION_SEC) {
        setPermissionError(`This file is ${formatTime(duration)} long. Voice messages can be at most 5:00.`);
        URL.revokeObjectURL(url);
        return;
      }
      setPreviewUrl(url);
      setFinalDurationSec(Math.round(duration));
      setPhase("recorded");
      onRecordingComplete?.(file, Math.round(duration));
    };

    probe.onerror = () => {
      setPermissionError("Couldn't read that audio file. Try a different file or record instead.");
      URL.revokeObjectURL(url);
    };
  };

  const handleReRecord = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsPlaying(false);
    setPlaybackProgress(0);
    setElapsedSec(0);
    setFinalDurationSec(0);
    setPhase("idle");
    onClear?.();
  };

  const togglePlayback = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play();
    }
  };

  const isMaxedOut = elapsedSec >= MAX_DURATION_SEC;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: disabled ? "#f7f8fa" : "#fff",
        borderColor: "rgba(106,137,167,0.18)",
        fontFamily,
        opacity: disabled ? 0.6 : 1,
        position: "relative",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: colors.navyDark }}>
          Add voice message
        </h3>
        <span className="text-xs" style={{ color: colors.slate }}>
          Max 5:00
        </span>
      </div>

      {disabled && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl text-sm font-medium"
          style={{ background: "rgba(255,255,255,0.6)", color: colors.slate }}
        >
          {disabledMessage}
        </div>
      )}

      {permissionError && (
        <div
          className="flex items-start gap-2 rounded-xl p-3 mb-4 text-sm"
          style={{ background: colors.dangerTint, color: colors.danger }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* ── IDLE ── */}
      {phase === "idle" && (
        <div className="flex flex-col items-center py-6 gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className="flex items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              width: 72,
              height: 72,
              background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
              border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <Mic size={28} color="#fff" />
          </button>
          <p className="text-sm" style={{ color: colors.slate }}>
            Tap to start recording
          </p>

          <div className="flex items-center gap-2 w-full max-w-[220px] my-1">
            <span className="flex-1 h-px" style={{ background: "rgba(106,137,167,0.2)" }} />
            <span className="text-xs" style={{ color: colors.slate }}>
              or
            </span>
            <span className="flex-1 h-px" style={{ background: "rgba(106,137,167,0.2)" }} />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2"
            style={{
              background: "transparent",
              border: `1px solid rgba(106,137,167,0.3)`,
              color: colors.navy,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <Upload size={15} />
            Upload an audio file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            disabled={disabled}
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      )}

      {/* ── RECORDING ── */}
      {phase === "recording" && (
        <div className="flex flex-col items-center py-6 gap-4">
          <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(217,83,79,0.35)" }}
            />
            <button
              type="button"
              onClick={stopRecording}
              className="relative flex items-center justify-center rounded-full"
              style={{ width: 72, height: 72, background: colors.danger, border: "none", cursor: "pointer" }}
            >
              <Square size={24} color="#fff" fill="#fff" />
            </button>
          </div>

          <div className="text-center">
            <p
              className="text-lg font-semibold tabular-nums"
              style={{ color: isMaxedOut ? colors.danger : colors.navyDark }}
            >
              {formatTime(elapsedSec)} <span className="text-sm font-normal" style={{ color: colors.slate }}>/ 05:00</span>
            </p>
            <p className="text-xs mt-1" style={{ color: colors.slate }}>
              {isMaxedOut ? "Maximum length reached — recording stopped" : "Recording… tap the square to stop"}
            </p>
          </div>

          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(106,137,167,0.15)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (elapsedSec / MAX_DURATION_SEC) * 100)}%`,
                background: elapsedSec / MAX_DURATION_SEC > 0.85 ? colors.danger : colors.sky,
              }}
            />
          </div>
        </div>
      )}

      {/* ── RECORDED / PREVIEW ── */}
      {phase === "recorded" && previewUrl && (
        <div className="flex flex-col gap-4">
          <audio
            ref={audioElRef}
            src={previewUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setPlaybackProgress(0);
            }}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (el.duration) setPlaybackProgress(el.currentTime / el.duration);
            }}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 44, height: 44, background: colors.navy, border: "none", cursor: "pointer" }}
            >
              {isPlaying ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />}
            </button>

            <div className="flex-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(106,137,167,0.15)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${playbackProgress * 100}%`, background: colors.sky }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: colors.slate }}>
                Recorded message · {formatTime(finalDurationSec)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleReRecord}
              title="Start over"
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                background: "transparent",
                border: `1px solid rgba(106,137,167,0.3)`,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={15} color={colors.slate} />
            </button>
          </div>

          {/* Upload status feedback */}
          {uploadStatus === "uploading" && (
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.slate }}>
              <Loader2 size={14} className="animate-spin" />
              Uploading audio… {uploadProgress}%
            </div>
          )}
          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.success }}>
              <CheckCircle2 size={14} />
              Audio uploaded and ready
            </div>
          )}
          {uploadStatus === "error" && (
            <div className="flex items-center justify-between gap-2 text-xs" style={{ color: colors.danger }}>
              <span className="flex items-center gap-2">
                <AlertCircle size={14} />
                Upload failed
              </span>
              <button
                type="button"
                onClick={onRetryUpload}
                className="font-semibold underline"
                style={{ color: colors.danger, background: "none", border: "none", cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}