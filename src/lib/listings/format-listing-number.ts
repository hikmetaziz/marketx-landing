export function formatListingNumber(num: number | bigint): string {
  return String(Number(num));
}

export function formatListingNumberLabel(num: number | bigint): string {
  return `Elan № ${formatListingNumber(num)}`;
}
