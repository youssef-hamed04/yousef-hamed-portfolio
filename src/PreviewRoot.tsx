import { Component, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import App from "./App";
import { ContentProvider } from "./content";
import { defaultContent } from "./data";
import { fromSameOrigin } from "./lib/preview";

const targets: Record<string, string> = {
  profile: "#top", projects: "#work", featured: "#work", small: "#work",
  design: "#design", process: "#design", timeline: "#path", certificates: "#path",
  languages: "#path", stats: ".stats", signals: ".signals",
};

export function PreviewRoot() {
  const [content, setContent] = useState(defaultContent);
  const [navigation, setNavigation] = useState<{ section?: string; x: number; y: number }>();
  const rawBase = useRef("");

  useLayoutEffect(() => {
    const retryImage = (img: HTMLImageElement) => {
      if (!rawBase.current) return;
      const url = new URL(img.src);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/work/") || img.dataset.previewRetry === img.src) return;
      img.src = rawBase.current + url.pathname;
      img.dataset.previewRetry = img.src;
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !fromSameOrigin(event)) return;
      const message = event.data;
      if (!message || typeof message !== "object" || message.type !== "yh-preview") return;
      if (typeof message.rawBase === "string") {
        rawBase.current = message.rawBase;
        document.querySelectorAll("img").forEach((img) => {
          if (img.complete && img.naturalWidth === 0) retryImage(img);
        });
      }
      if (message.content) setContent(message.content);
      setNavigation({ section: message.section, x: window.scrollX, y: window.scrollY });
    };
    const fallback = (event: Event) => {
      const img = event.target;
      if (img instanceof HTMLImageElement) retryImage(img);
    };
    window.addEventListener("message", receive);
    document.addEventListener("error", fallback, true);
    window.parent.postMessage({ type: "yh-preview-ready" }, window.location.origin);
    return () => {
      window.removeEventListener("message", receive);
      document.removeEventListener("error", fallback, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!navigation) return;
    const selector = navigation.section && targets[navigation.section];
    if (typeof selector === "string") document.querySelector(selector)?.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ left: navigation.x, top: navigation.y, behavior: "instant" });
  }, [navigation]);

  return (
    <ContentProvider value={content}>
      <DraftBoundary draft={content}>
        <App />
      </DraftBoundary>
    </ContentProvider>
  );
}

// A half-finished edit (an emptied number, say) can make a section throw. Show a
// note instead of a blank page, and try again as soon as the draft changes.
class DraftBoundary extends Component<{ draft: unknown; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: { draft: unknown }) {
    if (this.state.failed && previous.draft !== this.props.draft) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="preview-error">This change can't be previewed yet. Keep editing, and the preview comes back once it's complete.</p>
    );
  }
}
