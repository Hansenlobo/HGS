/** Explicit locale everywhere a date is rendered from server-fetched data —
 * `toLocaleDateString()`/`toLocaleString()` without a locale argument use
 * the runtime's default locale, which can differ between the Node SSR
 * process and the browser and causes React hydration mismatches. */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-IN");
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-IN");
}
