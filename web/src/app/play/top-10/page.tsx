import type { Metadata } from "next";
import { MODE_INFO } from "@/lib/modes";
import { pageMetadata } from "@/lib/seo";
import { Top10Game } from "./Top10Game";

const info = MODE_INFO["top-10"];

export const metadata: Metadata = pageMetadata("Top 10 · EUnicorn", info.description, "/play/top-10");

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-3">
      <Top10Game />
    </main>
  );
}
