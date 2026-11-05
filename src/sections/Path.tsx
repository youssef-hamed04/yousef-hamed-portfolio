import { useLayoutEffect, useRef } from "react";
import { extras, timeline } from "../data";
import { gsap, reducedMotion } from "../lib/motion";

export function Path() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      // The line fills as you read down, and each stop lights up as the line reaches it.
      gsap.fromTo(
        ".timeline-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: ".timeline", start: "top 65%", end: "bottom 65%", scrub: 0.6 },
        }
      );
      gsap.utils.toArray<HTMLElement>(".timeline li").forEach((item) => {
        gsap.from(item.children, {
          x: 60,
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: item, start: "top 80%" },
        });
        gsap.to(item, {
          scrollTrigger: { trigger: item, start: "top 65%", toggleClass: "is-lit" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="path" id="path" aria-labelledby="path-title" ref={root}>
      <h2 id="path-title" data-split>
        How I got here
      </h2>
      <div className="timeline-wrap">
        <span className="timeline-line" aria-hidden="true">
          <span className="timeline-fill" />
        </span>
        <ol className="timeline">
        {timeline.map((t) => (
          <li key={t.title + t.where}>
            <p className="when" data-decode>
              {t.when}
            </p>
            <div>
              <h3>
                {t.title}, <span className="where">{t.where}</span>
              </h3>
              <p>{t.body}</p>
            </div>
          </li>
        ))}
        </ol>
      </div>

      <div className="extras">
        <div>
          <h3>Certificates</h3>
          <ul>
            {extras.certifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Languages</h3>
          <dl>
            {extras.languages.map((l) => (
              <div key={l.name}>
                <dt>{l.name}</dt>
                <dd>{l.level}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
