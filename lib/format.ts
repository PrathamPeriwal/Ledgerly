const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number, options?: { sign?: boolean }) {
  const formatted = currency.format(amount);
  if (options?.sign && amount > 0) return `+${formatted}`;
  return formatted;
}

export function formatDate(date: Date | string | number) {
  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function formatDateShort(date: Date | string | number) {
  const value = date instanceof Date ? date : new Date(date);
  const sameYear = value.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(value);
}
