# Yousef Hamed — Portfolio

My personal site: https://yousef-hamed-portfolio.vercel.app

Built with React, TypeScript and Vite. The motion uses GSAP (ScrollTrigger and SplitText), Lenis for smooth scrolling, and Three.js for the 3D signal in the hero.

## Run it locally

```bash
npm install
npm run dev
```

## Edit the content with the dashboard

```bash
npm run admin
```

This opens the dashboard at http://localhost:5173/admin.html. Pick a section on the left (projects, certificates, timeline and so on), edit or add items, upload screenshots, then:

- **Save** writes your changes. Click **Open preview** to see the site update straight away.
- **Publish** saves, rebuilds the site, uploads it to Vercel, and pushes the changes to GitHub.

The dashboard only runs on your computer while that command is running. It is not part of the live site.

All the content is stored in [`src/content.json`](src/content.json), so you can also edit that file by hand. Uploaded files go to `public/work/uploads/`.

## Deploy by hand

```bash
npx vercel deploy --prod
```
