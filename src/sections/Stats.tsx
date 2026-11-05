import { useLayoutEffect, useRef } from "react";
import { stats } from "../data";
import { gsap, reducedMotion } from "../lib/motion";

const format = (value: number, decimals = 0) => value.toFixed(decimals);

export function Stats() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimals ?? 0);
        const counter = { v: 0 };
        el.textContent = format(0, decimals);
        gsap.to(counter, {
          v: target,
          duration: 2,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => (el.textContent = format(counter.v, decimals)),
        });
      });
      gsap.from(".stat", {
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="stats" aria-label="In numbers" ref={root}>
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <p className="stat-value">
            <span data-count={s.value} data-decimals={s.decimals ?? 0}>
              {format(s.value, s.decimals)}
            </span>
            {s.suffix}
          </p>
          <p className="stat-label">{s.label}</p>
        </div>
      ))}
    </section>
  );
}
