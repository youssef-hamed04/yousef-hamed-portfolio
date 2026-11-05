import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Cursor } from "./components/Cursor";
import { Marquee } from "./components/Marquee";
import { Preloader } from "./components/Preloader";
import { ScrollSignal } from "./components/ScrollSignal";
import { profile, type SignalKey } from "./data";
import {
  decode,
  gsap,
  reducedMotion,
  scrollToHash,
  ScrollTrigger,
  setScrollLocked,
  SplitText,
  startSmoothScroll,
  stopSmoothScroll,
} from "./lib/motion";
import { useMagnetic } from "./lib/useMagnetic";
import { Contact } from "./sections/Contact";
import { Design } from "./sections/Design";
import { Hero } from "./sections/Hero";
import { Path } from "./sections/Path";
import { Signals } from "./sections/Signals";
import { Stats } from "./sections/Stats";
import { Work } from "./sections/Work";

const VISITED = "yh-visited";

// Storage can be blocked (private windows, strict settings); the site works without it.
const hasVisited = () => {
  try {
    return localStorage.getItem(VISITED) === "1";
  } catch {
    return false;
  }
};

export default function App() {
  const [skipLoader] = useState(reducedMotion);
  const [quickLoader] = useState(hasVisited);
  const [ready, setReady] = useState(skipLoader);
  const [solo, setSolo] = useState<SignalKey | null>(null);
  const bar = useRef<HTMLElement>(null);
  const cvBtn = useMagnetic<HTMLAnchorElement>();

  useEffect(() => {
    startSmoothScroll();
    if (!skipLoader) setScrollLocked(true);
    // Web fonts change line lengths, so re-measure every trigger once they land.
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => stopSmoothScroll();
  }, [skipLoader]);

  useEffect(() => {
    if (ready) setScrollLocked(false);
  }, [ready]);

  const reveal = () => {
    setReady(true);
    try {
      localStorage.setItem(VISITED, "1");
    } catch {
      // Without storage the full loader simply plays again next time.
    }
  };

  // Page-wide motion: section headings, decoded labels, and the bar that
  // slips away while you scroll down and returns when you scroll up.
  useLayoutEffect(() => {
    if (!ready || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
        const split = SplitText.create(el, { type: "lines,words", mask: "lines" });
        gsap.from(split.words, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.06,
          ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-decode]").forEach((el) => decode(el, { trigger: el, start: "top 88%" }));

      ScrollTrigger.create({
        start: 120,
        end: "max",
        onUpdate: (self) => bar.current?.classList.toggle("is-hidden", self.direction === 1),
        onLeaveBack: () => bar.current?.classList.remove("is-hidden"),
      });

      gsap.from(".bar > *", { y: -40, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", delay: 0.4 });
    });
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [ready]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    scrollToHash(hash);
  };

  return (
    <>
      {!skipLoader && <Preloader onReveal={reveal} quick={quickLoader} />}
      <Cursor />
      <ScrollSignal />

      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="bar" ref={bar}>
        <a className="mark" href="#top" aria-label="Yousef Hamed, back to top" onClick={(e) => go(e, "#top")}>
          YH
        </a>
        <nav aria-label="Sections">
          <a href="#work" onClick={(e) => go(e, "#work")}>
            Work
          </a>
          <a href="#design" onClick={(e) => go(e, "#design")}>
            Design
          </a>
          <a href="#path" onClick={(e) => go(e, "#path")}>
            Path
          </a>
          <a href="#contact" onClick={(e) => go(e, "#contact")}>
            Contact
          </a>
        </nav>
        <a className="btn btn-small" href={profile.cv} download ref={cvBtn}>
          Download CV
        </a>
      </header>

      <main id="main">
        <Hero ready={ready} solo={solo} onSolo={setSolo} />
        <Marquee items={["Engineer", "Manager", "Designer"]} />
        <Signals solo={solo} />
        <Work />
        <Design />
        <Stats />
        <Path />
      </main>

      <Contact />
    </>
  );
}
