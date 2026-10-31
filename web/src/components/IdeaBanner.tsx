"use client";

import { useState } from "react";
import { Check, Lightbulb, Send } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * "Got an idea for a game?" as one slim banner under the coming-soon games: a single field and
 * a button. /api/idea emails it to us; the player never leaves the page or opens a mail app.
 */
export function IdeaBanner() {
  const [idea, setIdea] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, website }),
    }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      return;
    }
    const msg = ((await res?.json().catch(() => null)) as { error?: string } | null)?.error;
    setError(msg ?? "Couldn't send it.");
    setState("error");
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="idea-title">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-start gap-3 md:w-72 md:shrink-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Lightbulb size={20} aria-hidden />
          </span>
          <div>
            <h2 id="idea-title" className="font-display text-lg font-bold leading-tight">
              Got an idea for a game?
            </h2>
            <p className="text-sm text-muted">Tell us. We read every one.</p>
          </div>
        </div>

        {state === "sent" ? (
          <p className="flex flex-1 items-center gap-2 font-semibold text-correct" role="status">
            <Check size={18} aria-hidden /> Thanks! Your idea is on its way to us.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-1 flex-col gap-2 sm:flex-row">
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
              className="min-h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              name="website"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <button
              type="submit"
              disabled={state === "sending" || idea.trim().length < 10}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition disabled:opacity-40"
            >
              <Send size={16} aria-hidden /> {state === "sending" ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
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
