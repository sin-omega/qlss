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

export function formatRegionName(
  countryCode: string | null,
  regionCode: string | null,
): string | null {
  if (!countryCode || !regionCode) return null;
  try {
    const names = getSubdivisionNames();
    if (!names) return null;
    const name = names.of(`${countryCode}-${regionCode}`);
    return name ? name.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function formatLocation(
  countryCode: string | null,
  regionCode: string | null,
): string | null {
  const country = formatCountryName(countryCode);
  const region = formatRegionName(countryCode, regionCode);
  const parts = [region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
