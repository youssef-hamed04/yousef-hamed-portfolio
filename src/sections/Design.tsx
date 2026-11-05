import { useLayoutEffect, useRef } from "react";
import { designProcess, designProjects } from "../data";
import { gsap } from "../lib/motion";

export function Design() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia(root);
    mm.add(
      {
        wide: "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
        any: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        // The process line draws through the steps: across on wide screens, down on narrow ones.
        const axis = context.conditions?.wide ? "scaleX" : "scaleY";
        gsap
          .timeline({ scrollTrigger: { trigger: ".process", start: "top 80%" } })
          .fromTo(".process-line i", { [axis]: 0 }, { [axis]: 1, duration: 1.6, ease: "power2.inOut" })
          .from(".process li", { y: 30, opacity: 0, duration: 0.6, stagger: 0.18, ease: "back.out(2)" }, 0.1);

        gsap.utils.toArray<HTMLElement>(".case").forEach((item, i) => {
          gsap.from(item.querySelectorAll(".case-copy > *"), {
            y: 50,
            opacity: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: item, start: "top 80%" },
          });
          gsap.from(item.querySelectorAll(".phone"), {
            y: 140,
            rotate: (j) => (j % 2 ? -8 : 8),
            opacity: 0,
            duration: 1.1,
            stagger: 0.07,
            ease: "power4.out",
            scrollTrigger: { trigger: item.querySelector(".rail-wrap"), start: "top 85%" },
          });

          // On wide screens the rail slides with the scroll, alternating direction per project.
          if (!context.conditions?.wide) return;
          const rail = item.querySelector<HTMLElement>(".rail")!;
          const travel = () => -Math.max(0, rail.scrollWidth - window.innerWidth);
          const [from, to] = i % 2 ? [travel, () => 0] : [() => 0, travel];
          gsap.fromTo(
            rail,
            { x: from },
            {
              x: to,
              ease: "none",
              scrollTrigger: {
                trigger: item.querySelector(".rail-wrap"),
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
                invalidateOnRefresh: true,
              },
            }
          );
        });
      }
    );
    return () => mm.revert();
  }, []);

  return (
    <section className="design" id="design" aria-labelledby="design-title" ref={root}>
      <div className="design-head">
        <h2 id="design-title" data-split>
          UI/UX design
        </h2>
        <p className="design-lead">
          For the last two months I've been designing apps in Figma, taking each one through the same steps before a
          single screen is final.
        </p>
        <div className="process">
          <span className="process-line" aria-hidden="true">
            <i />
          </span>
          <ol>
            {designProcess.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      {designProjects.map((p) => (
        <article className="case" key={p.title}>
          <div className="case-copy">
            <p className="kind">{p.kind}</p>
            <h3>
              {p.title}
              {p.titleAr && (
                <span className="case-ar" lang="ar" dir="rtl">
                  {p.titleAr}
                </span>
              )}
            </h3>
            <p className="case-body">{p.body}</p>
            <ul className="tags">
              {p.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="links">
              <a href={p.figma} target="_blank" rel="noreferrer">
                Open in Figma
              </a>
            </p>
          </div>

          <div className="rail-wrap">
            <ul className="rail" aria-label={`${p.title} screens`}>
              {p.screens.map((s) => (
                <li className="phone" key={s.src}>
                  <a className="phone-inner" href={p.figma} target="_blank" rel="noreferrer" data-cursor="Figma">
                    <span className="phone-screen">
                      <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </section>
  );
}
