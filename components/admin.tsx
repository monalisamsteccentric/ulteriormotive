"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  LogOut,
  Check,
  EyeOff,
  Trash2,
  Pencil,
  ImagePlus,
} from "lucide-react";
import { api, browser, configured } from "@/lib/browser";
import type { AdminPhoto, Analytics, ContentItem, Participant } from "@/types";
import { Captcha } from "./captcha";
type Dashboard = {
  content: ContentItem[];
  participants: Participant[];
  photos: AdminPhoto[];
  analytics: Analytics;
  page: number;
};
const emptyContent = {
  title: "",
  description: "",
  url: "",
  category: "Read" as ContentItem["category"],
  duration_minutes: 5,
  position: 0,
  enabled: false,
};
export function Admin() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Content");
  const [editor, setEditor] = useState<Partial<ContentItem> | null>(null);
  const [page, setPage] = useState(0);
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const load = useCallback(async () => {
    if (!configured()) {
      setLoading(false);
      return;
    }
    const session = (await browser().auth.getSession()).data.session;
    if (session && !session.user.is_anonymous)
      setData(await api<Dashboard>("admin?page=" + page));
    setLoading(false);
  }, [page]);
  useEffect(() => {
    load().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [load]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !token)
        throw new Error("Complete the security check first.");
      const previous = (await browser().auth.getSession()).data.session;
      if (previous?.user.is_anonymous)
        throw new Error(
          "This browser has an anonymous participant session. Open the admin studio in a separate browser profile to keep access to your tile.",
        );
      const result = await browser().auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
        options: { captchaToken: token || undefined },
      });
      if (result.error) throw result.error;
      const dashboard = await api<Dashboard>("admin?page=0");
      setData(dashboard);
      setPage(0);
    } catch (e) {
      setError((e as Error).message);
      setToken("");
      setCaptchaKey((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await browser().auth.signOut({ scope: "local" });
      setData(null);
      setNotice("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, {
        method,
        body:
          body instanceof FormData
            ? body
            : body === undefined
              ? undefined
              : JSON.stringify(body),
      });
      await load();
      setNotice("Saved.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      title: form.get("title"),
      description: form.get("description"),
      url: form.get("url"),
      category: form.get("category"),
      duration_minutes: Number(form.get("duration_minutes")),
      position: Number(form.get("position")),
      enabled: form.get("enabled") === "on",
    };
    if (
      await mutate(
        "admin/content" + (editor?.id ? "/" + editor.id : ""),
        editor?.id ? "PUT" : "POST",
        values,
      )
    )
      setEditor(null);
  }
  async function reorder(item: ContentItem, direction: number) {
    if (!data) return;
    const index = data.content.findIndex((c) => c.id === item.id);
    const target = index + direction;
    if (target < 0 || target >= data.content.length) return;
    const ids = data.content.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await mutate("admin/order", "PUT", { ids });
  }
  if (loading)
    return (
      <main className="legal shell">
        <p>Opening the studio...</p>
      </main>
    );
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/" className="text-link">
          <ArrowLeft size={17} />
          Back to the mosaic
        </Link>
        <strong>ulterior motive / studio</strong>
        {data && (
          <button className="button outline small" onClick={logout}>
            <LogOut size={15} />
            Sign out
          </button>
        )}
      </header>
      {!data ? (
        <main className="login-card">
          <span className="eyebrow">BEHIND THE MOSAIC</span>
          <h1>Welcome back.</h1>
          <p>Sign in with your administrator account.</p>
          <form onSubmit={login}>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <Captcha key={captchaKey} onToken={setToken} />
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="button dark full" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="tiny">
            Administrator access is invitation-only. Use a separate browser
            profile if you also participate in the mosaic.
          </p>
        </main>
      ) : (
        <main className="admin-main">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE BIGGER PICTURE</span>
              <h1>
                Your community,
                <br />
                at a glance.
              </h1>
            </div>
            <p>A little care keeps curiosity growing.</p>
          </div>
          <div className="stat-grid">
            {[
              { label: "Participants", value: data.analytics.participants },
              {
                label: "Unique discoveries",
                value: data.analytics.discoveries,
              },
              { label: "Awaiting review", value: data.analytics.pending },
              { label: "Live content", value: data.analytics.activeContent },
            ].map((s) => (
              <article key={s.label}>
                <span>{s.label}</span>
                <strong>{s.value.toLocaleString()}</strong>
              </article>
            ))}
          </div>
          <nav className="admin-tabs" aria-label="Dashboard sections">
            {["Content", "Participants", "Editorial photos", "Analytics"].map(
              (t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => {
                    setTab(t);
                    setEditor(null);
                  }}
                >
                  {t}
                </button>
              ),
            )}
          </nav>
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice success">
              {notice}
            </div>
          )}
          {tab === "Content" && (
            <section>
              <div className="admin-section-title">
                <div>
                  <h2>The discovery collection</h2>
                  <p>
                    Only enabled items appear publicly. Arrows change their
                    order.
                  </p>
                </div>
                <button
                  className="button dark small"
                  disabled={busy}
                  onClick={() =>
                    setEditor({
                      ...emptyContent,
                      position: data.content.length,
                    })
                  }
                >
                  <Plus size={17} />
                  Add content
                </button>
              </div>
              {editor && (
                <form
                  className="editor-form"
                  onSubmit={saveContent}
                  key={editor.id ?? "new"}
                >
                  <div className="admin-section-title">
                    <h3>{editor.id ? "Edit discovery" : "A new discovery"}</h3>
                    <button
                      aria-label="Close editor"
                      type="button"
                      onClick={() => setEditor(null)}
                    >
                      <X />
                    </button>
                  </div>
                  <label>
                    Title
                    <input
                      name="title"
                      defaultValue={editor.title}
                      required
                      minLength={2}
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      name="description"
                      defaultValue={editor.description}
                      maxLength={600}
                      rows={3}
                    />
                  </label>
                  <label>
                    Destination URL
                    <input
                      name="url"
                      type="url"
                      placeholder="https://..."
                      defaultValue={editor.url}
                      required
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Category
                      <select name="category" defaultValue={editor.category}>
                        {["Read", "Watch", "Listen", "Explore"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Minutes
                      <input
                        name="duration_minutes"
                        type="number"
                        min={1}
                        max={240}
                        defaultValue={editor.duration_minutes}
                        required
                      />
                    </label>
                    <label>
                      Position
                      <input
                        name="position"
                        type="number"
                        min={0}
                        max={100000}
                        defaultValue={editor.position}
                        required
                      />
                    </label>
                  </div>
                  <label className="checkbox-label">
                    <input
                      name="enabled"
                      type="checkbox"
                      defaultChecked={editor.enabled}
                    />
                    Enable publicly
                  </label>
                  <button className="button dark" disabled={busy}>
                    {busy ? "Saving..." : "Save discovery"}
                  </button>
                </form>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Discovery</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                          <small>{new URL(item.url).hostname}</small>
                        </td>
                        <td>{item.category}</td>
                        <td>
                          <button
                            className={
                              "badge " + (item.enabled ? "approved" : "hidden")
                            }
                            disabled={busy}
                            onClick={() =>
                              mutate("admin/content/" + item.id, "PUT", {
                                ...item,
                                enabled: !item.enabled,
                              })
                            }
                          >
                            {item.enabled ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              aria-label={"Move " + item.title + " up"}
                              disabled={busy || index === 0}
                              onClick={() => reorder(item, -1)}
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              aria-label={"Move " + item.title + " down"}
                              disabled={
                                busy || index === data.content.length - 1
                              }
                              onClick={() => reorder(item, 1)}
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              aria-label={"Edit " + item.title}
                              disabled={busy}
                              onClick={() => setEditor(item)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              aria-label={"Delete " + item.title}
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Delete this discovery? Previous growth remains earned.",
                                  )
                                )
                                  void mutate(
                                    "admin/content/" + item.id,
                                    "DELETE",
                                  );
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.content.length && (
                  <p className="empty">
                    The collection is ready for its first discovery.
                  </p>
                )}
              </div>
            </section>
          )}
          {tab === "Participants" && (
            <section>
              <div className="admin-section-title">
                <div>
                  <h2>People make the mosaic.</h2>
                  <p>
                    Review photos before approving them. Hiding a tile also
                    blocks further discoveries.
                  </p>
                </div>
              </div>
              <div className="moderation-grid">
                {data.participants.map((p) => (
                  <article className="moderation-card" key={p.id}>
                    <div className={"moderation-avatar " + p.avatar}>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.alias} />
                      ) : (
                        p.alias.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3>{p.alias}</h3>
                      <span className={"badge " + p.status}>{p.status}</span>
                      <p>
                        {p.discoveries} discoveries -{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                      <div className="row-actions">
                        <button
                          className="button outline small"
                          disabled={busy || p.status === "approved"}
                          onClick={() =>
                            mutate("admin/participants/" + p.id, "PATCH", {
                              status: "approved",
                            })
                          }
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          className="button outline small"
                          disabled={busy || p.status === "hidden"}
                          onClick={() =>
                            mutate("admin/participants/" + p.id, "PATCH", {
                              status: "hidden",
                            })
                          }
                        >
                          <EyeOff size={14} />
                          Hide
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!data.participants.length && (
                <p className="empty">No participants on this page.</p>
              )}
              <div className="pagination">
                <button
                  disabled={busy || page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page + 1}</span>
                <button
                  disabled={busy || data.participants.length < 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
          {tab === "Editorial photos" && (
            <section>
              <div className="admin-section-title">
                <div>
                  <h2>A little visual inspiration.</h2>
                  <p>
                    Editorial photos are separate from participant tiles and
                    never earn discoveries.
                  </p>
                </div>
              </div>
              <form
                className="editor-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const element = e.currentTarget;
                  const form = new FormData(element);
                  if (await mutate("admin/photos", "POST", form))
                    element.reset();
                }}
              >
                <div className="form-row">
                  <label>
                    Caption
                    <input name="caption" required maxLength={80} />
                  </label>
                  <label>
                    Photo
                    <input
                      name="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                    />
                  </label>
                </div>
                <label className="checkbox-label">
                  <input type="checkbox" required />I have permission to publish
                  this photo.
                </label>
                <button className="button dark" disabled={busy}>
                  <ImagePlus size={17} />
                  Upload editorial photo
                </button>
              </form>
              <div className="editorial-grid">
                {data.photos.map((p) => (
                  <article className="editorial-card" key={p.id}>
                    {p.photo_url && <img src={p.photo_url} alt={p.caption} />}
                    <div>
                      <h3>{p.caption}</h3>
                      <label>
                        Position
                        <input
                          aria-label={"Position for " + p.caption}
                          type="number"
                          min={0}
                          max={100000}
                          defaultValue={p.position}
                          key={p.position}
                          disabled={busy}
                          onBlur={(e) => {
                            if (Number(e.target.value) !== p.position)
                              void mutate("admin/photos/" + p.id, "PATCH", {
                                enabled: p.enabled,
                                position: Number(e.target.value),
                              });
                          }}
                        />
                      </label>
                      <div className="row-actions">
                        <button
                          disabled={busy}
                          className="button outline small"
                          onClick={() =>
                            mutate("admin/photos/" + p.id, "PATCH", {
                              position: p.position,
                              enabled: !p.enabled,
                            })
                          }
                        >
                          {p.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          aria-label={"Delete " + p.caption}
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm(
                                "Permanently delete this editorial photo?",
                              )
                            )
                              void mutate("admin/photos/" + p.id, "DELETE");
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {tab === "Analytics" && (
            <section>
              <div className="admin-section-title">
                <div>
                  <h2>Curiosity, in numbers.</h2>
                  <p>
                    Unique content opens, not proof of reading. Deleted
                    participants are excluded.
                  </p>
                </div>
              </div>
              <div className="analytics-grid">
                <article className="analytics-panel">
                  <h3>Discoveries - last 30 days</h3>
                  {data.analytics.daily.length ? (
                    <div
                      className="chart"
                      role="img"
                      aria-label="Daily discovery counts"
                    >
                      {data.analytics.daily.map((d) => (
                        <div className="chart-column" key={d.day}>
                          <span>{d.discoveries}</span>
                          <div
                            style={{
                              height: Math.max(
                                4,
                                (d.discoveries /
                                  Math.max(
                                    ...data.analytics.daily.map(
                                      (v) => v.discoveries,
                                    ),
                                  )) *
                                  160,
                              ),
                            }}
                          />
                          <small>{d.day.slice(5)}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">The first discovery is still ahead.</p>
                  )}
                  <details>
                    <summary>View chart data</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Discoveries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.analytics.daily.map((d) => (
                          <tr key={d.day}>
                            <td>{d.day}</td>
                            <td>{d.discoveries}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </article>
                <article className="analytics-panel">
                  <h3>What catches their eye</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Discovery</th>
                        <th>Unique opens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analytics.content.map((c) => (
                        <tr key={c.id}>
                          <td>{c.title}</td>
                          <td>{c.visits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
