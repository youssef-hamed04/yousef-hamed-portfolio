import { useLayoutEffect, useRef } from "react";
import { BrowserShot } from "../components/BrowserShot";
import { featured, profile, projects, smallProjects } from "../data";
import { gsap } from "../lib/motion";

const total = projects.length + 1;
const position = (i: number) => `${i + 1} / ${total}`;

export function Work() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia(root);
    mm.add(
      {
        wide: "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
        narrow: "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const panels = gsap.utils.toArray<HTMLElement>(".panel");

        if (context.conditions?.narrow) {
          panels.forEach((panel) =>
            gsap.from(panel, {
              y: 80,
              opacity: 0,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: { trigger: panel, start: "top 85%" },
            })
          );
        } else {
          // Vertical scroll drives the track sideways while the gallery is pinned.
          const t = track.current!;
          const distance = () => t.scrollWidth - window.innerWidth;
          const slide = gsap.to(t, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: ".gallery",
              pin: true,
              scrub: 1,
              start: "top top",
              end: () => `+=${distance()}`,
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          });
          gsap.to(".gallery-progress i", {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: ".gallery", start: "top top", end: () => `+=${distance()}`, scrub: true },
          });

          panels.forEach((panel, i) => {
            // The first panel is already on screen when the pin starts, so it animates on the way in.
            const enter =
              i === 0
                ? { trigger: panel, start: "top 75%" }
                : { trigger: panel, containerAnimation: slide, start: "left 75%" };
            gsap.from(panel.querySelectorAll(".panel-copy > *"), {
              y: 50,
              opacity: 0,
              duration: 0.9,
              stagger: 0.07,
              ease: "power3.out",
              scrollTrigger: enter,
            });
            gsap.from(panel.querySelector(".shot"), {
              clipPath: "inset(12% 12% 12% 12% round 24px)",
              duration: 1.3,
              ease: "power4.out",
              scrollTrigger: enter,
            });

            const inner = panel.querySelector(".shot-inner");
            if (inner && i > 0) {
              gsap.fromTo(
                inner,
                { xPercent: -6 },
                {
                  xPercent: 6,
                  ease: "none",
                  scrollTrigger: { trigger: panel, containerAnimation: slide, start: "left right", end: "right left", scrub: true },
                }
              );
            }
          });
        }

        gsap.from(".more li", {
          x: -60,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ".more", start: "top 80%" },
        });
      }
    );
    return () => mm.revert();
  }, []);

  return (
    <section className="work" id="work" aria-labelledby="work-title" ref={root}>
      <div className="work-head">
        <h2 id="work-title" data-split>
          Selected work
        </h2>
        <p className="work-hint" aria-hidden="true">
          Keep scrolling to move through the projects
        </p>
      </div>

      <div className="gallery">
        <div className="track" ref={track}>
          <article className="panel panel-feature">
            <div className="panel-copy">
              <p className="panel-pos">{position(0)}</p>
              <p className="kind">{featured.kind}</p>
              <h3>{featured.title}</h3>
              <p className="panel-body">{featured.summary}</p>
              <ul className="parts">
                {featured.parts.map((p) => (
                  <li key={p.name}>
                    <h4>
                      {p.href ? (
                        <a href={p.href} target="_blank" rel="noreferrer">
                          {p.name}
                        </a>
                      ) : (
                        p.name
                      )}
                    </h4>
                    <p className="stack">{p.stack}</p>
                    <p>{p.body}</p>
                  </li>
                ))}
              </ul>
            </div>
            <BrowserShot
              image={featured.image}
              url={featured.url}
              alt="Sign-in screen of the EduPlatform student web app, in Arabic"
              href={featured.live}
            />
          </article>

          {projects.map((p, i) => (
            <article className="panel" key={p.title}>
              <div className="panel-copy">
                <p className="panel-pos">{position(i + 1)}</p>
                <p className="kind">{p.kind}</p>
                <h3>{p.title}</h3>
                <p className="panel-body">{p.body}</p>
                <ul className="tags">
                  {p.stack.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {(p.live || p.repo) && (
                  <p className="links">
                    {p.live && (
                      <a href={p.live} target="_blank" rel="noreferrer">
                        Open live site
                      </a>
                    )}
                    {p.repo && (
                      <a href={p.repo} target="_blank" rel="noreferrer">
                        View code
                      </a>
                    )}
                  </p>
                )}
              </div>
              {p.image && (
                <BrowserShot
                  image={p.image}
                  url={p.url ?? ""}
                  alt={`Home page of ${p.title}`}
                  href={p.live}
                />
              )}
            </article>
          ))}
        </div>
        <div className="gallery-progress" aria-hidden="true">
          <i />
        </div>
      </div>

      <div className="more">
        <h3>Smaller builds</h3>
        <ul>
          {smallProjects.map((p) => (
            <li key={p.title}>
              <a href={p.href} target="_blank" rel="noreferrer">
                <span className="more-title">{p.title}</span>
                <span className="more-note">{p.note}</span>
              </a>
            </li>
          ))}
        </ul>
        <p>
          Everything else is on{" "}
          <a href={profile.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </div>
    </section>
  );
}
