// Local-only API for the content dashboard (admin.html). It exists only while
// `npm run dev` / `npm run admin` is running and is never part of the built site.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

const ROOT = resolve(__dirname);
const CONTENT = join(ROOT, "src", "content.json");
const UPLOADS = join(ROOT, "public", "work", "uploads");
const MAX_UPLOAD = 15 * 1024 * 1024;

const readBody = (req: IncomingMessage, limit: number) =>
  new Promise<Buffer>((done, fail) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        fail(new Error("File is too large (15 MB max)."));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => done(Buffer.concat(chunks)));
    req.on("error", fail);
  });

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

// Runs one command and streams its output into the response.
const run = (res: ServerResponse, command: string) =>
  new Promise<number>((done) => {
    res.write(`\n$ ${command}\n`);
    const child = spawn(command, { cwd: ROOT, shell: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    child.stdout.on("data", (d) => res.write(d));
    child.stderr.on("data", (d) => res.write(d));
    child.on("close", (code) => done(code ?? 1));
  });

export function contentAdmin(): Plugin {
  return {
    name: "content-admin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__admin", async (req, res) => {
        // A custom header can't be sent cross-site without CORS, so other
        // websites open in the browser can't call this API.
        if (req.headers["x-admin"] !== "1") return send(res, 403, { error: "Forbidden" });

        try {
          if (req.url === "/content" && req.method === "GET") {
            return send(res, 200, JSON.parse(readFileSync(CONTENT, "utf8")));
          }

          if (req.url === "/content" && req.method === "PUT") {
            const next = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString("utf8"));
            if (!next?.profile || !Array.isArray(next.projects)) throw new Error("That doesn't look like site content.");
            writeFileSync(CONTENT, JSON.stringify(next, null, 2) + "\n");
            return send(res, 200, { ok: true });
          }

          if (req.url?.startsWith("/upload") && req.method === "POST") {
            const raw = new URL(req.url, "http://x").searchParams.get("name") ?? "image";
            const dot = raw.lastIndexOf(".");
            const ext = dot > 0 ? raw.slice(dot).toLowerCase() : "";
            if (![".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".pdf"].includes(ext)) {
              throw new Error("Upload a JPG, PNG, WebP, GIF, SVG or PDF.");
            }
            const base = raw
              .slice(0, dot > 0 ? dot : undefined)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 60) || "file";
            const name = `${base}-${Date.now().toString(36)}${ext}`;
            mkdirSync(UPLOADS, { recursive: true });
            writeFileSync(join(UPLOADS, name), await readBody(req, MAX_UPLOAD));
            return send(res, 200, { path: `/work/uploads/${name}` });
          }

          if (req.url === "/publish" && req.method === "POST") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            const steps = [
              "npm run build",
              "npx --yes vercel@latest deploy --prod --yes",
              "git add -A",
              'git diff --cached --quiet || git commit -m "Update content from the dashboard"',
              "git push",
            ];
            for (const step of steps) {
              const code = await run(res, step);
              if (code !== 0) {
                res.end(`\nStopped: "${step}" failed (exit code ${code}). Nothing after it ran.\n`);
                return;
              }
            }
            res.end("\nDone: the live site is updated and the changes are on GitHub.\n");
            return;
          }

          send(res, 404, { error: "Not found" });
        } catch (err) {
          send(res, 400, { error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
