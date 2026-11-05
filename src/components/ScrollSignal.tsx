import { useEffect, useRef } from "react";
import { gsap, reducedMotion, ScrollTrigger } from "../lib/motion";

const HEIGHT = 14;

// The page-progress line, drawn as an oscilloscope trace: it runs as far as
// you've read, and its wave grows with scroll speed, then settles when you stop.
export function ScrollSignal() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion()) return;
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--signal").trim();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    const resize = () => {
      width = window.innerWidth;
      el.width = width * dpr;
      el.height = HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const s = { progress: 0, push: 0, energy: 0, phase: 0 };
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        s.progress = self.progress;
        s.push = Math.min(Math.abs(self.getVelocity()) / 1800, 1);
      },
    });

    const draw = (_time: number, delta: number) => {
      s.energy += (s.push - s.energy) * 0.1;
      s.push *= 0.9;
      s.phase += delta * 0.01 * (0.4 + s.energy * 2);

      ctx.clearRect(0, 0, width, HEIGHT);
      const end = s.progress * width;
      if (end < 2) return;

      const mid = HEIGHT / 2;
      const amp = 0.6 + s.energy * (mid - 2);
      ctx.beginPath();
      for (let x = 0; x <= end; x += 2) {
        const y = mid + Math.sin(x * 0.05 - s.phase) * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();

      // The trace's leading point, like the beam on a scope.
      ctx.beginPath();
      ctx.arc(end, mid + Math.sin(end * 0.05 - s.phase) * amp, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };
    gsap.ticker.add(draw);

    return () => {
      gsap.ticker.remove(draw);
      st.kill();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="scroll-signal" ref={canvas} aria-hidden="true" />;
}
