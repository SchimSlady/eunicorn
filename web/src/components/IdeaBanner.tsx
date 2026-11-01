"use client";

import { useState } from "react";
import { Building2, Check, Lightbulb, Send } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/legal";

type Kind = "idea" | "startup";

const COPY: Record<Kind, { title: string; label: string; thanks: string }> = {
  idea: { title: "Got an idea for a game?", label: "Game idea", thanks: "Thanks! Your idea is on its way to us." },
  startup: { title: "Is your startup missing?", label: "Request a startup", thanks: "Thanks! We'll check it and add it if it qualifies." },
};

const field = "min-h-11 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary";

/**
 * One slim banner under the coming-soon games for what players want to tell us: a game idea, or a
 * startup they'd like to see in the games. /api/idea emails it to us; nobody leaves the page or opens a
 * mail app.
 */
export function IdeaBanner() {
  const [kind, setKind] = useState<Kind>("idea");
  const [idea, setIdea] = useState("");
  const [startup, setStartup] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  function choose(next: Kind) {
    setKind(next);
    setState("idle");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const body = kind === "idea" ? { kind, idea, website } : { kind, startup, startupUrl: url, email, website };
    const res = await fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const msg = ((await res?.json().catch(() => null)) as { error?: string } | null)?.error;
    setError(msg ?? "Couldn't send it.");
    setState("error");
  }

  const Icon = kind === "idea" ? Lightbulb : Building2;
  const send = (
    <button
      type="submit"
      disabled={state === "sending" || (kind === "idea" ? idea.trim().length < 10 : startup.trim().length < 2 || !url.trim())}
      className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition disabled:opacity-40"
    >
      <Send size={16} aria-hidden /> {state === "sending" ? "Sending…" : "Send"}
    </button>
  );
  const trap = (
    <input
      tabIndex={-1}
      autoComplete="off"
      aria-hidden
      value={website}
      onChange={(e) => setWebsite(e.target.value)}
      name="website"
      className="absolute -left-[9999px] h-0 w-0 opacity-0"
    />
  );

  return (
    <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="idea-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon size={20} aria-hidden />
          </span>
          <h2 id="idea-title" className="font-display text-lg font-bold leading-tight">
            {COPY[kind].title}
          </h2>
        </div>
        <div role="radiogroup" aria-label="What do you want to send us?" className="flex gap-2">
          {(["idea", "startup"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => choose(k)}
              className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition ${
                kind === k ? "border-foreground bg-background text-foreground" : "border-border text-muted hover:border-muted hover:text-foreground"
              }`}
            >
              {COPY[k].label}
            </button>
          ))}
        </div>
      </div>

      {state === "sent" ? (
        <p className="mt-4 flex items-center gap-2 font-semibold text-correct" role="status">
          <Check size={18} aria-hidden /> {COPY[kind].thanks}
        </p>
      ) : kind === "idea" ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="idea" className="sr-only">
            Your game idea
          </label>
          <input
            id="idea"
            required
            minLength={10}
            maxLength={2000}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. guess the founder from their first startup"
            className={`${field} flex-1`}
          />
          {trap}
          {send}
        </form>
      ) : (
        <>
          <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              required
              minLength={2}
              maxLength={80}
              value={startup}
              onChange={(e) => setStartup(e.target.value)}
              placeholder="Startup name"
              aria-label="Startup name"
              className={field}
            />
            <input
              required
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={200}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Website, e.g. acme.com"
              aria-label="Startup website"
              className={field}
            />
            <input
              type="email"
              autoComplete="email"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (optional)"
              aria-label="Your email, optional"
              className={`${field} sm:col-span-2 lg:col-span-1`}
            />
            {trap}
            {send}
          </form>
          <p className="mt-2 text-sm text-muted">We add European startups with a public funding round. Leave an email and we&apos;ll tell you when it&apos;s in.</p>
        </>
      )}

      {state === "error" && (
        <p className="mt-3 text-sm text-wrong" role="alert">
          {error} You can also write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      )}
    </section>
  );
}
