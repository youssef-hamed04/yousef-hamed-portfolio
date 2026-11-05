import { useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/motion";
import { sinePath } from "../lib/wave";

const WAVE = sinePath(600, 60, 3);

// Counts to 100 while a signal draws across, then lifts away to reveal the page.
export function Preloader({ onReveal }: { onReveal: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const reveal = useRef(onReveal);
  reveal.current = onReveal;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const path = root.current!.querySelector<SVGPathElement>(".loader-wave path")!;
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });

      const counter = { v: 0 };
      const tl = gsap.timeline();
      tl.from(".loader-name span", { yPercent: 110, duration: 0.9, ease: "power4.out", stagger: 0.08 })
        .to(
          counter,
          {
            v: 100,
            duration: 1.8,
            ease: "power2.inOut",
            onUpdate: () => {
              count.current!.textContent = String(Math.round(counter.v)).padStart(3, "0");
            },
          },
          0.1
        )
        .to(path, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" }, 0.1)
        // Hold at 100 until the web fonts have arrived, so text never reflows mid-animation.
        .add(() => {
          tl.pause();
          document.fonts.ready.then(() => tl.resume());
        })
        .to(".loader-inner", { yPercent: -40, opacity: 0, duration: 0.6, ease: "power3.in" })
        .add(() => reveal.current())
        .to(root.current, { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, "-=0.15")
        .set(root.current, { display: "none" });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="loader" ref={root} aria-hidden="true">
      <div className="loader-inner">
        <p className="loader-name">
          <span className="mask">
            <span>Yousef</span>
          </span>{" "}
          <span className="mask">
            <span>Hamed</span>
          </span>
        </p>
        <svg className="loader-wave" viewBox="0 0 600 60" preserveAspectRatio="none">
          <path d={WAVE} />
        </svg>
        <span className="loader-count" ref={count}>
          000
        </span>
      </div>
    </div>
  );
}
