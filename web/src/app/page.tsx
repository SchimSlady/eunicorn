import { ModeCards } from "@/components/ModeCards";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold leading-none sm:text-[32px]">
        <span className="text-primary">EU</span>nicorn
      </h1>
      <p className="mt-3 text-muted">Daily games about the European startup ecosystem. One try per day.</p>
      <p className="mt-1 font-display font-bold text-primary">Go build in Europe.</p>
      <div className="mt-8">
        <ModeCards />
      </div>
      <section className="mt-4 rounded-2xl border-2 border-dashed border-border p-5">
        <h2 className="text-lg font-bold">More games coming soon</h2>
        <p className="mt-1 text-sm text-muted">Connections, Mafia Link, Top 10 and Pin the HQ are in the works.</p>
      </section>
    </main>
  );
}
