import { useLayoutEffect, useRef } from "react";
import { WaveGlyph } from "../components/WaveGlyph";
import { signals, type SignalKey } from "../data";
import { finePointer, gsap, reducedMotion } from "../lib/motion";

export function Signals({ solo }: { solo: SignalKey | null }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      // Each card's wave draws itself in as the card arrives.
      gsap.utils.toArray<HTMLElement>(".signal").forEach((card, i) => {
        const path = card.querySelector<SVGPathElement>(".glyph path")!;
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 82%" }, delay: i * 0.12 })
          .from(card, { y: 80, opacity: 0, duration: 1, ease: "power3.out" })
          .to(path, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, 0.2)
          .from(card.querySelectorAll(".tags li"), { scale: 0.6, opacity: 0, duration: 0.4, stagger: 0.04 }, 0.6);
      });

      // Cards tilt towards the pointer. The returned function runs on revert.
      if (!finePointer()) return;
      const cleanups = gsap.utils.toArray<HTMLElement>(".signal").map((card) => {
        const rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3" });
        const ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 10);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
        };
        const leave = () => {
          rx(0);
          ry(0);
        };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
        return () => {
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", leave);
        };
      });
      return () => cleanups.forEach((fn) => fn());
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="signals" aria-labelledby="signals-title" ref={root}>
      <h2 id="signals-title" data-split>
        One person, three signals
      </h2>
      <div className="signal-grid">
        {signals.map((s) => (
          <article key={s.key} className={`signal${solo === s.key ? " is-on" : ""}`}>
            <WaveGlyph kind={s.key} />
            <h3>
              {s.label} <span className="wave-name">{s.wave} wave</span>
            </h3>
            <p>{s.body}</p>
            <ul className="tags">
              {s.tools.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
