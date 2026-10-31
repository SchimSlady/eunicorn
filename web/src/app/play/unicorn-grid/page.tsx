import type { Metadata } from "next";
import { UnicornGridGame } from "./UnicornGridGame";

export const metadata: Metadata = { title: "Unicorn Grid · EUnicorn" };

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <UnicornGridGame />
    </main>
  );
}
