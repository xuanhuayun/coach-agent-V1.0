export function formatSgdAmount(dollars: number) {
  return `S$${Math.round(dollars)}`;
}

export function formatSgdFromCents(cents: number) {
  return formatSgdAmount(cents / 100);
}

export function parseSgdInput(raw: string) {
  const value = raw.trim().replace(/^S\$\s*/i, "").replace(/,/g, "");
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
