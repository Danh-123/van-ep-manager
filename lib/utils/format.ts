export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;

  return safeValue.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatWeight(kg: number | string | null | undefined): string {
  const parsed = Number(kg);
  const safeKg = Number.isFinite(parsed) ? parsed : 0;
  const tons = safeKg / 1000;

  return formatNumber(tons, 2);
}
