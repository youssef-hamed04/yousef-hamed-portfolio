// Describes every editable part of content.json so the dashboard can draw a form for it.

export type Field =
  | { key: string; label: string; type: "text" | "url" | "textarea" | "number"; hint?: string; dir?: "rtl" }
  | { key: string; label: string; type: "tags"; hint?: string }
  | { key: string; label: string; type: "image"; hint?: string }
  | { key: string; label: string; type: "list"; item: Field[]; titleKey: string; noun: string; hint?: string };

export type Section =
  | { id: string; label: string; path: string; kind: "object"; fields: Field[]; help: string }
  | { id: string; label: string; path: string; kind: "list"; fields: Field[]; titleKey: string; noun: string; help: string; fixed?: boolean }
  | { id: string; label: string; path: string; kind: "strings"; noun: string; help: string };

const projectFields: Field[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "kind", label: "Type", type: "text", hint: "A short label above the title, e.g. Graduation project" },
  { key: "body", label: "Description", type: "textarea" },
  { key: "stack", label: "Tools", type: "tags", hint: "Separate with commas" },
  { key: "live", label: "Live site link", type: "url" },
  { key: "repo", label: "Code link (GitHub)", type: "url" },
  { key: "image", label: "Screenshot", type: "image", hint: "A full-page screenshot scrolls inside the frame on hover" },
  { key: "url", label: "Address shown in the browser frame", type: "text" },
];

export const sections: Section[] = [
  {
    id: "profile",
    label: "About you",
    path: "profile",
    kind: "object",
    help: "Your name, contact details and the intro at the top of the site.",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "nameAr", label: "Name in Arabic", type: "text", dir: "rtl" },
      { key: "role", label: "Role", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "github", label: "GitHub link", type: "url" },
      { key: "githubHandle", label: "GitHub username", type: "text" },
      { key: "cv", label: "CV file", type: "image", hint: "Upload a PDF" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    path: "projects",
    kind: "list",
    noun: "project",
    titleKey: "title",
    help: "The projects in the sideways gallery, in this order, after the Student App.",
    fields: projectFields,
  },
  {
    id: "featured",
    label: "Student App",
    path: "featured",
    kind: "object",
    help: "The first, larger project in the gallery, with its three parts.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "kind", label: "Type", type: "text" },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "live", label: "Live site link", type: "url" },
      { key: "image", label: "Screenshot", type: "image" },
      { key: "url", label: "Address shown in the browser frame", type: "text" },
      {
        key: "parts",
        label: "Parts",
        type: "list",
        noun: "part",
        titleKey: "name",
        item: [
          { key: "name", label: "Name", type: "text" },
          { key: "stack", label: "Tools", type: "text" },
          { key: "body", label: "Description", type: "textarea" },
          { key: "href", label: "Link", type: "url", hint: "Leave empty for no link" },
        ],
      },
    ],
  },
  {
    id: "small",
    label: "Smaller builds",
    path: "smallProjects",
    kind: "list",
    noun: "build",
    titleKey: "title",
    help: "The short list under the gallery.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "note", label: "One-line note", type: "text" },
      { key: "href", label: "Link", type: "url" },
    ],
  },
  {
    id: "design",
    label: "UI/UX design",
    path: "designProjects",
    kind: "list",
    noun: "design project",
    titleKey: "title",
    help: "Each design project shows its phone screens in a sliding row.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "titleAr", label: "Arabic title", type: "text", dir: "rtl", hint: "Optional" },
      { key: "kind", label: "Type", type: "text" },
      { key: "body", label: "Description", type: "textarea" },
      { key: "tags", label: "Tags", type: "tags", hint: "Separate with commas" },
      {
        key: "screens",
        label: "Screens",
        type: "list",
        noun: "screen",
        titleKey: "alt",
        item: [
          { key: "src", label: "Screen image", type: "image", hint: "A phone screen, about 375 px wide" },
          { key: "alt", label: "Description for screen readers", type: "text" },
        ],
      },
    ],
  },
  {
    id: "process",
    label: "Design process",
    path: "designProcess",
    kind: "strings",
    noun: "step",
    help: "The numbered steps at the top of the UI/UX section.",
  },
  {
    id: "timeline",
    label: "Timeline",
    path: "timeline",
    kind: "list",
    noun: "entry",
    titleKey: "title",
    help: "Jobs, training and study under How I got here. Newest first.",
    fields: [
      { key: "when", label: "Dates", type: "text", hint: "e.g. Sep 2026 – now" },
      { key: "title", label: "Title", type: "text" },
      { key: "where", label: "Where", type: "text" },
      { key: "body", label: "Description", type: "textarea" },
    ],
  },
  {
    id: "certificates",
    label: "Certificates",
    path: "extras.certifications",
    kind: "list",
    noun: "certificate",
    titleKey: "name",
    help: "Listed under How I got here.",
    fields: [
      { key: "name", label: "Certificate", type: "text" },
      { key: "issuer", label: "Issued by", type: "text" },
      { key: "date", label: "Date", type: "text", hint: "e.g. Sep 2026, or leave empty" },
    ],
  },
  {
    id: "languages",
    label: "Languages",
    path: "extras.languages",
    kind: "list",
    noun: "language",
    titleKey: "name",
    help: "Listed next to the certificates.",
    fields: [
      { key: "name", label: "Language", type: "text" },
      { key: "level", label: "Level", type: "text" },
    ],
  },
  {
    id: "stats",
    label: "Numbers",
    path: "stats",
    kind: "list",
    noun: "number",
    titleKey: "label",
    help: "The big numbers that count up.",
    fields: [
      { key: "value", label: "Number", type: "number" },
      { key: "decimals", label: "Decimal places", type: "number", hint: "1 for 3.6, empty for whole numbers" },
      { key: "suffix", label: "After the number", type: "text", hint: "e.g. +" },
      { key: "label", label: "Label", type: "text" },
    ],
  },
  {
    id: "signals",
    label: "Roles",
    path: "signals",
    kind: "list",
    noun: "role",
    titleKey: "label",
    fixed: true,
    help: "The three role cards. Each is tied to a wave, so they can be edited but not added or removed.",
    fields: [
      { key: "label", label: "Role", type: "text" },
      { key: "wave", label: "Wave name", type: "text" },
      { key: "body", label: "Description", type: "textarea" },
      { key: "tools", label: "Tools", type: "tags", hint: "Separate with commas" },
    ],
  },
];
