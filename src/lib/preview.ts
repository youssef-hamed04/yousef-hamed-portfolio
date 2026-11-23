// Preview mode: the site rendered inside the dashboard, showing the unsaved draft.
export const isPreview = window.parent !== window && new URLSearchParams(window.location.search).has("preview");

// The Origin API isn't in TypeScript's DOM types yet.
declare const Origin: {
  from(value: MessageEvent | string | Window): { isSameOrigin(other: ReturnType<typeof Origin.from>): boolean };
};

// True only for a message sent from this exact origin. A "null" (opaque) origin never matches.
export function fromSameOrigin(event: MessageEvent): boolean {
  try {
    if ("Origin" in globalThis) {
      let origin;
      try {
        origin = Origin.from(event);
      } catch {
        origin = Origin.from(event.origin);
      }
      return origin.isSameOrigin(Origin.from(self));
    }
    return event.origin !== "null" && event.origin === window.location.origin;
  } catch {
    return false;
  }
}
