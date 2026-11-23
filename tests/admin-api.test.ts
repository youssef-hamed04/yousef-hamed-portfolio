import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";

const KEY = "test-key-0123456789abcdefghijklmnopqrstuv";
const TOKEN = "test-token";
const REPO = "test-owner/test-repo";
const BRANCH = "main";
const COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";

process.env.ADMIN_KEY = KEY;
process.env.GITHUB_TOKEN = TOKEN;
process.env.GITHUB_REPO = REPO;
process.env.GITHUB_BRANCH = BRANCH;

const api = await import("../api/admin/[action].ts");

type RecordedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
};

type Responder = (call: RecordedCall) => Response | Promise<Response>;

const realFetch = globalThis.fetch;
let calls: RecordedCall[] = [];
let responder: Responder;

function headerRecord(headers: any): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}

before(() => {
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const method = init.method || "GET";
    const headers = headerRecord(init.headers);
    let body: any;
    if (typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const call: RecordedCall = { url, method, headers, body };
    calls.push(call);
    return responder(call);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = realFetch;
});

beforeEach(() => {
  calls = [];
  responder = () => {
    throw new Error("Unexpected fetch call");
  };
  process.env.ADMIN_KEY = KEY;
  process.env.GITHUB_TOKEN = TOKEN;
});

// ---- Helpers -----------------------------------------------------------------

const req = (action: string, init: RequestInit = {}) =>
  new Request(`https://site.test/api/admin/${action}`, init);

const jsonHeaders = { "content-type": "application/json" };

const sessionKey = (adminKey = KEY, token = TOKEN) =>
  createHash("sha256").update(`yh-admin-session:${adminKey}:${token}`).digest();

function makeCookie(
  opts: { expires?: number; key?: string; token?: string; signature?: string } = {}
): string {
  const expires = opts.expires ?? Math.floor(Date.now() / 1000) + 3600;
  const nonce = "test-nonce";
  const key = sessionKey(opts.key, opts.token);
  const signature =
    opts.signature ?? createHmac("sha256", key).update(`${expires}.${nonce}`).digest("base64url");
  return `yh_admin=${expires}.${nonce}.${signature}`;
}

function githubFile(content: unknown, sha = "sha-current") {
  return new Response(
    JSON.stringify({
      content: Buffer.from(JSON.stringify(content), "utf8").toString("base64"),
      sha,
    }),
    { status: 200, headers: jsonHeaders }
  );
}

function githubCommit(sha = "sha-new", commit = COMMIT_SHA) {
  return new Response(JSON.stringify({ content: { sha }, commit: { sha: commit } }), {
    status: 200,
    headers: jsonHeaders,
  });
}

function githubStatuses(
  statuses: { context?: string; state?: string; target_url?: string }[]
) {
  return new Response(JSON.stringify({ statuses }), {
    status: 200,
    headers: jsonHeaders,
  });
}

async function login(): Promise<string> {
  const response = await api.POST(
    req("login", {
      method: "POST",
      headers: { ...jsonHeaders, "x-admin": "1" },
      body: JSON.stringify({ key: KEY }),
    })
  );
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return setCookie.split(";")[0];
}

const contentFixture = {
  profile: {},
  featured: {},
  extras: { certifications: [], languages: [] },
  signals: [{ title: "one" }, { title: "two" }, { title: "three" }],
  projects: [],
  smallProjects: [],
  designProcess: [],
  designProjects: [],
  timeline: [],
  stats: [],
};

function putContentRequest(
  body: unknown,
  opts: { cookie?: string; admin?: boolean } = {}
): Request {
  return req("content", {
    method: "PUT",
    headers: {
      ...jsonHeaders,
      ...(opts.admin === false ? {} : { "x-admin": "1" }),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function uploadRequest(
  name: string,
  bytes: Uint8Array,
  opts: { cookie?: string; admin?: boolean } = {}
): Request {
  return req(`upload?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      ...(opts.admin === false ? {} : { "x-admin": "1" }),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: bytes,
  });
}

function statusRequest(commit?: string, opts: { cookie?: string } = {}): Request {
  const query = commit === undefined ? "" : `?commit=${encodeURIComponent(commit)}`;
  return req(`status${query}`, {
    headers: opts.cookie ? { cookie: opts.cookie } : {},
  });
}

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

// ---- a. Configuration --------------------------------------------------------

test("config: 503 when ADMIN_KEY is missing", async () => {
  delete process.env.ADMIN_KEY;
  const response = await api.GET(req("session"));
  assert.equal(response.status, 503);
});

test("config: 503 when GITHUB_TOKEN is missing", async () => {
  delete process.env.GITHUB_TOKEN;
  const response = await api.GET(req("session"));
  assert.equal(response.status, 503);
});

test("config: 503 when ADMIN_KEY is shorter than 32 characters", async () => {
  process.env.ADMIN_KEY = "short";
  const response = await api.GET(req("session"));
  assert.equal(response.status, 503);
});

// ---- b. Login ----------------------------------------------------------------

test("login: missing x-admin header is forbidden", async () => {
  const response = await api.POST(
    req("login", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ key: KEY }) })
  );
  assert.equal(response.status, 403);
});

test("login: foreign Origin is forbidden", async () => {
  const response = await api.POST(
    req("login", {
      method: "POST",
      headers: { ...jsonHeaders, "x-admin": "1", origin: "https://evil.test" },
      body: JSON.stringify({ key: KEY }),
    })
  );
  assert.equal(response.status, 403);
});

test('login: Origin "null" is forbidden', async () => {
  const response = await api.POST(
    req("login", {
      method: "POST",
      headers: { ...jsonHeaders, "x-admin": "1", origin: "null" },
      body: JSON.stringify({ key: KEY }),
    })
  );
  assert.equal(response.status, 403);
});

test("login: wrong key is rejected after the slowdown", async () => {
  const started = Date.now();
  const response = await api.POST(
    req("login", {
      method: "POST",
      headers: { ...jsonHeaders, "x-admin": "1" },
      body: JSON.stringify({ key: "definitely-wrong" }),
    })
  );
  assert.equal(response.status, 401);
  assert.ok(Date.now() - started >= 900, "wrong keys should be slowed down");
});

test("login: right key sets a hardened session cookie", async () => {
  const response = await api.POST(
    req("login", {
      method: "POST",
      headers: { ...jsonHeaders, "x-admin": "1" },
      body: JSON.stringify({ key: KEY }),
    })
  );
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie") || "";
  assert.match(setCookie, /^yh_admin=[^;]+;/);
  assert.match(setCookie, /Path=\/api\/admin/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Max-Age=2592000/);
});

test("login: same-origin Origin is allowed", async () => {
  const response = await api.POST(
    req("login", {
      method: "POST",
      headers: { ...jsonHeaders, "x-admin": "1", origin: "https://site.test" },
      body: JSON.stringify({ key: KEY }),
    })
  );
  assert.equal(response.status, 200);
});

// ---- c. Session --------------------------------------------------------------

test("session: no cookie is unauthorized", async () => {
  const response = await api.GET(req("session"));
  assert.equal(response.status, 401);
});

test("session: cookie from login is authorized and reports the raw base", async () => {
  const cookie = await login();
  const response = await api.GET(req("session", { headers: { cookie } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    rawBase: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/public`,
  });
});

test("session: tampered signature is unauthorized", async () => {
  const cookie = makeCookie({ signature: "tampered-signature" });
  const response = await api.GET(req("session", { headers: { cookie } }));
  assert.equal(response.status, 401);
});

test("session: expired but correctly signed cookie is unauthorized", async () => {
  const cookie = makeCookie({ expires: Math.floor(Date.now() / 1000) - 60 });
  const response = await api.GET(req("session", { headers: { cookie } }));
  assert.equal(response.status, 401);
});

test("session: cookie signed with a different key is unauthorized", async () => {
  const cookie = makeCookie({ key: "another-key-0123456789abcdefghijklmn" });
  const response = await api.GET(req("session", { headers: { cookie } }));
  assert.equal(response.status, 401);
});

// ---- d. Logout ---------------------------------------------------------------

test("logout: clears the session cookie", async () => {
  const cookie = await login();
  const response = await api.POST(
    req("logout", { method: "POST", headers: { "x-admin": "1", cookie } })
  );
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie") || "";
  assert.match(setCookie, /^yh_admin=;/);
  assert.match(setCookie, /Max-Age=0/);
});

test("logout: missing x-admin header is forbidden", async () => {
  const response = await api.POST(req("logout", { method: "POST" }));
  assert.equal(response.status, 403);
});

// ---- e. Read content ---------------------------------------------------------

test("GET content: returns parsed content and sha from GitHub", async () => {
  responder = () => githubFile(contentFixture, "sha-current");
  const cookie = await login();
  calls = [];

  const response = await api.GET(req("content", { headers: { cookie } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { content: contentFixture, sha: "sha-current" });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    `https://api.github.com/repos/${REPO}/contents/src/content.json?ref=${BRANCH}`
  );
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].headers.Authorization, `Bearer ${TOKEN}`);
});

// ---- f. Write content --------------------------------------------------------

test("PUT content: valid content commits pretty JSON and returns the new sha and commit", async () => {
  responder = () => githubCommit("sha-new", COMMIT_SHA);
  const cookie = await login();
  calls = [];

  const response = await api.PUT(putContentRequest({ content: contentFixture, sha: "sha-current" }, { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, sha: "sha-new", commit: COMMIT_SHA });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.github.com/repos/${REPO}/contents/src/content.json`);
  assert.equal(calls[0].method, "PUT");
  assert.equal(calls[0].headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(calls[0].body.branch, BRANCH);
  assert.equal(calls[0].body.sha, "sha-current");
  assert.equal(typeof calls[0].body.message, "string");
  assert.equal(
    calls[0].body.content,
    Buffer.from(JSON.stringify(contentFixture, null, 2) + "\n", "utf8").toString("base64")
  );
});

test("PUT content: wrong content shape is a 400", async () => {
  const cookie = await login();
  const response = await api.PUT(
    putContentRequest({ content: { profile: {} }, sha: "sha-current" }, { cookie })
  );
  assert.equal(response.status, 400);
});

test("PUT content: signals array of length 2 is a 400", async () => {
  const cookie = await login();
  const content = { ...contentFixture, signals: [{}, {}] };
  const response = await api.PUT(putContentRequest({ content, sha: "sha-current" }, { cookie }));
  assert.equal(response.status, 400);
});

test("PUT content: a stat without a number is a 400", async () => {
  const cookie = await login();
  for (const value of [undefined, null, "", "20", Number.NaN]) {
    const content = { ...contentFixture, stats: [{ value, label: "Projects" }] };
    const response = await api.PUT(putContentRequest({ content, sha: "sha-current" }, { cookie }));
    assert.equal(response.status, 400, `for ${String(value)}`);
  }
  assert.equal(calls.length, 0);
});

test("PUT content: stats with numbers are accepted", async () => {
  const cookie = await login();
  responder = () => githubCommit();
  const content = { ...contentFixture, stats: [{ value: 3.6, decimals: 1, label: "GPA" }] };
  const response = await api.PUT(putContentRequest({ content, sha: "sha-current" }, { cookie }));
  assert.equal(response.status, 200);
});

test('PUT content: javascript: link in a project is a 400', async () => {
  const cookie = await login();
  const content = {
    ...contentFixture,
    projects: [{ live: "javascript:alert(1)" }],
  };
  const response = await api.PUT(putContentRequest({ content, sha: "sha-current" }, { cookie }));
  assert.equal(response.status, 400);
});

test('PUT content: protocol-relative //evil.com image is a 400', async () => {
  const cookie = await login();
  const content = {
    ...contentFixture,
    projects: [{ image: "//evil.com/x.png" }],
  };
  const response = await api.PUT(putContentRequest({ content, sha: "sha-current" }, { cookie }));
  assert.equal(response.status, 400);
});

test("PUT content: missing sha is a 400", async () => {
  const cookie = await login();
  const response = await api.PUT(putContentRequest({ content: contentFixture }, { cookie }));
  assert.equal(response.status, 400);
});

test("PUT content: invalid JSON body is a 400", async () => {
  const cookie = await login();
  const response = await api.PUT(putContentRequest("{not json", { cookie }));
  assert.equal(response.status, 400);
});

test("PUT content: missing x-admin header is forbidden", async () => {
  const cookie = await login();
  const response = await api.PUT(
    putContentRequest({ content: contentFixture, sha: "sha-current" }, { cookie, admin: false })
  );
  assert.equal(response.status, 403);
});

test("PUT content: no session is unauthorized", async () => {
  const response = await api.PUT(
    putContentRequest({ content: contentFixture, sha: "sha-current" })
  );
  assert.equal(response.status, 401);
});

test("PUT content: GitHub 409 is mapped to a 409", async () => {
  responder = () => new Response(JSON.stringify({ message: "conflict" }), { status: 409 });
  const cookie = await login();
  const response = await api.PUT(
    putContentRequest({ content: contentFixture, sha: "sha-current" }, { cookie })
  );
  assert.equal(response.status, 409);
});

test("PUT content: GitHub 401 is mapped to a 502", async () => {
  responder = () => new Response(JSON.stringify({ message: "bad credentials" }), { status: 401 });
  const cookie = await login();
  const response = await api.PUT(
    putContentRequest({ content: contentFixture, sha: "sha-current" }, { cookie })
  );
  assert.equal(response.status, 502);
});

// ---- g. Upload ---------------------------------------------------------------

test("upload: valid PNG is committed under a slugged name", async () => {
  responder = () => githubCommit("sha-upload");
  const cookie = await login();
  calls = [];

  const response = await api.POST(uploadRequest("My Shot.png", pngBytes, { cookie }));
  assert.equal(response.status, 200);
  const body = (await response.json()) as { ok: boolean; path: string };
  assert.equal(body.ok, true);
  assert.match(body.path, /^\/work\/uploads\/my-shot-[a-z0-9]+\.png$/);

  const fileName = body.path.slice("/work/uploads/".length);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    `https://api.github.com/repos/${REPO}/contents/public/work/uploads/${fileName}`
  );
  assert.equal(calls[0].method, "PUT");
  assert.equal(calls[0].body.branch, BRANCH);
  assert.equal(calls[0].body.content, Buffer.from(pngBytes).toString("base64"));
});

test("upload: .svg is rejected", async () => {
  const cookie = await login();
  const response = await api.POST(uploadRequest("icon.svg", pngBytes, { cookie }));
  assert.equal(response.status, 400);
});

test("upload: .png with non-PNG bytes is rejected", async () => {
  const cookie = await login();
  const response = await api.POST(
    uploadRequest("fake.png", Buffer.from("this is not a png"), { cookie })
  );
  assert.equal(response.status, 400);
});

test("upload: files over 4 MB are rejected with 413", async () => {
  const cookie = await login();
  const big = Buffer.alloc(4 * 1024 * 1024 + 1);
  pngBytes.copy(big);
  const response = await api.POST(uploadRequest("big.png", big, { cookie }));
  assert.equal(response.status, 413);
});

test("upload: no session is unauthorized", async () => {
  const response = await api.POST(uploadRequest("My Shot.png", pngBytes));
  assert.equal(response.status, 401);
});

// ---- i. Deploy status --------------------------------------------------------

test("status: no session is unauthorized", async () => {
  const response = await api.GET(statusRequest(COMMIT_SHA));
  assert.equal(response.status, 401);
});

test("status: missing commit is a 400", async () => {
  const cookie = await login();
  const response = await api.GET(statusRequest(undefined, { cookie }));
  assert.equal(response.status, 400);
});

test("status: malformed commit is a 400", async () => {
  const cookie = await login();
  for (const commit of ["abc", "A".repeat(40), "g".repeat(40), COMMIT_SHA + "0"]) {
    const response = await api.GET(statusRequest(commit, { cookie }));
    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(commit)}`);
  }
});

test("status: no Vercel status is pending and calls GitHub with the token", async () => {
  responder = () => githubStatuses([]);
  const cookie = await login();
  calls = [];

  const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { state: "pending" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.github.com/repos/${REPO}/commits/${COMMIT_SHA}/status`);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].headers.Authorization, `Bearer ${TOKEN}`);
});

test("status: Vercel success returns the Vercel url", async () => {
  responder = () =>
    githubStatuses([
      { context: "Vercel", state: "success", target_url: "https://vercel.com/team/project/abc" },
    ]);
  const cookie = await login();

  const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    state: "success",
    url: "https://vercel.com/team/project/abc",
  });
});

test("status: Vercel error and failure are both failure", async () => {
  const cookie = await login();
  for (const state of ["error", "failure"]) {
    responder = () =>
      githubStatuses([{ context: "Vercel", state, target_url: "https://vercel.com/x" }]);
    const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { state: "failure", url: "https://vercel.com/x" });
  }
});

test("status: Vercel pending is pending", async () => {
  responder = () => githubStatuses([{ context: "Vercel", state: "pending" }]);
  const cookie = await login();

  const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { state: "pending" });
});

test("status: target_url on another host is dropped", async () => {
  const cookie = await login();
  for (const target_url of [
    "https://vercel.com.evil.test/x",
    "http://vercel.com/x",
    "https://evil.test/",
  ]) {
    responder = () => githubStatuses([{ context: "Vercel", state: "success", target_url }]);
    const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { state: "success" }, `for ${target_url}`);
  }
});

test("status: a non-Vercel status is ignored", async () => {
  responder = () =>
    githubStatuses([{ context: "ci/test", state: "failure", target_url: "https://vercel.com/x" }]);
  const cookie = await login();

  const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { state: "pending" });
});

test("status: GitHub 500 is unknown", async () => {
  responder = () => new Response(JSON.stringify({ message: "boom" }), { status: 500 });
  const cookie = await login();

  const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { state: "unknown" });
});

test("status: GitHub 403 is unknown, not 502", async () => {
  responder = () => new Response(JSON.stringify({ message: "forbidden" }), { status: 403 });
  const cookie = await login();

  const response = await api.GET(statusRequest(COMMIT_SHA, { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { state: "unknown" });
});

// ---- j. Unknown route --------------------------------------------------------

test("unknown route: returns 404 for a signed-in user", async () => {
  const cookie = await login();
  const response = await api.GET(req("nope", { headers: { cookie } }));
  assert.equal(response.status, 404);
});
