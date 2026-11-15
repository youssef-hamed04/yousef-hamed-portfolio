/// <reference types="vite/client" />
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sections, type Field, type Section } from "./schema";

type Json = any;

const ONLINE = !import.meta.env.DEV;
const RawBaseContext = createContext("");

const api = async (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("x-admin", "1");
  const response = await fetch(`${ONLINE ? "/api/admin" : "/__admin"}${path}`, { ...init, headers });
  if (ONLINE && response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
  return response;
};

const getPath = (obj: Json, path: string) => path.split(".").reduce((o, k) => o?.[k], obj);

const setPath = (obj: Json, path: string, value: Json) => {
  const copy = structuredClone(obj);
  const keys = path.split(".");
  let target = copy;
  keys.slice(0, -1).forEach((k) => (target = target[k]));
  target[keys[keys.length - 1]] = value;
  return copy;
};

// A blank item for "Add", shaped by the fields it will be edited with.
const blank = (fields: Field[]) =>
  Object.fromEntries(
    fields.map((f) => [f.key, f.type === "tags" || f.type === "list" ? [] : f.type === "number" ? 0 : ""])
  );

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export default function Admin() {
  const [content, setContent] = useState<Json>(null);
  const [saved, setSaved] = useState<Json>(null);
  const [sha, setSha] = useState("");
  const [rawBase, setRawBase] = useState("");
  const [session, setSession] = useState<"loading" | "signed-in" | "signed-out" | "unavailable">(ONLINE ? "loading" : "signed-in");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [active, setActive] = useState(sections[0].id);
  const [status, setStatus] = useState<{ tone: "ok" | "error" | "busy"; text: string } | null>(null);
  const [publishing, setPublishing] = useState<"idle" | "confirm" | "running" | "done">("idle");
  const [log, setLog] = useState("");
  const logRef = useRef<HTMLPreElement>(null);

  const dirty = useMemo(() => content && JSON.stringify(content) !== JSON.stringify(saved), [content, saved]);
  const section = sections.find((s) => s.id === active)!;

  const loadOnline = async () => {
    const r = await api("/session");
    const body = await r.json();
    if (!r.ok) {
      setAuthError(body.error);
      setSession(r.status === 401 ? "signed-out" : "unavailable");
      return;
    }
    setRawBase(body.rawBase);
    if (!content) {
      const response = await api("/content");
      const data = await response.json();
      if (!response.ok) {
        if (response.status !== 401) setSession("unavailable");
        setAuthError(data.error);
        return;
      }
      setContent(data.content);
      setSaved(data.content);
      setSha(data.sha);
    }
    setSession("signed-in");
  };

  useEffect(() => {
    if (ONLINE) {
      const expired = () => {
        setSession("signed-out");
        setPublishing("idle");
      };
      window.addEventListener("admin-session-expired", expired);
      // The private link is /admin#<key>. Read the key once, then take it out of
      // the address bar and history so it isn't left on screen.
      const linkKey = window.location.hash.slice(1);
      if (linkKey) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        signIn(linkKey);
      } else {
        loadOnline().catch((error) => {
          setAuthError(error.message);
          setSession("unavailable");
        });
      }
      return () => window.removeEventListener("admin-session-expired", expired);
    }
    api("/content")
      .then((r) => r.json())
      .then((c) => {
        setContent(c);
        setSaved(c);
      })
      .catch(() => setStatus({ tone: "error", text: "Couldn't load the content. Is the dev server running?" }));
  }, []);

  const signIn = async (linkKey: string) => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const r = await api("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: linkKey }),
      });
      const body = await r.json();
      if (!r.ok) {
        setAuthError(body.error);
        setSession(r.status === 503 ? "unavailable" : "signed-out");
        return;
      }
      await loadOnline();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Couldn't sign in.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    setAuthBusy(true);
    try {
      const r = await api("/logout", { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error);
      setAuthError("");
      setPublishing("idle");
      setSession("signed-out");
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Couldn't sign out." });
    } finally {
      setAuthBusy(false);
    }
  };

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [log]);

  const save = async () => {
    setStatus({ tone: "busy", text: "Saving…" });
    const r = await api("/content", { method: "PUT", body: JSON.stringify(content) });
    if (!r.ok) {
      const { error } = await r.json();
      setStatus({ tone: "error", text: `Not saved: ${error}` });
      return false;
    }
    setSaved(content);
    setStatus({ tone: "ok", text: "Saved. The preview updates by itself." });
    return true;
  };

  const publish = async () => {
    if (ONLINE) {
      if (!dirty || publishing === "running") return;
      setPublishing("running");
      setStatus({ tone: "busy", text: "Publishing…" });
      try {
        const r = await api("/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, sha }),
        });
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        setSha(body.sha);
        setSaved(content);
        setStatus({ tone: "ok", text: "Published. The live site updates in about a minute." });
      } catch (error) {
        setStatus({ tone: "error", text: `Not published: ${error instanceof Error ? error.message : "Request failed."}` });
      } finally {
        setPublishing("idle");
      }
      return;
    }
    if (dirty && !(await save())) return;
    setPublishing("running");
    setLog("");
    const r = await api("/publish", { method: "POST" });
    const reader = r.body!.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // Drop terminal colour codes so the log reads as plain text.
      setLog((l) => l + decoder.decode(value, { stream: true }).replace(/\x1b\[[0-9;]*m/g, ""));
    }
    setPublishing("done");
  };

  if (ONLINE && session !== "signed-in") {
    return (
      <div className="adm-signin">
        <div className="adm-signin-card">
          <p className="adm-brand">YH <span>dashboard</span></p>
          {session === "loading" ? (
            <p>Loading…</p>
          ) : session === "unavailable" ? (
            <p className="adm-error" role="alert">{authError}</p>
          ) : (
            <>
              <p>Open the dashboard with your private link.</p>
              {authError && <p className="adm-error" role="alert">{authError}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  if (!content) {
    return <div className="adm-loading">{status?.text ?? "Loading content…"}</div>;
  }

  const value = getPath(content, section.path);
  const update = (next: Json) => setContent((c: Json) => setPath(c, section.path, next));

  return (
    <div className="adm">
      <aside className="adm-side">
        <p className="adm-brand">
          YH <span>dashboard</span>
        </p>
        <nav aria-label="Sections">
          {sections.map((s) => (
            <button key={s.id} className={s.id === active ? "is-active" : ""} onClick={() => setActive(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
        <a className="adm-preview" href="/" target="_blank" rel="noreferrer">
          {ONLINE ? "Open live site" : "Open preview"}
        </a>
        {ONLINE && <button className="adm-btn adm-signout" onClick={signOut} disabled={authBusy || publishing === "running"}>Sign out</button>}
      </aside>

      <main className="adm-main">
        <header className="adm-bar">
          <div>
            <h1>{section.label}</h1>
            <p className="adm-help">{section.help}</p>
          </div>
          <div className="adm-actions">
            {status && <span className={`adm-status is-${status.tone}`}>{status.text}</span>}
            {dirty && <span className="adm-dirty">Unsaved changes</span>}
            {!ONLINE && <button className="adm-btn" onClick={save} disabled={!dirty}>
              Save
            </button>}
            <button className="adm-btn adm-btn-gold" onClick={() => setPublishing("confirm")} disabled={publishing === "running" || (ONLINE && !dirty)}>
              Publish
            </button>
          </div>
        </header>

        {publishing !== "idle" && (
          <div className="adm-publish">
            {publishing === "confirm" ? (
              <>
                <p>
                  {ONLINE ? "Publish saves your changes to GitHub. The live site updates by itself in about a minute." : <>
                    Publish {dirty ? "saves your changes, " : ""}checks the site builds, and pushes the changes to GitHub. Vercel
                    then updates the live site in about a minute.
                  </>}
                </p>
                <div className="adm-row">
                  <button className="adm-btn adm-btn-gold" onClick={publish}>
                    Publish now
                  </button>
                  <button className="adm-btn" onClick={() => setPublishing("idle")}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{publishing === "running" ? "Publishing…" : "Finished. Read the last line to check it worked."}</p>
                {!ONLINE && <pre ref={logRef}>{log}</pre>}
                {publishing === "done" && (
                  <button className="adm-btn" onClick={() => setPublishing("idle")}>
                    Close
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <RawBaseContext.Provider value={rawBase}>
          <SectionEditor section={section} value={value} onChange={update} />
        </RawBaseContext.Provider>
      </main>
    </div>
  );
}

function SectionEditor({ section, value, onChange }: { section: Section; value: Json; onChange: (v: Json) => void }) {
  if (section.kind === "object") return <ObjectFields fields={section.fields} value={value} onChange={onChange} />;
  if (section.kind === "strings") return <StringList items={value} noun={section.noun} onChange={onChange} />;
  return (
    <ListEditor
      key={section.id}
      fields={section.fields}
      items={value}
      titleKey={section.titleKey}
      noun={section.noun}
      fixed={section.fixed}
      onChange={onChange}
    />
  );
}

function ObjectFields({ fields, value, onChange }: { fields: Field[]; value: Json; onChange: (v: Json) => void }) {
  return (
    <div className="adm-fields">
      {fields.map((f) => (
        <FieldInput key={f.key} field={f} value={value?.[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
      ))}
    </div>
  );
}

function ListEditor(props: {
  fields: Field[];
  items: Json[];
  titleKey: string;
  noun: string;
  fixed?: boolean;
  onChange: (v: Json[]) => void;
}) {
  const { fields, items, titleKey, noun, fixed, onChange } = props;
  const [open, setOpen] = useState<number | null>(null);

  const set = (i: number, item: Json) => onChange(items.map((it, j) => (j === i ? item : it)));

  return (
    <div className="adm-list">
      {items.map((item, i) => (
        <div className={`adm-card${open === i ? " is-open" : ""}`} key={i}>
          <div className="adm-card-head">
            <button className="adm-card-title" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className="adm-num">{i + 1}</span>
              {String(item?.[titleKey] || `New ${noun}`)}
            </button>
            {!fixed && (
              <div className="adm-card-tools">
                <button onClick={() => onChange(move(items, i, i - 1))} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button onClick={() => onChange(move(items, i, i + 1))} disabled={i === items.length - 1} aria-label="Move down">
                  ↓
                </button>
                <button
                  className="adm-danger"
                  onClick={() => {
                    onChange(items.filter((_, j) => j !== i));
                    setOpen(null);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          {open === i && <ObjectFields fields={fields} value={item} onChange={(v) => set(i, v)} />}
        </div>
      ))}
      {!fixed && (
        <button
          className="adm-add"
          onClick={() => {
            onChange([...items, blank(fields)]);
            setOpen(items.length);
          }}
        >
          + Add {noun}
        </button>
      )}
    </div>
  );
}

function StringList({ items, noun, onChange }: { items: string[]; noun: string; onChange: (v: string[]) => void }) {
  return (
    <div className="adm-list">
      {items.map((text, i) => (
        <div className="adm-string" key={i}>
          <span className="adm-num">{i + 1}</span>
          <input value={text} onChange={(e) => onChange(items.map((t, j) => (j === i ? e.target.value : t)))} />
          <button onClick={() => onChange(move(items, i, i - 1))} disabled={i === 0} aria-label="Move up">
            ↑
          </button>
          <button onClick={() => onChange(move(items, i, i + 1))} disabled={i === items.length - 1} aria-label="Move down">
            ↓
          </button>
          <button className="adm-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Delete
          </button>
        </div>
      ))}
      <button className="adm-add" onClick={() => onChange([...items, ""])}>
        + Add {noun}
      </button>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: Field; value: Json; onChange: (v: Json) => void }) {
  const id = useMemo(() => `f-${Math.random().toString(36).slice(2)}`, []);
  const wide = field.type === "textarea" || field.type === "list" || field.type === "image";

  let control: ReactNode;
  if (field.type === "textarea") {
    control = <textarea id={id} rows={4} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (field.type === "number") {
    control = (
      <input
        id={id}
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
  } else if (field.type === "tags") {
    control = <TagsInput id={id} value={value ?? []} onChange={onChange} />;
  } else if (field.type === "image") {
    control = <ImageInput id={id} value={value ?? ""} onChange={onChange} />;
  } else if (field.type === "list") {
    control = (
      <ListEditor fields={field.item} items={value ?? []} titleKey={field.titleKey} noun={field.noun} onChange={onChange} />
    );
  } else {
    control = (
      <input
        id={id}
        type={field.type === "url" ? "url" : "text"}
        dir={"dir" in field ? field.dir : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className={`adm-field${wide ? " is-wide" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      {control}
      {field.hint && <p className="adm-hint">{field.hint}</p>}
    </div>
  );
}

// Keeps the typed text (so commas can be typed) and hands up the parsed list.
function TagsInput({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const [raw, setRaw] = useState(value.join(", "));
  const parse = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

  useEffect(() => {
    if (parse(raw).join("|") !== value.join("|")) setRaw(value.join(", "));
  }, [value]);

  return (
    <>
      <input
        id={id}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          onChange(parse(e.target.value));
        }}
      />
      {value.length > 0 && (
        <ul className="adm-tags">
          {value.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </>
  );
}

async function prepareUpload(file: File) {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 3.5 * 1024 * 1024) {
    const image = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(2000, image.width);
      canvas.height = Math.max(1, Math.round(image.height * canvas.width / image.width));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Couldn't resize the image.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Couldn't resize the image.")), "image/jpeg", 0.85);
      });
      file = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
    } finally {
      image.close();
    }
  }
  if (file.size > 4 * 1024 * 1024) throw new Error("That file is over 4 MB. Make it smaller and try again.");
  return file;
}

function ImageInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const rawBase = useContext(RawBaseContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      if (ONLINE) file = await prepareUpload(file);
      const r = await api(`/upload?name=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
      const body = await r.json();
      if (r.ok) onChange(body.path);
      else setError(body.error);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't upload the file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-image">
      {value && !value.endsWith(".pdf") && <img key={`${rawBase}:${value}`} src={value} alt="" onError={(e) => {
        const image = e.currentTarget;
        if (ONLINE && rawBase && value.startsWith("/") && !value.startsWith("//") && !image.dataset.fallback) {
          image.dataset.fallback = "true";
          image.src = rawBase + value;
        }
      }} />}
      <div className="adm-image-controls">
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/work/…" />
        <label className="adm-btn adm-upload">
          {busy ? "Uploading…" : "Upload file"}
          <input
            type="file"
            accept={ONLINE ? ".jpg,.jpeg,.png,.webp,.gif,.pdf" : "image/*,.pdf"}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {error && <p className="adm-error">{error}</p>}
      </div>
    </div>
  );
}
