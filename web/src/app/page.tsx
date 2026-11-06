import { HomeTabs } from "@/components/HomeTabs";
import { IdeaBanner } from "@/components/IdeaBanner";
import { ModeCards } from "@/components/ModeCards";
import { UpcomingCards } from "@/components/UpcomingCards";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <HomeTabs active="daily" />
      <h1 className="mt-6 text-2xl font-bold leading-tight sm:text-[32px]">Daily games about the European startup ecosystem</h1>
      <div className="mt-8">
        <ModeCards />
      </div>
      <h2 className="mt-12 text-lg font-bold">Coming soon</h2>
      <div className="mt-4">
        <UpcomingCards />
      </div>
      <div className="mt-6">
        <IdeaBanner />
      </div>
    </main>
  );
}
