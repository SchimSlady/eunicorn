/**
 * Round country flag (circle-flags, MIT, SVG), served from our own domain (copied in by
 * scripts/sync-data.mjs). Emoji flags render as letters on Windows, so the UI uses these;
 * the share text leaves flags out entirely.
 */
export function Flag({ country, size = 16 }: { country: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${country.toLowerCase()}.svg`}
      alt={country}
      width={size}
      height={size}
      className="inline-block shrink-0 align-[-0.15em]"
      loading="lazy"
    />
  );
}
