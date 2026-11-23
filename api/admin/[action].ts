// Online dashboard API, deployed as one Vercel Function at /api/admin/<action>.
//
//   POST /api/admin/login     { key }             sets a signed, HttpOnly session cookie
//   POST /api/admin/logout                        clears it
//   GET  /api/admin/session                       200 if signed in, else 401
//   GET  /api/admin/content                       { content, sha } from GitHub
//   PUT  /api/admin/content   { content, sha }    commits src/content.json, returns { sha, commit }
//   POST /api/admin/upload?name=<file>  <bytes>   commits public/work/uploads/<file>
//   GET  /api/admin/status?commit=<sha>           { state, url? } of Vercel's deploy for that commit
//
// Saving commits to GitHub, and Vercel's Git integration redeploys the site.
// Needs two environment variables in Vercel: ADMIN_KEY, the random secret in the
// private dashboard link (/admin#<key>), and GITHUB_TOKEN (fine-grained, this
// repository only, Contents: read and write).
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const REPO = process.env.GITHUB_REPO || "youssef-hamed04/yousef-hamed-portfolio";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const CONTENT_PATH = "src/content.json";
const COOKIE = "yh_admin";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
// The link key is generated, not chosen, so it can be long enough that guessing is hopeless.
const MIN_KEY = 32;
const MAX_CONTENT = 1024 * 1024;
// Vercel caps request bodies at 4.5 MB.
const MAX_UPLOAD = 4 * 1024 * 1024;

// Upload types, checked by extension and by the file's first bytes. SVG is left
// out on purpose: served from this origin, it could run script.
const FILE_TYPES: Record<string, (b: Buffer) => boolean> = {
  ".jpg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ".webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  ".gif": (b) => b.subarray(0, 4).toString("latin1") === "GIF8",
  ".pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};

// Fields whose values end up in href or src attributes.
const LINK_KEYS = new Set(["href", "live", "repo", "github", "image", "src", "cv"]);
const SAFE_LINK = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

const sha256 = (text: string) => createHash("sha256").update(text).digest();

function config() {
  const adminKey = process.env.ADMIN_KEY || "";
  const token = process.env.GITHUB_TOKEN || "";
  if (!adminKey || !token) {
    throw new HttpError(503, "The dashboard isn't set up yet. Add ADMIN_KEY and GITHUB_TOKEN in Vercel, then redeploy.");
  }
  if (adminKey.length < MIN_KEY) {
    throw new HttpError(503, `ADMIN_KEY must be at least ${MIN_KEY} characters.`);
  }
  // Sessions are signed with a key derived from both secrets, so a new link
  // (or a new GitHub key) signs everybody out.
  return { adminKey, token, key: sha256(`yh-admin-session:${adminKey}:${token}`) };
}

// ---- Sessions ----------------------------------------------------------------

const sign = (key: Buffer, payload: string) => createHmac("sha256", key).update(payload).digest("base64url");

function sessionCookie(key: Buffer) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = randomBytes(12).toString("base64url");
  const payload = `${expires}.${nonce}`;
  return `${COOKIE}=${payload}.${sign(key, payload)}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

const clearedCookie = `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function hasSession(request: Request, key: Buffer) {
  const cookie = request.headers.get("cookie") || "";
  const value = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;
  const expected = Buffer.from(sign(key, `${expires}.${nonce}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  return Number(expires) > Date.now() / 1000;
}

// Requests that change anything must come from the dashboard page itself: the
// custom header can't be sent cross-site without CORS, and the Origin must match.
function checkSameOrigin(request: Request) {
  if (request.headers.get("x-admin") !== "1") throw new HttpError(403, "Forbidden");
  const origin = request.headers.get("origin");
  if (!origin) return;
  let host = "";
  try {
    host = new URL(origin).host;
  } catch {
    // An opaque origin ("null") can't be ours.
  }
  if (host !== new URL(request.url).host) throw new HttpError(403, "Forbidden");
}

// ---- GitHub ------------------------------------------------------------------

// `path` is relative to the repository, e.g. "contents/src/content.json".
async function github(token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "yousef-hamed-portfolio-dashboard",
      ...(init.headers || {}),
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new HttpError(502, "GitHub refused the request. Check that GITHUB_TOKEN is valid and can write to this repository.");
  }
  return response;
}

async function readContent(token: string) {
  const response = await github(token, `contents/${CONTENT_PATH}?ref=${encodeURIComponent(BRANCH)}`);
  if (!response.ok) throw new HttpError(502, `Couldn't read the content from GitHub (${response.status}).`);
  const file = (await response.json()) as { content: string; sha: string };
  return { content: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")), sha: file.sha };
}

async function commitFile(token: string, path: string, bytes: Buffer, message: string, sha?: string) {
  const response = await github(token, `contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: bytes.toString("base64"), branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (response.status === 409 || response.status === 422) {
    throw new HttpError(
      409,
      "The content changed somewhere else since you opened the dashboard. Copy your edit, reload, and make it again."
    );
  }
  if (!response.ok) throw new HttpError(502, `GitHub didn't accept the change (${response.status}).`);
  const body = (await response.json()) as { content?: { sha?: string }; commit?: { sha?: string } };
  return { sha: body.content?.sha, commit: body.commit?.sha };
}

// Vercel reports each deploy on its commit as a GitHub status named "Vercel".
// No status yet means Vercel hasn't picked the commit up, which reads as pending.
async function deployState(token: string, commit: string) {
  let response: Response;
  try {
    response = await github(token, `commits/${commit}/status`);
  } catch {
    return { state: "unknown" };
  }
  if (!response.ok) return { state: "unknown" };
  const body = (await response.json()) as { statuses?: { context?: string; state?: string; target_url?: string }[] };
  const vercel = body.statuses?.find((s) => s.context?.startsWith("Vercel"));
  if (!vercel) return { state: "pending" };
  // The deploy's page on Vercel, passed on only if it really is a Vercel address.
  let url: string | undefined;
  try {
    const target = new URL(vercel.target_url || "");
    if (target.protocol === "https:" && target.hostname === "vercel.com") url = target.href;
  } catch {
    // No usable link.
  }
  if (vercel.state === "success") return { state: "success", url };
  if (vercel.state === "failure" || vercel.state === "error") return { state: "failure", url };
  return { state: "pending", url };
}

// ---- Validation --------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function checkLinks(value: unknown, key = ""): void {
  if (Array.isArray(value)) return value.forEach((v) => checkLinks(v, key));
  if (isObject(value)) return Object.entries(value).forEach(([k, v]) => checkLinks(v, k));
  if (typeof value === "string" && LINK_KEYS.has(key) && value !== "" && !SAFE_LINK.test(value)) {
    throw new HttpError(400, `"${value}" isn't a valid link. Use a full https:// address or a path starting with /.`);
  }
}

function checkContent(content: unknown) {
  const c = content as Record<string, unknown>;
  const ok =
    isObject(c) &&
    isObject(c.profile) &&
    isObject(c.featured) &&
    isObject(c.extras) &&
    Array.isArray(c.signals) &&
    c.signals.length === 3 &&
    ["projects", "smallProjects", "designProcess", "designProjects", "timeline", "stats"].every((k) => Array.isArray(c[k])) &&
    Array.isArray((c.extras as Record<string, unknown>).certifications) &&
    Array.isArray((c.extras as Record<string, unknown>).languages);
  if (!ok) throw new HttpError(400, "That doesn't look like site content.");
  // An empty number would break the live site, which formats every stat.
  if (!(c.stats as unknown[]).every((s) => isObject(s) && Number.isFinite(s.value))) {
    throw new HttpError(400, "Every item in Numbers needs a number.");
  }
  checkLinks(content);
}

function uploadName(raw: string) {
  const dot = raw.lastIndexOf(".");
  const ext = dot > 0 ? raw.slice(dot).toLowerCase() : "";
  if (!FILE_TYPES[ext]) throw new HttpError(400, "Upload a JPG, PNG, WebP, GIF or PDF.");
  const base =
    raw
      .slice(0, dot)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "file";
  return { ext, name: `${base}-${Date.now().toString(36)}${randomBytes(3).toString("hex")}${ext}` };
}

async function readBody(request: Request, limit: number, tooBig: string) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) throw new HttpError(413, tooBig);
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length > limit) throw new HttpError(413, tooBig);
  return bytes;
}

// ---- Routes ------------------------------------------------------------------

const action = (request: Request) => new URL(request.url).pathname.split("/").filter(Boolean).pop();

async function handle(request: Request): Promise<Response> {
  const route = `${request.method} ${action(request)}`;
  const { adminKey, token, key } = config();

  if (route === "POST login") {
    checkSameOrigin(request);
    const body = (await request.json().catch(() => ({}))) as { key?: unknown };
    const given = typeof body.key === "string" ? body.key : "";
    if (!timingSafeEqual(sha256(given), sha256(adminKey))) {
      // Slow down guessing; each wrong try costs the guesser a second.
      await new Promise((r) => setTimeout(r, 1000));
      throw new HttpError(401, "This link isn't valid. Open the newest link from the setup tool.");
    }
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(key) });
  }

  if (route === "POST logout") {
    checkSameOrigin(request);
    return json({ ok: true }, 200, { "Set-Cookie": clearedCookie });
  }

  if (!hasSession(request, key)) throw new HttpError(401, "Please sign in.");

  if (route === "GET session") {
    return json({ ok: true, rawBase: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/public` });
  }

  if (route === "GET content") {
    return json(await readContent(token));
  }

  if (route === "PUT content") {
    checkSameOrigin(request);
    const raw = await readBody(request, MAX_CONTENT, "The content is too large.");
    const body = JSON.parse(raw.toString("utf8")) as { content?: unknown; sha?: unknown };
    if (typeof body.sha !== "string") throw new HttpError(400, "Missing version. Reload the dashboard.");
    checkContent(body.content);
    const bytes = Buffer.from(JSON.stringify(body.content, null, 2) + "\n", "utf8");
    const saved = await commitFile(token, CONTENT_PATH, bytes, "Update content from the online dashboard", body.sha);
    return json({ ok: true, ...saved });
  }

  if (route === "GET status") {
    const commit = new URL(request.url).searchParams.get("commit") || "";
    if (!/^[0-9a-f]{40}$/.test(commit)) throw new HttpError(400, "Missing or invalid commit.");
    return json(await deployState(token, commit));
  }

  if (route === "POST upload") {
    checkSameOrigin(request);
    const { ext, name } = uploadName(new URL(request.url).searchParams.get("name") || "");
    const bytes = await readBody(request, MAX_UPLOAD, "That file is over 4 MB. Make it smaller and try again.");
    if (!FILE_TYPES[ext](bytes)) throw new HttpError(400, "That file isn't the type its name says.");
    await commitFile(token, `public/work/uploads/${name}`, bytes, `Upload ${name} from the online dashboard`);
    return json({ ok: true, path: `/work/uploads/${name}` });
  }

  throw new HttpError(404, "Not found");
}

async function respond(request: Request) {
  try {
    return await handle(request);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    if (err instanceof SyntaxError) return json({ error: "The request wasn't valid JSON." }, 400);
    console.error(err);
    return json({ error: "Something went wrong on the server." }, 500);
  }
}

export const GET = respond;
export const POST = respond;
export const PUT = respond;
