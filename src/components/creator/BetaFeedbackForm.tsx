"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";

const userTypes = ["Player", "Audience", "Both"];
const ratings = [1, 2, 3, 4, 5];

export function BetaFeedbackForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("Player");
  const [issue, setIssue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [contactForTesting, setContactForTesting] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("loading");

    const { error: insertError } = await supabaseClient().from("beta_feedback").insert({
      name: name.trim() || null,
      email: email.trim() || null,
      user_type: userType,
      issue: issue.trim() || null,
      feedback: feedback.trim() || null,
      rating,
      contact_for_testing: contactForTesting
    });

    if (insertError) {
      setError(insertError.message);
      setStatus("idle");
      return;
    }

    setName("");
    setEmail("");
    setUserType("Player");
    setIssue("");
    setFeedback("");
    setRating(5);
    setContactForTesting(true);
    setStatus("success");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-ink p-5 shadow-glow">
      <div>
        <p className="text-sm font-black uppercase text-neon">Beta feedback</p>
        <h2 className="mt-1 text-2xl font-black text-white">Help improve the game</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
      </div>
      <ChoiceGroup label="Are you?" value={userType} options={userTypes} onChange={setUserType} />
      <Field label="What issue did you face?" value={issue} onChange={setIssue} />
      <Textarea label="Feedback / Suggestion" value={feedback} onChange={setFeedback} />
      <ChoiceGroup label="Rating" value={String(rating)} options={ratings.map(String)} onChange={(value) => setRating(Number(value))} />
      <ChoiceGroup
        label="Contact me for future testing?"
        value={contactForTesting ? "Yes" : "No"}
        options={["Yes", "No"]}
        onChange={(value) => setContactForTesting(value === "Yes")}
      />
      {error ? <p className="text-sm font-bold text-shock">{error}</p> : null}
      {status === "success" ? <p className="text-sm font-bold text-neon">Thank you for helping improve Ulterior Motive.</p> : null}
      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Submitting..." : "Submit Feedback"}
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

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-black uppercase text-mist sm:text-xs">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-32 w-full resize-none rounded-lg border border-line bg-panel px-4 py-3 text-base font-bold leading-7 text-white outline-none focus:border-neon sm:text-sm sm:leading-6"
      />
    </label>
  );
}

function ChoiceGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-black uppercase text-mist sm:text-xs">{label}</h3>
      <div className="grid gap-2 sm:grid-cols-3">
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
