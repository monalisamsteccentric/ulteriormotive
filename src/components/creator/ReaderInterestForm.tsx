"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";

const genres = ["Psychological Mystery", "Thriller", "Romance", "Mystery", "All of the Above"];

export function ReaderInterestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [genreInterest, setGenreInterest] = useState("Psychological Mystery");
  const [wantsArc, setWantsArc] = useState(true);
  const [wantsUpdates, setWantsUpdates] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("loading");

    const { error: insertError } = await supabaseClient().from("reader_interest").insert({
      name: name.trim() || null,
      email: email.trim() || null,
      genre_interest: genreInterest,
      wants_arc: wantsArc,
      wants_updates: wantsUpdates,
      message: message.trim() || null
    });

    if (insertError) {
      setError(insertError.message);
      setStatus("idle");
      return;
    }

    setName("");
    setEmail("");
    setGenreInterest("Psychological Mystery");
    setWantsArc(true);
    setWantsUpdates(true);
    setMessage("");
    setStatus("success");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-ink p-5 shadow-glow">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
      </div>
      <ChoiceGroup label="Which interests you most?" value={genreInterest} options={genres} onChange={setGenreInterest} />
      <ChoiceGroup label="Would you like an advance reader copy?" value={wantsArc ? "Yes" : "No"} options={["Yes", "No"]} onChange={(value) => setWantsArc(value === "Yes")} />
      <ChoiceGroup label="Would you like updates about future books?" value={wantsUpdates ? "Yes" : "No"} options={["Yes", "No"]} onChange={(value) => setWantsUpdates(value === "Yes")} />
      <label className="block">
        <span className="text-sm font-black uppercase text-mist sm:text-xs">Optional message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-28 w-full resize-none rounded-lg border border-line bg-panel px-4 py-3 text-base font-bold leading-7 text-white outline-none focus:border-neon sm:text-sm sm:leading-6"
        />
      </label>
      {error ? <p className="text-sm font-bold text-shock">{error}</p> : null}
      {status === "success" ? <p className="text-sm font-bold text-neon">Thank you. You're now on the reader list.</p> : null}
      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Joining..." : "Join Reader List"}
      </Button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-black uppercase text-mist sm:text-xs">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-panel px-4 py-3 text-base font-bold text-white outline-none focus:border-neon sm:text-sm"
      />
    </label>
  );
}

function ChoiceGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-black uppercase text-mist sm:text-xs">{label}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-12 rounded-lg border px-3 text-sm font-black transition ${
              value === option ? "border-shock bg-shock/25 text-white shadow-glow" : "border-line bg-panel text-mist hover:border-white/45"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}
