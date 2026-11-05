import type { SignalKey } from "../data";

// Small static drawings of each discipline's wave, matching the hero's components.
const PATHS: Record<SignalKey, string> = {
  engineer: "M0 20 C10 0, 20 0, 30 20 S50 40, 60 20 S80 0, 90 20 S110 40, 120 20",
  manager: "M0 32 H15 V8 H45 V32 H75 V8 H105 V32 H120",
  designer: "M0 32 L30 8 V32 L60 8 V32 L90 8 V32 L120 8",
};

export function WaveGlyph({ kind }: { kind: SignalKey }) {
  return (
    <svg className="glyph" viewBox="0 0 120 40" aria-hidden="true">
      <path d={PATHS[kind]} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
