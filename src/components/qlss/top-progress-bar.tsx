"use client";

import { useEffect, useState } from "react";

/**
 * Top loading progress bar — listens for `qlss:fetch-start` and
 * `qlss:fetch-end` CustomEvents dispatched by forms during async operations
 * (inspect, shorten, etc.). Renders a thin animated bar fixed to the top of
 * the viewport that fills to 90% during loading, then completes + fades out.
 *
 * Also falls back to listening for `fetch` activity via window event listeners
 * is intentionally avoided — we use explicit CustomEvents so only our own
 * fetches trigger the bar (not third-party / analytics calls).
 */
export function TopProgressBar() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let endTimer: ReturnType<typeof setTimeout> | null = null;

    function start() {
      if (startTimer) clearTimeout(startTimer);
      if (endTimer) clearTimeout(endTimer);
      setLoading(true);
      setProgress(0);
      // Animate to ~90% over the loading duration (never 100% until done)
      if (progressTimer) clearInterval(progressTimer);
      progressTimer = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return 90;
          // Ease toward 90 — fast at first, slower as it approaches
          const remaining = 90 - p;
          return p + Math.max(0.5, remaining * 0.08);
        });
      }, 120);
    }

    function done() {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      setProgress(100);
      // Fade out after the bar completes
      endTimer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }

    window.addEventListener("qlss:fetch-start", start);
    window.addEventListener("qlss:fetch-end", done);
    return () => {
      window.removeEventListener("qlss:fetch-start", start);
      window.removeEventListener("qlss:fetch-end", done);
      if (startTimer) clearTimeout(startTimer);
      if (progressTimer) clearInterval(progressTimer);
      if (endTimer) clearTimeout(endTimer);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="top-progress-bar h-full bg-foreground transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: loading || progress === 100 ? 1 : 0,
        }}
      />
    </div>
  );
}
