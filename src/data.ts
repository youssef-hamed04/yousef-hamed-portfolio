// The site's content lives in content.json. Edit it from the dashboard
// (npm run admin) or by hand; this file only gives it types for the code.
import content from "./content.json";

export type SignalKey = "engineer" | "manager" | "designer";

export type Profile = {
  name: string;
  nameAr: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  githubHandle: string;
  cv: string;
  intro: string;
};

export type Signal = { key: SignalKey; label: string; wave: string; body: string; tools: string[] };

export type FeaturedPart = { name: string; stack: string; body: string; href?: string };

export type Featured = {
  title: string;
  kind: string;
  image: string;
  live: string;
  url: string;
  summary: string;
  parts: FeaturedPart[];
};

export type Project = {
  title: string;
  kind: string;
  body: string;
  stack: string[];
  repo?: string;
  live?: string;
  // Screenshot shown in a browser frame. Tall shots scroll inside the frame on hover.
  image?: string;
  url?: string;
};

export type SmallProject = { title: string; note: string; href: string };

export type DesignProject = {
  title: string;
  titleAr: string;
  kind: string;
  body: string;
  tags: string[];
  screens: { src: string; alt: string }[];
};

export type TimelineItem = { when: string; title: string; where: string; body: string };

export type Certificate = { name: string; issuer: string; date: string };

export type Language = { name: string; level: string };

export type Stat = { value: number; decimals?: number; suffix?: string; label: string };

export type Content = {
  profile: Profile;
  signals: Signal[];
  featured: Featured;
  projects: Project[];
  smallProjects: SmallProject[];
  // The steps match the pages of the Shifaa Figma file, in order.
  designProcess: string[];
  designProjects: DesignProject[];
  timeline: TimelineItem[];
  extras: { certifications: Certificate[]; languages: Language[] };
  stats: Stat[];
};

const data = content as Content;

export const {
  profile,
  signals,
  featured,
  projects,
  smallProjects,
  designProcess,
  designProjects,
  timeline,
  extras,
  stats,
} = data;
