import type { Metadata } from "next";
import { HigherLowerGame } from "./HigherLowerGame";

export const metadata: Metadata = { title: "Higher or Lower · EUnicorn" };

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 md:max-w-3xl">
      <HigherLowerGame />
    </main>
  );
}
