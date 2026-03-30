const CM_TO_INCH = 0.393701;

const toInch = (cm: number) => +(cm * CM_TO_INCH).toFixed(2);

/**
 * Format dimensions in cm with inches in brackets.
 * e.g. "100 × 80 × 4 cm (39.37 × 31.5 × 1.57 in)"
 */
export const formatDimensions = (
  h: number | null,
  w: number | null,
  d: number | null
): string | null => {
  const parts = [h, w, d].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  const cmStr = parts.join(" × ") + " cm";
  const inStr = parts.map(toInch).join(" × ") + " in";
  return `${cmStr} (${inStr})`;
};
