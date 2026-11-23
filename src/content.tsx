import { createContext, useContext, type ReactNode } from "react";
import { defaultContent, type Content } from "./data";

const ContentContext = createContext<Content>(defaultContent);

export function ContentProvider({ value, children }: { value: Content; children: ReactNode }) {
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): Content {
  return useContext(ContentContext);
}
