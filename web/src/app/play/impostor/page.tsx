import type { Metadata } from "next";
import { MODE_INFO } from "@/lib/modes";
import { pageMetadata } from "@/lib/seo";
import { ImpostorGame } from "./ImpostorGame";

const info = MODE_INFO["impostor"];

export const metadata: Metadata = pageMetadata("Impostor · EUnicorn", info.description, "/play/impostor");

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <ImpostorGame />
    </main>
  );
}
