import { useLayoutEffect, useRef } from "react";
import { gsap, reducedMotion, ScrollTrigger } from "../lib/motion";
import { sinePath } from "../lib/wave";

const SEPARATOR = sinePath(80, 24, 1.5, 2);

// An endless band of words. Scrolling speeds it up and flips its direction.
export function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      const base = reverse ? -1 : 1;
      const loop = gsap.to(track.current, { xPercent: -50, duration: 32, ease: "none", repeat: -1 });
      // Start deep into the repeats so playing backwards never reaches the start.
      loop.totalTime(loop.duration() * 100).timeScale(base);

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate(self) {
          const boost = Math.min(Math.abs(self.getVelocity()) / 220, 6);
          const dir = base * self.direction;
          gsap.to(loop, {
            timeScale: dir * (1 + boost),
            duration: 0.2,
            overwrite: true,
            onComplete: () => {
              gsap.to(loop, { timeScale: dir, duration: 1.4, ease: "power2.out", overwrite: true });
            },
          });
        },
      });
    });
    return () => ctx.revert();
  }, [reverse]);

  const set = [...items, ...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track" ref={track}>
        {[0, 1].map((copy) => (
          <div className="marquee-set" key={copy}>
            {set.map((word, i) => (
              <span className="marquee-item" key={i}>
                {word}
                <svg viewBox="0 0 80 24">
                  <path d={SEPARATOR} />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
