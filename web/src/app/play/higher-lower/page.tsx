import type { Metadata } from "next";
import { MODE_INFO } from "@/lib/modes";
import { pageMetadata } from "@/lib/seo";
import { HigherLowerGame } from "./HigherLowerGame";

const info = MODE_INFO["higher-lower"];

export const metadata: Metadata = pageMetadata("Higher or Lower · EUnicorn", info.description, "/play/higher-lower");

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 md:max-w-3xl">
      <HigherLowerGame />
    </main>
  );
}
