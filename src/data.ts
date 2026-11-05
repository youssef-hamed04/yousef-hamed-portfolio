// All site content lives here. Edit this file to update the portfolio.

export const profile = {
  name: "Yousef Hamed",
  nameAr: "يوسف حامد",
  role: "Front-end engineer & communications and computers engineering student",
  location: "Mansoura, Egypt",
  email: "yousefelgamily72@gmail.com",
  phone: "+20 106 998 4009",
  github: "https://github.com/youssef-hamed04",
  githubHandle: "youssef-hamed04",
  cv: "/Yousef_Hamed_CV.pdf",
  intro:
    "I design apps in Figma and build them with React, Next.js and React Native. I've also run a training centre's daily operations, so I know how to keep a project moving.",
};

export type SignalKey = "engineer" | "manager" | "designer";

export const signals: {
  key: SignalKey;
  label: string;
  wave: string;
  body: string;
  tools: string[];
}[] = [
  {
    key: "engineer",
    label: "Engineer",
    wave: "Sine",
    body: "Front-end work in React, Next.js and React Native, with typed APIs, auth that keeps tokens out of the browser, and full Arabic and RTL support. My AI training at Zewail City covered machine learning end to end, from notebook to deployed model.",
    tools: ["React", "Next.js", "React Native", "TypeScript", "Python", "scikit-learn"],
  },
  {
    key: "manager",
    label: "Manager",
    wave: "Square",
    body: "Two years running Total Center's day-to-day: class schedules, logistics, instructor communication and revenue-share calculations. I now oversee operations at On Air Marketing Agency.",
    tools: ["Operations", "Scheduling", "Team coordination", "Finance tracking"],
  },
  {
    key: "designer",
    label: "Designer",
    wave: "Sawtooth",
    body: "Two months of UI/UX work in Figma, taking apps from sitemap and style guide to finished screens, on top of a 50-hour graphic design diploma. I also design logos and presentations.",
    tools: ["Figma", "UI/UX", "Photoshop", "Illustrator", "InDesign", "Logo design"],
  },
];

export const featured = {
  title: "EduPlatform",
  kind: "University learning platform",
  image: "/work/student-web.jpg",
  live: "https://student-web-gray.vercel.app",
  url: "student-web-gray.vercel.app",
  summary:
    "A university learning platform built as three clients on one NestJS API: a student mobile app, a student web app and a staff dashboard.",
  parts: [
    {
      name: "Student mobile app",
      stack: "Expo, React Native, TypeScript",
      body: "Light and dark themes, full English and Arabic with real RTL, HLS video through short-lived playback tickets, and a custom native module that blocks screen capture on Android and iOS.",
    },
    {
      name: "Student web app",
      stack: "Next.js 15, React 19, TanStack Query",
      body: "The mobile experience in the browser on the same backend. A server-side proxy keeps tokens in HTTP-only cookies, refreshes sessions on 401, and avoids CORS altogether.",
      href: "https://student-web-gray.vercel.app",
    },
    {
      name: "Admin & teacher dashboard",
      stack: "Next.js, Tailwind, react-hook-form, zod",
      body: "Courses, students, teachers, access codes, support, notifications and logs for staff. Students are refused at sign-in, and every permission is re-checked by the API.",
    },
  ],
};

export const projects: {
  title: string;
  kind: string;
  body: string;
  stack: string[];
  repo?: string;
  live?: string;
  // Screenshot shown in a browser frame. Tall shots scroll inside the frame on hover.
  image?: string;
  url?: string;
}[] = [
  {
    title: "Cartify",
    kind: "Graduation project",
    image: "/work/cartify-web-tall.jpg",
    url: "cartify / web store",
    body: "A full-stack store with a smart return locker. A return request gets a daily 4-digit code, and the Arduino locker works out the same code offline with SHA-256, so it needs no internet. Guest carts merge into the account at sign-in, and an Expo app runs on the same API.",
    stack: ["Node.js", "Express", "MongoDB", "JavaScript", "Arduino", "React Native"],
  },
  {
    title: "Ghar Sheet",
    kind: "Machine learning web app",
    body: "Estimates the price of a flat anywhere in 50+ Indian cities. I cleaned a messy 187K-row Kaggle dataset, trained a scikit-learn model on it, served it with FastAPI, and built the React form that asks for the listing's details.",
    stack: ["Python", "scikit-learn", "FastAPI", "React", "Docker"],
    repo: "https://github.com/youssef-hamed04/iti_Ai_Ml_Project",
    live: "https://ghar-sheet.vercel.app",
    image: "/work/ghar-sheet.jpg",
    url: "ghar-sheet.vercel.app",
  },
  {
    title: "React e-commerce store",
    kind: "T-Square final project",
    body: "A multi-page shopping front end in React, built as the capstone of my front-end training and deployed on Vercel.",
    stack: ["React", "JavaScript", "CSS"],
    repo: "https://github.com/youssef-hamed04/React-final-ecommerce-project",
    live: "https://react-final-ecommerce-projectt-squa.vercel.app",
    image: "/work/ecommerce-tall.jpg",
    url: "react-final-ecommerce-projectt-squa.vercel.app",
  },
];

// The steps match the pages of the Shifaa Figma file, in order.
export const designProcess = ["Inspiration", "Sitemap", "Colours and type", "Components", "Final screens"];

const screens = (title: string, names: string[]) =>
  names.map((name, i) => ({
    src: `/work/uiux/${title.toLowerCase()}-${i + 1}-${name}.jpg`,
    alt: `${title} ${name} screen`,
  }));

export const designProjects = [
  {
    title: "Shifaa",
    titleAr: "شفاء",
    kind: "Health app, designed right to left in Arabic",
    body: "Patients find and filter doctors, book an appointment, upload a prescription for the pharmacy, pay, and track the delivery. 22 finished screens, built on a sitemap, a style guide and a component library.",
    tags: ["Figma", "Mobile app", "Arabic RTL", "Design system"],
    figma: "https://www.figma.com/design/6MobCcjNWCuQCTpukBiNJG/T4?node-id=245-4156",
    screens: screens("Shifaa", ["onboarding", "home", "doctor", "booking", "pharmacy", "prescription", "success", "tracking"]),
  },
  {
    title: "TastyGo",
    titleAr: "",
    kind: "Food delivery app",
    body: "Browse restaurants by category, open a menu, choose a dish's size and extras, check out in three steps, then follow the rider on a live map.",
    tags: ["Figma", "Mobile app", "Food delivery", "Icon set"],
    figma: "https://www.figma.com/design/MgthCso8560QmswVhRjkQb/Yousef-Food-App-Ui?node-id=173-3874",
    screens: screens("TastyGo", ["splash", "home", "restaurant", "product", "cart", "checkout", "tracking", "profile"]),
  },
];

export const stats: { value: number; decimals?: number; suffix?: string; label: string }[] = [
  { value: 20, suffix: "+", label: "public repositories on GitHub" },
  { value: 3.6, decimals: 1, label: "cumulative GPA at Mansoura University" },
  { value: 3, label: "years at Total Center, from data entry to center manager" },
  { value: 3, label: "languages: Arabic, English and German" },
];

export const smallProjects = [
  { title: "React Cart", note: "Shopping cart in React, live on Vercel", href: "https://react-cart-alpha-tan.vercel.app" },
  { title: "Dollar to EGP", note: "Currency converter", href: "https://github.com/youssef-hamed04/Dollat-To-EGP" },
  { title: "Login validation", note: "Sign-in form with client-side validation", href: "https://github.com/youssef-hamed04/Login-validation" },
  { title: "Flappy Bird", note: "A small game in C#", href: "https://github.com/youssef-hamed04/flabby-bird" },
];

export const timeline = [
  {
    when: "Jul 2026 – now",
    title: "Manager",
    where: "On Air Marketing Agency",
    body: "Oversee agency operations and coordinate day-to-day management.",
  },
  {
    when: "2025 – 2026",
    title: "Front-end development training",
    where: "T-Square",
    body: "HTML, CSS and JavaScript through to React, with a project at every stage.",
  },
  {
    when: "2024 – Jul 2026",
    title: "HR & center manager",
    where: "Total Center",
    body: "Ran daily operations, schedules and logistics, spoke for the center to instructors, and calculated instructor commission and revenue share.",
  },
  {
    when: "2023 – now",
    title: "AI trainee",
    where: "Zewail City",
    body: "Python, machine learning, deep learning and reinforcement learning, plus time series, clustering, big data and AI ethics.",
  },
  {
    when: "2023 – 2024",
    title: "Data entry specialist",
    where: "Total Center",
    body: "Kept student records, codes and sheets accurate and easy to find.",
  },
  {
    when: "2022 – now",
    title: "B.Sc. Communications & Computers Engineering",
    where: "Mansoura University",
    body: "Cumulative GPA 3.6.",
  },
];

export const extras = {
  certifications: [
    "Build with AI, Masr Edition",
    "Graphic design diploma, 50 hours, Grand Notion Training Center",
  ],
  languages: [
    { name: "Arabic", level: "Native" },
    { name: "English", level: "Good" },
    { name: "German", level: "Basic" },
  ],
};
