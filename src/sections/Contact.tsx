import { useLayoutEffect, useRef } from "react";
import { Marquee } from "../components/Marquee";
import { profile } from "../data";
import { finePointer, gsap, reducedMotion, SplitText } from "../lib/motion";
import { useMagnetic } from "../lib/useMagnetic";

export function Contact() {
  const root = useRef<HTMLElement>(null);
  const mail = useMagnetic<HTMLAnchorElement>(0.15);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      const split = SplitText.create(".contact h2", { type: "words,chars", mask: "words" });
      gsap.from(split.chars, {
        yPercent: 110,
        duration: 1,
        stagger: 0.02,
        ease: "power4.out",
        scrollTrigger: { trigger: ".contact h2", start: "top 85%" },
      });
      gsap.from(".mail, .contact-links li", {
        y: 50,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: ".mail", start: "top 90%" },
      });

      // Hovering the heading sends a ripple through its letters.
      if (!finePointer()) return;
      const heading = root.current!.querySelector("h2")!;
      const ripple = () =>
        gsap.to(split.chars, {
          yPercent: -22,
          duration: 0.22,
          ease: "sine.out",
          stagger: { each: 0.018 },
          yoyo: true,
          repeat: 1,
          overwrite: true,
        });
      heading.addEventListener("pointerenter", ripple);
      return () => heading.removeEventListener("pointerenter", ripple);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <footer className="contact" id="contact" ref={root}>
      <div className="contact-inner">
        <h2>Have a role or a project in mind?</h2>
        <a className="mail" href={`mailto:${profile.email}`} ref={mail} data-cursor="Write">
          {profile.email}
        </a>
        <ul className="contact-links">
          <li>
            <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>{profile.phone}</a>
          </li>
          <li>
            <a href={profile.github} target="_blank" rel="noreferrer">
              github.com/{profile.githubHandle}
            </a>
          </li>
          <li>
            <a href={profile.cv} download>
              Download my CV (PDF)
            </a>
          </li>
        </ul>
      </div>
      <Marquee items={[profile.name, profile.nameAr]} reverse />
      <p className="sign">
        {profile.name}, {profile.location}. Built with React, GSAP and Three.js.
      </p>
    </footer>
  );
}
