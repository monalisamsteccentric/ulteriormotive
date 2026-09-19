"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  X,
  Plus,
  Sparkles,
  Check,
  ImagePlus,
  Compass,
  BookOpen,
  Play,
  Headphones,
  Trash2,
  Flower,
} from "lucide-react";
import { api, browser, configured } from "@/lib/browser";
import { progress } from "@/lib/domain";
import type { ContentItem, MosaicTile, Participant } from "@/types";
import { Captcha } from "./captcha";
import { Mosaic } from "./mosaic";

const categories = ["All", "Read", "Watch", "Listen", "Explore"];
const icons = {
  Read: BookOpen,
  Watch: Play,
  Listen: Headphones,
  Explore: Compass,
};
export function Experience() {
  const [tiles, setTiles] = useState<MosaicTile[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [count, setCount] = useState(0);
  const [person, setPerson] = useState<Participant | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("Discover");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visiting, setVisiting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState("violet");
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  async function refreshMe() {
    if (!configured()) return;
    const { data } = await browser().auth.getSession();
    if (data.session) {
      const me = await api<{
        participant: Participant | null;
        visited: string[];
      }>("me");
      setPerson(me.participant);
      setVisited(me.visited);
    }
  }
  async function refreshPublic() {
    const data = await api<{
      tiles: MosaicTile[];
      content: ContentItem[];
      count: number;
    }>("public");
    setTiles(data.tiles);
    setContent(data.content);
    setCount(data.count);
  }
  useEffect(() => {
    let active = true;
    Promise.all([refreshPublic(), refreshMe()])
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const timer = setInterval(() => {
      refreshPublic().catch(() => {});
    }, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (!configured())
        throw new Error(
          "The experience is being set up. Please check back soon.",
        );
      if (!person) {
        let session = (await browser().auth.getSession()).data.session;
        if (!session) {
          if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !token)
            throw new Error("Please complete the security check.");
          const result = await browser().auth.signInAnonymously({
            options: { captchaToken: token || undefined },
          });
          if (result.error) throw result.error;
          session = result.data.session;
        }
        if (!session)
          throw new Error("Could not start your session. Please retry.");
        const created = await api<Participant>("join", {
          method: "POST",
          body: JSON.stringify({
            alias: form.get("alias"),
            avatar,
            consent: form.get("consent") === "on",
          }),
        });
        setPerson(created);
      }
      const photo = form.get("photo");
      if (photo instanceof File && photo.size) {
        const upload = new FormData();
        upload.set("photo", photo);
        await api("avatar", { method: "POST", body: upload });
        setMessage(
          "Photo received. Your tile will appear after a moderator approves it.",
        );
      } else
        setMessage(
          "You're in. Pick a discovery and watch your place in the mosaic grow.",
        );
      await Promise.all([refreshMe(), refreshPublic()]);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
      setToken("");
      setCaptchaKey((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  async function visit(item: ContentItem) {
    if (!person) {
      setOpen(true);
      return;
    }
    if (person.status === "hidden") {
      setError("Your tile is currently hidden by a moderator.");
      return;
    }
    const destination = window.open("about:blank", "_blank");
    if (destination) destination.opener = null;
    setVisiting(item.id);
    setError("");
    try {
      const result = await api<{ url: string; discoveries: number }>(
        "visits/" + item.id,
        { method: "POST" },
      );
      if (destination) destination.location.href = result.url;
      else window.location.assign(result.url);
      setPerson({ ...person, discoveries: result.discoveries });
      setVisited((current) => [...new Set([...current, item.id])]);
      setMessage(
        visited.includes(item.id)
          ? "Enjoy another look. Each discovery earns growth once."
          : "A new discovery. A little more room to grow.",
      );
      await refreshPublic();
    } catch (e) {
      destination?.close();
      setError((e as Error).message);
    } finally {
      setVisiting(null);
    }
  }
  async function deleteData() {
    if (
      !window.confirm(
        "Permanently delete your photo, tile, anonymous account and discovery history? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("account", { method: "DELETE" });
      await browser().auth.signOut({ scope: "local" });
      setPerson(null);
      setVisited([]);
      setMessage(
        "Your account, tile, photo and discovery history have been deleted. Previously issued image links expire within five minutes.",
      );
      await refreshPublic();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const level = progress(person?.discoveries ?? 0);
  return (
    <>
      <header className="site-header shell">
        <Link href="/" className="wordmark" aria-label="Ulterior Motive home">
          <span className="brand-mark">
            u<span>m</span>
          </span>
          <span>
            ulterior
            <br />
            motive
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#experience">The experience</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <button className="button dark small" onClick={() => setOpen(true)}>
          {person ? "Your tile" : "Find your place"}
          <ArrowUpRight size={16} />
        </button>
      </header>
      <main>
        <section className="hero shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> A LITTLE CURIOSITY GOES A LONG WAY
            </div>
            <h1>
              Small discoveries.
              <br />
              <span>Bigger</span>
              <br />
              possibilities.
            </h1>
            <p>
              A collection of things worth your attention.
              <br className="desktop-break" /> A community that grows with every
              curious mind.
              <br className="desktop-break" /> And a little space that&apos;s
              entirely yours.
            </p>
            <div className="hero-actions">
              <button
                className="button dark"
                onClick={() =>
                  person
                    ? document
                        .getElementById("experience")
                        ?.scrollIntoView({ behavior: "smooth" })
                    : setOpen(true)
                }
              >
                {person ? "Keep exploring" : "Step into the mosaic"}
                <ArrowUpRight size={19} />
              </button>
              <a className="text-link" href="#how-it-works">
                What&apos;s the idea?
                <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="mini-avatars">
                <i>
                  <Flower size={18} />
                </i>
                <i>
                  <ArrowUpRight size={18} />
                </i>
                <i>
                  <Compass size={18} />
                </i>
              </span>
              <span>
                {count > 0 ? (
                  <>
                    <strong>{count.toLocaleString()} curious minds</strong>
                    <br />
                    and room for one more.
                  </>
                ) : (
                  <>
                    Made for curious minds.
                    <br />
                    <strong>There&apos;s room for you.</strong>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-label">
              <span>DIFFERENT PEOPLE. SHARED CURIOSITY.</span>
              <ArrowUpRight size={14} />
            </div>
            <Mosaic tiles={tiles.slice(0, 8)} preview={tiles.length === 0} />
            <div className="visual-bottom">
              <Sparkles size={17} />
              <span>
                {tiles.length
                  ? "A living mosaic. Find your place."
                  : "A glimpse of what's possible - illustrated preview"}
              </span>
            </div>
            <span className="floating-note">
              Good things
              <br />
              start with a click.
              <ArrowUpRight size={28} />
            </span>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <span>STAY CURIOUS</span>
          <Flower size={20} />
          <span>MAKE CONNECTIONS</span>
          <Flower size={20} />
          <span>FIND YOUR PEOPLE</span>
          <Flower size={20} />
          <span>GROW YOUR WORLD</span>
          <Flower size={20} />
          <span>STAY CURIOUS</span>
        </div>
        <section id="experience" className="experience shell">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE CURIOSITY COLLECTIVE</div>
              <h2>
                More to explore.
                <br />
                More room to grow.
              </h2>
            </div>
            <p>
              Follow something that catches your eye.
              <br />
              Every new discovery grows your tile.
            </p>
          </div>
          <div className="experience-toolbar">
            <div className="tabs" role="tablist" aria-label="Experience view">
              {["Discover", "The mosaic"].map((t) => (
                <button
                  id={"tab-" + t.replaceAll(" ", "-")}
                  role="tab"
                  aria-selected={tab === t}
                  aria-controls="experience-panel"
                  tabIndex={tab === t ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      const next = t === "Discover" ? "The mosaic" : "Discover";
                      setTab(next);
                      document
                        .getElementById("tab-" + next.replaceAll(" ", "-"))
                        ?.focus();
                    }
                  }}
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "The mosaic" && <span>{count}</span>}
                </button>
              ))}
            </div>
            <span className="quiet">
              {tab === "Discover"
                ? content.length + " things to discover"
                : "Every tile has a story"}
            </span>
          </div>
          {message && (
            <div className="notice success" role="status">
              <Check size={17} />
              <span>{message}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {error && !open && (
            <div className="notice error" role="alert">
              {error}
              <button
                onClick={() => {
                  setError("");
                  refreshPublic().catch((e) => setError(e.message));
                }}
              >
                Retry
              </button>
            </div>
          )}
          <div className="experience-layout">
            <div
              id="experience-panel"
              role="tabpanel"
              aria-labelledby={"tab-" + tab.replaceAll(" ", "-")}
            >
              {tab === "Discover" ? (
                <>
                  <div className="filters" aria-label="Content filters">
                    {categories.map((c) => (
                      <button
                        className={category === c ? "active" : ""}
                        aria-pressed={category === c}
                        key={c}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  {loading ? (
                    <p className="empty">Gathering a little inspiration...</p>
                  ) : content.length === 0 ? (
                    <div className="empty">
                      <Compass size={36} />
                      <h3>Something good is on its way.</h3>
                      <p>
                        New discoveries will appear here when the collection
                        opens.
                      </p>
                    </div>
                  ) : (
                    <div className="content-grid">
                      {content
                        .filter(
                          (item) =>
                            category === "All" || item.category === category,
                        )
                        .map((item, index) => {
                          const Icon = icons[item.category];
                          const seen = visited.includes(item.id);
                          return (
                            <article
                              className={"content-card palette-" + (index % 4)}
                              key={item.id}
                            >
                              <div className="card-art" aria-hidden="true">
                                <Icon size={55} strokeWidth={1} />
                                <span className="card-number">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span className="art-circle" />
                              </div>
                              <div className="card-body">
                                <div className="card-meta">
                                  <span>{item.category}</span>
                                  <span>{item.duration_minutes} MIN</span>
                                </div>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                                <button
                                  className="card-action"
                                  disabled={visiting !== null}
                                  onClick={() => visit(item)}
                                >
                                  {visiting === item.id
                                    ? "Opening..."
                                    : seen
                                      ? "Take another look"
                                      : "Follow your curiosity"}
                                  {seen ? (
                                    <Check size={18} />
                                  ) : (
                                    <ArrowUpRight size={19} />
                                  )}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                    </div>
                  )}
                  {content.length > 0 &&
                    !content.some(
                      (c) => category === "All" || c.category === category,
                    ) && (
                      <p className="empty">
                        Nothing in this collection yet. Try another filter.
                      </p>
                    )}
                </>
              ) : tiles.length ? (
                <>
                  <Mosaic tiles={tiles} ownId={person?.id} />
                  <p className="quiet">
                    Showing up to 120 community tiles and 40 editorial photos.
                    Larger tiles reflect more discoveries.
                  </p>
                </>
              ) : (
                <div className="empty">
                  <Sparkles size={38} />
                  <h3>A whole world of possibility.</h3>
                  <p>Be one of the first to make a little space here.</p>
                  <button className="button dark" onClick={() => setOpen(true)}>
                    Add your tile
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
            <aside className="progress-card">
              <span className="eyebrow">
                {person ? "YOUR LITTLE CORNER" : "MAKE IT YOURS"}
              </span>
              {person ? (
                <>
                  <div className={"profile-avatar " + person.avatar}>
                    {person.photo_url ? (
                      <img src={person.photo_url} alt="Your tile" />
                    ) : (
                      person.alias.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <h3>{person.alias}</h3>
                  <span className="level-badge">
                    <Sparkles size={13} />
                    {level.name}
                  </span>
                  <div className="progress-caption">
                    <strong>{person.discoveries} discoveries</strong>
                    <span>
                      {level.next
                        ? level.next.min + " to level up"
                        : "Top level"}
                    </span>
                  </div>
                  <progress
                    value={level.percent}
                    max={100}
                    aria-label="Progress to next level"
                  />
                  <p>
                    {level.next
                      ? level.next.min -
                        person.discoveries +
                        " new discoveries until " +
                        level.next.name +
                        "."
                      : "You've made a big space for curiosity. Keep exploring."}
                  </p>
                  {person.status !== "approved" && (
                    <p className="status-note">
                      {person.status === "pending"
                        ? "Your photo is awaiting approval. Your tile is private until reviewed."
                        : "Your tile is hidden by a moderator."}
                    </p>
                  )}
                  <button
                    className="button outline"
                    onClick={() => setOpen(true)}
                  >
                    <ImagePlus size={16} />
                    Change photo
                  </button>
                  <button
                    className="delete-link"
                    disabled={busy}
                    onClick={deleteData}
                  >
                    <Trash2 size={13} />
                    Delete my data
                  </button>
                </>
              ) : (
                <>
                  <div className="empty-avatar">
                    <Plus size={40} strokeWidth={1} />
                  </div>
                  <h3>
                    A small tile.
                    <br />A bigger story.
                  </h3>
                  <p>
                    Pick an avatar. Follow your curiosity. Watch your place in
                    the mosaic grow.
                  </p>
                  <button className="button dark" onClick={() => setOpen(true)}>
                    Make your mark
                    <ArrowUpRight size={17} />
                  </button>
                  <span className="tiny">No email. No password. Just you.</span>
                </>
              )}
            </aside>
          </div>
        </section>
        <section id="how-it-works" className="how-section">
          <div className="shell">
            <div className="eyebrow">A SIMPLE IDEA, REALLY</div>
            <h2>Curiosity looks good on you.</h2>
            <div className="steps">
              {[
                {
                  n: "01",
                  title: "Make a little space.",
                  text: "Choose a name and an avatar, or add a photo. Your tile is your place in our shared mosaic.",
                  icon: Plus,
                },
                {
                  n: "02",
                  title: "See what's out there.",
                  text: "Read, watch, listen, wander. Discover a collection of ideas with something worth taking away.",
                  icon: Compass,
                },
                {
                  n: "03",
                  title: "Let curiosity grow.",
                  text: "Each new content visit counts once. At 3 and 10 discoveries, your tile takes up a little more room.",
                  icon: Sparkles,
                },
              ].map((step) => (
                <article key={step.n}>
                  <div className="step-top">
                    <span>{step.n}</span>
                    <step.icon size={25} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="closing shell">
          <Flower
            className="closing-flower"
            size={59}
            strokeWidth={1.6}
            aria-hidden="true"
          />
          <h2>
            Your next good idea
            <br />
            is somewhere in here.
          </h2>
          <a href="#experience" className="button dark">
            Let&apos;s find it
            <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer className="site-footer shell">
        <Link href="/" className="footer-brand">
          ulterior motive
        </Link>
        <p>A little curiosity. A lot of possibility.</p>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </footer>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setOpen(false);
        }}
        onClose={() => setOpen(false)}
        aria-labelledby="join-title"
        className="join-dialog"
      >
        <button
          className="close-dialog"
          disabled={busy}
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <span className="eyebrow">YOUR SPACE STARTS HERE</span>
        <h2 id="join-title">
          {person ? "A fresh perspective." : "Hello, curious mind."}
        </h2>
        <p>
          {person
            ? "Upload a new photo for moderation."
            : "No account details needed. Pick a name and make yourself at home."}
        </p>
        <form onSubmit={join}>
          {!person && (
            <>
              <label>
                Display name
                <input
                  name="alias"
                  placeholder="What should we call you?"
                  required
                  minLength={2}
                  maxLength={32}
                  autoComplete="nickname"
                />
              </label>
              <fieldset>
                <legend>Choose your colour</legend>
                <div className="avatar-options">
                  {["violet", "coral", "mint", "gold"].map((a) => (
                    <button
                      type="button"
                      key={a}
                      className={a}
                      aria-label={a}
                      aria-pressed={avatar === a}
                      onClick={() => setAvatar(a)}
                    >
                      {avatar === a ? <Check /> : <Sparkles />}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <label className="upload-label">
            <ImagePlus size={22} />
            <span>
              {person ? "Choose a new photo" : "Or add your photo (optional)"}
              <small>JPG, PNG or WebP - up to 5 MB</small>
            </span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              required={!!person}
            />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="consent" required />
            <span>
              I am 18 or older, have permission to use this image, and agree to
              display my name, avatar and progress publicly under the{" "}
              <Link href="/terms" target="_blank">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank">
                Privacy notice
              </Link>
              .
            </span>
          </label>
          {!person && (
            <>
              <p className="tiny">
                Your anonymous session stays in this browser. Clearing browser
                data loses access to your tile and deletion controls.
              </p>
              <Captcha key={captchaKey} onToken={setToken} />
            </>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button className="button dark full" disabled={busy}>
            {busy
              ? "Making a little space..."
              : person
                ? "Submit photo for approval"
                : "Find my place"}
            <ArrowUpRight size={17} />
          </button>
        </form>
      </dialog>
    </>
  );
}
