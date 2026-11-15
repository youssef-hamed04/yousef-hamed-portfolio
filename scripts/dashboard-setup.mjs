// Sets up the online dashboard, or replaces its private link:
//   npm run dashboard:setup
// Makes a new random link key, asks for the GitHub key without showing it,
// saves both in Vercel, republishes, copies the private link to the clipboard,
// and opens the dashboard signed in. Running it again makes the old link stop working.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import readline from "node:readline";

const SITE = "https://yousef-hamed-portfolio.vercel.app";
const GITHUB_KEY = /^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/;

const vercel = (args, options = {}) =>
  spawnSync(`npx --yes vercel@latest ${args}`, { shell: true, encoding: "utf8", ...options });

const has = (name) => (vercel("env ls production", { stdio: ["ignore", "pipe", "pipe"] }).stdout || "").includes(name);

// Reads one line with nothing echoed to the screen.
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (text) => {
      if (!muted) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer.trim());
    });
    muted = true;
  });
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// Replaces the variable if it exists. The value goes in on stdin, so it never
// appears on the command line or the screen.
function save(name, value) {
  vercel(`env rm ${name} production --yes`, { stdio: "ignore" });
  const result = vercel(`env add ${name} production`, { input: value, stdio: ["pipe", "ignore", "pipe"] });
  if (result.status !== 0) {
    console.log(`\nCouldn't save ${name} in Vercel:\n${result.stderr}`);
    process.exit(1);
  }
  console.log(`  ${name} saved.`);
}

let token = "";
if (has("GITHUB_TOKEN") && (await ask("A GitHub key is already saved. Keep it? (Y/n) ")) !== "n") {
  console.log("  Keeping the saved GitHub key.");
} else {
  console.log("\nNothing shows on screen while you paste. That's normal. Press Enter when done.\n");
  while (!GITHUB_KEY.test(token)) {
    token = await askHidden("Paste the GitHub key (it starts with github_pat_): ");
    if (!GITHUB_KEY.test(token)) console.log("   That doesn't look like a GitHub key. Copy it again from GitHub and paste it.\n");
  }
}

const linkKey = randomBytes(32).toString("base64url");
const link = `${SITE}/admin#${linkKey}`;

console.log("\nSaving in Vercel…");
save("ADMIN_KEY", linkKey);
if (token) save("GITHUB_TOKEN", token);
if (has("ADMIN_PASSWORD")) vercel("env rm ADMIN_PASSWORD production --yes", { stdio: "ignore" });

console.log("\nRepublishing the site so it picks them up (about a minute)…");
const deploy = vercel("deploy --prod --yes", { stdio: ["ignore", "ignore", "pipe"] });
if (deploy.status !== 0) {
  console.log(`\nThe redeploy failed:\n${deploy.stderr}`);
  process.exit(1);
}

// Hand the link over without printing it: clipboard, then the browser.
spawnSync("clip", { input: link, shell: true });
spawn("cmd", ["/c", "start", "", link], { detached: true, stdio: "ignore" }).unref();

console.log(`
All set. The dashboard is opening in your browser, already signed in for 30 days.

Your private link is copied to the clipboard. Paste it somewhere only you can see
(your phone's notes, or a message to yourself) to open the dashboard on other devices.
Anyone with the link can edit the site. If it leaks, run this again to make a new one.
`);
