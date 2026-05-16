/** Check whether stored coordinates plausibly match the user's text location. */

export function isLabelConsistentWithPlace(
  label: string,
  place: { label: string; country?: string; city?: string },
): boolean {
  const normalizedLabel = label.toLowerCase().trim();
  if (!normalizedLabel) return true;

  const placeText = `${place.label} ${place.country ?? ""} ${place.city ?? ""}`
    .toLowerCase()
    .trim();

  const words = normalizedLabel
    .split(/[\s,]+/)
    .map((w) => w.replace(/[^a-z0-9\u00c0-\u024f-]/gi, ""))
    .filter((w) => w.length >= 4);

  if (words.length === 0) return true;

  return words.some((word) => placeText.includes(word));
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * r * Math.asin(Math.sqrt(a)));
}
