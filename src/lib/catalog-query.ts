export function catalogPage(value: string | undefined) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
}
export function catalogPrice(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 2147483647 ? n : undefined;
}
export function paginationWindow(current: number, pages: number) {
  return [...new Set([1, current - 2, current - 1, current, current + 1, current + 2, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
}
