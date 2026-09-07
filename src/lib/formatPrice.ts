export const formatPrice = (
  price: number | null | undefined,
  currency: string | null | undefined
): string | null => {
  if (price === null || price === undefined || isNaN(Number(price))) return null;
  const amount = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(Number(price));
  const code = (currency || "").trim().toUpperCase();
  if (!code || code === "NOK" || code === "SEK" || code === "DKK") return `${amount}:-`;
  if (code === "EUR") return `€ ${amount}`;
  if (code === "USD") return `$ ${amount}`;
  if (code === "GBP") return `£ ${amount}`;
  return `${code} ${amount}`;
};
