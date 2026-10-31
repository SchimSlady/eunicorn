import type { Metadata } from "next";
import { WhoRaisedThisGame } from "./WhoRaisedThisGame";

export const metadata: Metadata = { title: "Who Raised This? · EUnicorn" };

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <WhoRaisedThisGame />
    </main>
  );
}
