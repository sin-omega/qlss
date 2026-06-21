/**
 * Geolocation formatting helpers.
 *
 * Vercel injects `x-vercel-ip-country` (ISO 3166-1 alpha-2 code, e.g. "PL")
 * and `x-vercel-ip-country-region` (ISO 3166-2 region code, e.g. "MZ").
 * We store the raw codes in the `analytics` table and convert them to
 * human-readable names at display time using `Intl.DisplayNames`.
 *
 * Output format: lowercase "mazowieckie, poland" — region first, then
 * country, joined by ", ". If only country is known: "poland".
 *
 * Note: the `subdivision` type for Intl.DisplayNames is supported in
 * Node 14+ and all modern browsers, but we feature-detect it at runtime
 * in case the build/runtime doesn't support it yet (older Node versions,
 * certain edge runtimes). If unsupported, we fall back to just the
 * country name.
 */

let countryNamesInstance: Intl.DisplayNames | null = null;
let subdivisionNamesInstance: Intl.DisplayNames | null = null;
let subdivisionSupported = true;

function getCountryNames(): Intl.DisplayNames | null {
  if (!countryNamesInstance) {
    try {
      countryNamesInstance = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      countryNamesInstance = null;
    }
  }
  return countryNamesInstance;
}

function getSubdivisionNames(): Intl.DisplayNames | null {
  if (!subdivisionSupported) return null;
  if (!subdivisionNamesInstance) {
    try {
      // `subdivision` type is supported in Node 14+ but not in TS's
      // lib.dom typings yet — cast through a literal to satisfy TS.
      subdivisionNamesInstance = new Intl.DisplayNames(["en"], {
        type: "subdivision" as "region",
      });
    } catch {
      subdivisionNamesInstance = null;
      subdivisionSupported = false;
    }
  }
  return subdivisionNamesInstance;
}

/**
 * Convert ISO country code (e.g. "PL") to lowercase country name ("poland").
 * Returns null if the code is missing or unrecognized.
 */
export function formatCountryName(countryCode: string | null): string | null {
  if (!countryCode) return null;
  try {
    const names = getCountryNames();
    if (!names) return null;
    const name = names.of(countryCode);
    return name ? name.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Convert ISO country + region codes (e.g. "PL" + "MZ") to lowercase
 * region name ("mazowieckie"). Returns null if either code is missing
 * or unrecognized, or if the runtime doesn't support the `subdivision`
 * type for Intl.DisplayNames.
 */
export function formatRegionName(
  countryCode: string | null,
  regionCode: string | null,
): string | null {
  if (!countryCode || !regionCode) return null;
  try {
    const names = getSubdivisionNames();
    if (!names) return null;
    // Intl.DisplayNames with type 'subdivision' expects the full
    // ISO 3166-2 code like "PL-MZ" (country-region).
    const name = names.of(`${countryCode}-${regionCode}`);
    return name ? name.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Format a full location string: "region, country" (lowercase).
 * Falls back to just "country" if region is unknown or unsupported.
 * Returns null if both are missing.
 */
export function formatLocation(
  countryCode: string | null,
  regionCode: string | null,
): string | null {
  const country = formatCountryName(countryCode);
  const region = formatRegionName(countryCode, regionCode);
  const parts = [region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Format a full location including city: "city, region, country" (lowercase).
 * Falls back gracefully if region or city is missing.
 */
export function formatLocationWithCity(
  city: string | null,
  countryCode: string | null,
  regionCode: string | null,
): string | null {
  const country = formatCountryName(countryCode);
  const region = formatRegionName(countryCode, regionCode);
  const parts = [city?.toLowerCase(), region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
