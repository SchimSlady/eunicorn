import type { Metadata } from "next";
import { MODE_INFO } from "@/lib/modes";
import { pageMetadata } from "@/lib/seo";
import { UnicornGridGame } from "./UnicornGridGame";

const info = MODE_INFO["unicorn-grid"];

export const metadata: Metadata = pageMetadata("Unicorn Grid · EUnicorn", info.description, "/play/unicorn-grid");

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <UnicornGridGame />
    </main>
  );
}
