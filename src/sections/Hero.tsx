import { useLayoutEffect, useRef } from "react";
import { profile, signals, type SignalKey } from "../data";
import { gsap, reducedMotion, scrollToHash, SplitText } from "../lib/motion";
import { useMagnetic } from "../lib/useMagnetic";

type Props = {
  ready: boolean;
  solo: SignalKey | null;
  onSolo: (key: SignalKey | null) => void;
};

export function Hero({ ready, solo, onSolo }: Props) {
  const root = useRef<HTMLElement>(null);
  const workBtn = useMagnetic<HTMLAnchorElement>();
  const mailBtn = useMagnetic<HTMLAnchorElement>();

  useLayoutEffect(() => {
    if (!ready || reducedMotion()) return;
    const ctx = gsap.context(() => {
      const split = SplitText.create(".hero-name .line", { type: "lines,chars", mask: "lines" });

      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .from(split.chars, { yPercent: 120, rotate: 8, duration: 1.2, stagger: 0.045 })
        .from(".hero .ar", { opacity: 0, x: 40, duration: 1 }, "-=0.9")
        .from(".tuner button", { opacity: 0, y: 20, duration: 0.6, stagger: 0.07 }, "-=0.7")
        .from(".hero-foot > *", { opacity: 0, y: 40, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=0.5")
        .from(".scroll-cue", { opacity: 0, y: -10, duration: 0.6 }, "-=0.4");

      // On the way out, the two halves of the name drift apart.
      const out = { trigger: root.current, start: "top top", end: "bottom top", scrub: true };
      gsap.to(".hero-name .first", { xPercent: -14, ease: "none", scrollTrigger: out });
      gsap.to(".hero-name .last", { xPercent: 22, ease: "none", scrollTrigger: out });
      gsap.to(".hero-foot, .tuner", { yPercent: -60, opacity: 0, ease: "none", scrollTrigger: out });
    }, root);
    return () => ctx.revert();
  }, [ready]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    scrollToHash(hash);
  };

  return (
    <section className="hero" id="top" ref={root}>

      <div className="hero-head">
        <h1 className="hero-name" aria-label={profile.name}>
          <span className="line first" aria-hidden="true">
            Yousef
          </span>
          <span className="line last" aria-hidden="true">
            Hamed
          </span>
        </h1>
        <p className="ar" lang="ar" dir="rtl">
          {profile.nameAr}
        </p>
      </div>

      <div className="hero-bottom">
        <div className="tuner" role="radiogroup" aria-label="Show one side of my work on the signal">
          <button role="radio" aria-checked={solo === null} onClick={() => onSolo(null)}>
            All three
          </button>
          {signals.map((s) => (
            <button
              key={s.key}
              role="radio"
              aria-checked={solo === s.key}
              onClick={() => onSolo(solo === s.key ? null : s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="hero-foot">
          <p className="role">
            {profile.role}, based in {profile.location}.
          </p>
          <p className="intro">{profile.intro}</p>
          <div className="actions">
            <a className="btn" href="#work" ref={workBtn} onClick={(e) => go(e, "#work")}>
              See my work
            </a>
            <a className="btn btn-ghost" href={`mailto:${profile.email}`} ref={mailBtn}>
              Email me
            </a>
          </div>
        </div>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </section>
  );
}
