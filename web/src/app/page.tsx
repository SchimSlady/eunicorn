import { ModeCards } from "@/components/ModeCards";
import { UpcomingCards } from "@/components/UpcomingCards";
import { Wordmark } from "@/components/Wordmark";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold leading-none sm:text-[32px]">
        <Wordmark />
      </h1>
      <p className="mt-3 text-muted">Daily games about the European startup ecosystem. One try per day.</p>
      <p className="mt-1 font-display font-bold text-primary">Go build in Europe.</p>
      <div className="mt-8">
        <ModeCards />
      </div>
      <div className="mt-4">
        <UpcomingCards />
      </div>
    </main>
  );
}
