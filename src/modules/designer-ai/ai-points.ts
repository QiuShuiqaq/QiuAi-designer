export type DesignerAiImageSize = '1K' | '2K' | '4K';

export type DesignerAiImagePointTier = {
  size: DesignerAiImageSize | string;
  label: string;
  aiPoints: number;
  amountCny?: number;
};

export type DesignerAiBillingProfile = {
  pricingPlan?: string;
  currency?: string;
  pointsPerCny?: number;
  imagePointTiers?: DesignerAiImagePointTier[];
};

function normalizeNumber(value?: number) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function resolveDesignerAiImageSize(input: { width?: number; height?: number }) {
  const width = Math.max(1, normalizeNumber(input.width) || 1);
  const height = Math.max(1, normalizeNumber(input.height) || 1);
  const maxSide = Math.max(width, height);

  if (maxSide >= 2048) {
    return '4K' as const;
  }

  if (maxSide >= 1024) {
    return '2K' as const;
  }

  return '1K' as const;
}

export function resolveDesignerAiPointTierFromProfile(
  input: { width?: number; height?: number },
  billingProfile?: DesignerAiBillingProfile | null
) {
  const imageSize = resolveDesignerAiImageSize(input);
  return billingProfile?.imagePointTiers?.find((tier) => tier.size === imageSize) || null;
}

export function formatDesignerAiPointNumber(value?: number) {
  const numericValue = normalizeNumber(value);
  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }

  return numericValue.toFixed(2).replace(/\.?0+$/, '');
}

export function formatDesignerAiPoints(value?: number) {
  return `${formatDesignerAiPointNumber(value)} AI点`;
}

export function convertDesignerAiCnyToPoints(value?: number, pointsPerCny?: number) {
  const rate = Number(pointsPerCny || 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }

  return normalizeNumber(value) * rate;
}

export function formatDesignerAiBalancePoints(value?: number, pointsPerCny?: number) {
  const points = convertDesignerAiCnyToPoints(value, pointsPerCny);
  return points === null ? '以服务端结算为准' : formatDesignerAiPoints(points);
}

export function formatDesignerAiCostBadge(points?: number) {
  return Number.isFinite(Number(points))
    ? `AI ${formatDesignerAiPointNumber(points)}点`
    : 'AI 服务端结算';
}
