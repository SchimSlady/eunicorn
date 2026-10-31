/**
 * The EUnicorn mascot next to the name, "EU" in the primary color. The mascot is exactly as tall
 * as the capitals (Space Grotesk cap height = 0.7em) and sits on the text baseline, so its bottom
 * lines up with the bottom of "EU". The PNG is trimmed to its visible pixels for this.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.22em] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/unicorn.png" alt="" width={481} height={428} className="h-[0.7em] w-auto shrink-0" />
      <span>
        <span className="text-primary">EU</span>nicorn
      </span>
    </span>
  );
}
