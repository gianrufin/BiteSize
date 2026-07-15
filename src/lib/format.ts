export function formatCents(cents: number, currency = "PHP"): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function getCurrencySymbol(currency = "PHP"): string {
  const part = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
  })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}
