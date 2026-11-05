import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

export { gsap, ScrollTrigger, SplitText };

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = () => window.matchMedia("(pointer: fine)").matches;

// Small labels arrive like a signal being decoded: noise that settles into the text.
export function decode(el: HTMLElement, scrollTrigger: ScrollTrigger.Vars) {
  return gsap.to(el, {
    duration: 1.1,
    ease: "none",
    scrambleText: { text: el.textContent ?? "", chars: "01<>/\\=+#", revealDelay: 0.3, speed: 0.5 },
    scrollTrigger,
  });
}

// Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
let lenis: Lenis | null = null;
const tick = (time: number) => lenis?.raf(time * 1000);

export function startSmoothScroll() {
  if (lenis || reducedMotion()) return;
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

export function stopSmoothScroll() {
  gsap.ticker.remove(tick);
  lenis?.destroy();
  lenis = null;
}

export function setScrollLocked(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  document.documentElement.classList.toggle("is-locked", locked);
}

export function scrollToHash(hash: string) {
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
}
