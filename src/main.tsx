import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ContentProvider } from "./content";
import { defaultContent } from "./data";
import { PreviewRoot } from "./PreviewRoot";
import { isPreview } from "./lib/preview";
import "lenis/dist/lenis.css";
import "./styles.css";

if (isPreview) document.documentElement.classList.add("is-preview");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isPreview ? <PreviewRoot /> : <ContentProvider value={defaultContent}><App /></ContentProvider>}
  </StrictMode>
);
