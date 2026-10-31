import type { Metadata } from "next";
import { ImpostorGame } from "./ImpostorGame";

export const metadata: Metadata = { title: "Impostor · EUnicorn" };

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <ImpostorGame />
    </main>
  );
}
