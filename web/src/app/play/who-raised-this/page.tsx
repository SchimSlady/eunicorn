import type { Metadata } from "next";
import { MODE_INFO } from "@/lib/modes";
import { pageMetadata } from "@/lib/seo";
import { WhoRaisedThisGame } from "./WhoRaisedThisGame";

const info = MODE_INFO["who-raised-this"];

export const metadata: Metadata = pageMetadata("Who Raised This? · EUnicorn", info.description, "/play/who-raised-this");

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <WhoRaisedThisGame />
    </main>
  );
}
