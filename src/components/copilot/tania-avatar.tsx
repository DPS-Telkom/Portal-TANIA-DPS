"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MODEL_URL = "/brand/tania.vsplat";
const POSTER_URL = "/brand/tania.webp";

// AV-01 — TANIA's 3D Gaussian-splat avatar (official .vsplat model). The
// renderer (@viggle/splat-engine + playcanvas, ~2.4 MB) is a lazy chunk loaded
// only in the browser; the portrait poster shows until the model is ready and
// stays as the fallback when WebGL/WebGPU or the model fails to load.
export function TaniaAvatar({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let scene: { destroy(): void } | null = null;

    (async () => {
      try {
        const { Scene, Character } = await import("@viggle/splat-engine");
        if (cancelled) return;
        const created = await Scene.create(canvas, { fov: 36 });
        if (cancelled) {
          created.destroy();
          return;
        }
        scene = created;
        // Head-and-shoulders, front view. The model faces +X (head ≈ y 1.66),
        // so the camera sits on the +X axis; the vendor demo's camera on +Z
        // showed TANIA in profile.
        created.cameraEntity.setPosition(0.64, 1.68, 0);
        created.cameraEntity.lookAt(0.05, 1.66, 0);
        created.start();
        await Character.load(created, MODEL_URL);
        if (!cancelled) setReady(true);
      } catch (error) {
        if (cancelled) return;
        scene?.destroy();
        scene = null;
        console.warn("TANIA: 3D avatar unavailable, showing portrait", error);
      }
    })();

    return () => {
      cancelled = true;
      scene?.destroy();
      setReady(false);
    };
  }, []);

  return (
    <span aria-hidden="true" className={cn("relative block overflow-hidden rounded-full bg-tania-navy", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, local asset */}
      <img src={POSTER_URL} alt="" className="absolute inset-0 size-full object-cover" />
      <canvas
        ref={canvasRef}
        width={124}
        height={124}
        className={cn(
          "pointer-events-none absolute inset-0 size-full transition-opacity duration-300",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
}
