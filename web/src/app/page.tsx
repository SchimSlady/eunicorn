import { ModeCards } from "@/components/ModeCards";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-5xl font-bold">
        <span className="text-primary">EU</span>nicorn
      </h1>
      <p className="mt-3 text-muted">Daily games about the European startup ecosystem. One try per day.</p>
      <p className="mt-1 font-display font-bold text-primary">Go build in Europe.</p>
      <div className="mt-8">
        <ModeCards />
      </div>
    </main>
  );
}
