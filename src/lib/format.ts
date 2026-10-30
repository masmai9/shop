const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatBaht(n: number | string | null | undefined) {
  return baht.format(Number(n ?? 0));
}

const dt = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function formatDateTime(s: string | Date) {
  return dt.format(new Date(s));
}

/** Normalize Thai phone: keep digits, convert +66/66 prefix to 0. */
export function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("66") && d.length === 11) d = "0" + d.slice(2);
  return d;
}

export function isValidThaiMobile(phone: string) {
  return /^0[689]\d{8}$/.test(phone) || /^0\d{8}$/.test(phone);
}

/**
 * URL-safe ASCII slug. Thai characters are dropped on purpose: Thai URLs turn
 * into long %E0%B8… strings when shared on LINE/Facebook. Callers add a short
 * random suffix so names that are all-Thai still get a unique slug.
 */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}
