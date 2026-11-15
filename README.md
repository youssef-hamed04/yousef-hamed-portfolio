# Yousef Hamed — Portfolio

My personal site: https://yousef-hamed-portfolio.vercel.app

Built with React, TypeScript and Vite. The motion uses GSAP (ScrollTrigger and SplitText), Lenis for smooth scrolling, and Three.js for the 3D signal in the hero.

## Run it locally

```bash
npm install
npm run dev
```

## Edit the content

All the content is stored in [`src/content.json`](src/content.json). There are two dashboards for editing it, and both show the same sections: projects, certificates, timeline and so on.

### Online, from any device

Go to https://yousef-hamed-portfolio.vercel.app/admin and sign in with your password. Edit, upload screenshots, then press **Publish**. Your changes are saved to GitHub, and Vercel updates the live site by itself in about a minute.

### On this computer

```bash
npm run admin
```

This opens http://localhost:5173/admin.html.

- **Save** writes your changes. Click **Open preview** to see the site update straight away.
- **Publish** checks that the site builds, commits, pulls anything published online, and pushes to GitHub. Vercel then updates the live site.

If you've published from the online dashboard, run `git pull` before editing locally, so you start from the latest content.

## Set up the online dashboard (once)

The online dashboard needs two secrets in Vercel. Never put them in the code.

1. **Choose a password** of at least 12 characters.
2. **Create a GitHub key** at https://github.com/settings/personal-access-tokens/new:
   - Repository access: **Only select repositories**, then pick `yousef-hamed-portfolio`.
   - Permissions: **Contents: Read and write**. Leave everything else as it is.
   - Pick an expiry date, then generate it and copy the key.
3. **Add both to Vercel**: open the project in Vercel, go to **Settings → Environment Variables**, and add:
   - `ADMIN_PASSWORD`: your password
   - `GITHUB_TOKEN`: the GitHub key

   Then redeploy (Deployments → the latest one → **Redeploy**).

The Vercel project must be connected to this GitHub repository (**Settings → Git**) so that each publish deploys automatically.

To change the password or replace an expired key, update the variable in Vercel and redeploy. Everyone is signed out when either one changes.

## Tests

```bash
npm test
```

## Deploy by hand

```bash
npx vercel deploy --prod
```
