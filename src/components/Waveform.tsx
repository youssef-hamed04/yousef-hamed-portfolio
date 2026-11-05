import { useEffect, useRef } from "react";
import type { SignalKey } from "../data";

// Three component waves, one per discipline. The hero draws their sum.
const sine = (x: number) => Math.sin(x);
const square = (x: number) => Math.tanh(4 * Math.sin(x)); // softened so the line stays smooth
const saw = (x: number) => {
  const t = x / (2 * Math.PI);
  return 2 * (t - Math.floor(t + 0.5));
};

const WAVES: Record<SignalKey, { fn: (x: number) => number; freq: number; weight: number }> = {
  engineer: { fn: sine, freq: 1, weight: 0.5 },
  manager: { fn: square, freq: 0.5, weight: 0.3 },
  designer: { fn: saw, freq: 2, weight: 0.2 },
};

const KEYS = Object.keys(WAVES) as SignalKey[];

type Props = { solo: SignalKey | null };

export function Waveform({ solo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soloRef = useRef(solo);
  soloRef.current = solo;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const gold = css.getPropertyValue("--signal").trim();
    const faint = css.getPropertyValue("--trace").trim();

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Pointer bends the signal: x stretches the period, y sets the amplitude.
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onMove = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove);

    // Per-wave mix level, eased towards its target when a toggle changes.
    const mix: Record<SignalKey, number> = { engineer: 1, manager: 1, designer: 1 };

    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      // The one load moment: a flat line that tunes in over ~1.6s.
      const tune = reduced ? 1 : Math.min(1, t / 1.6);
      const eased = 1 - Math.pow(1 - tune, 3);

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      for (const k of KEYS) {
        const target = soloRef.current === null || soloRef.current === k ? 1 : 0;
        mix[k] += (target - mix[k]) * (reduced ? 1 : 0.08);
      }

      const cycles = 2.2 + pointer.x * 2.4;
      const amp = (h / 2.6) * (0.55 + (1 - pointer.y) * 0.6) * eased;
      const phase = reduced ? 0 : t * 0.9;
      const mid = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Baseline
      ctx.strokeStyle = faint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();

      // Component traces
      for (const k of KEYS) {
        const { fn, freq } = WAVES[k];
        ctx.globalAlpha = 0.35 * mix[k];
        ctx.strokeStyle = faint;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (let px = 0; px <= w; px += 2) {
          const x = (px / w) * cycles * 2 * Math.PI * freq + phase * freq;
          const y = mid - fn(x) * amp * 0.6;
          px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Summed signal
      const total = KEYS.reduce((s, k) => s + WAVES[k].weight * mix[k], 0) || 1;
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let px = 0; px <= w; px += 2) {
        let v = 0;
        for (const k of KEYS) {
          const { fn, freq, weight } = WAVES[k];
          v += fn((px / w) * cycles * 2 * Math.PI * freq + phase * freq) * weight * mix[k];
        }
        const y = mid - (v / total) * amp;
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    // With reduced motion the canvas is static and only redraws on change.
    const redraw = () => {
      if (reduced) raf = requestAnimationFrame(draw);
    };
    window.addEventListener("waveform:redraw", redraw);
    window.addEventListener("resize", redraw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("waveform:redraw", redraw);
      window.removeEventListener("resize", redraw);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("waveform:redraw"));
  }, [solo]);

  return <canvas ref={canvasRef} className="waveform" aria-hidden="true" />;
}
