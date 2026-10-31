/**
 * Round country flag (circle-flags, SVG). Emoji flags render as letters on Windows,
 * so the UI uses these; the share text leaves flags out entirely.
 */
export function Flag({ country, size = 16 }: { country: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/HatScripts/circle-flags@2.7.0/flags/${country.toLowerCase()}.svg`}
      alt={country}
      width={size}
      height={size}
      className="inline-block shrink-0 align-[-0.15em]"
      loading="lazy"
    />
  );
}
