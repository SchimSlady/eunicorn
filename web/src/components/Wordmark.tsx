/** The EUnicorn mascot next to the name, "EU" in the primary color. Size follows the font size. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.25em] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/unicorn.png" alt="" className="h-[1.6em] w-[1.6em] shrink-0" />
      <span>
        <span className="text-primary">EU</span>nicorn
      </span>
    </span>
  );
}
